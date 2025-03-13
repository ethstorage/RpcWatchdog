import { FlatDirectory, UploadType } from 'ethstorage-sdk';
import { NodeFile } from 'ethstorage-sdk/file';
import sendgrid from '@sendgrid/mail';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config({ path: '../.env' });

const privateKey = process.env.PRIVATE_KEY;
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

// Send email notification
async function sendNotification(subject, message) {
    const msg = {
        to: process.env.QKC_EMAILLIST.split(','),
        from: 'QuarkChainMining@quarkchain.org',
        subject: subject,
        text: message
    };
    await sendgrid.send(msg);
}

// File path for testing
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const smallFile = path.join(__dirname, '../assets/small.jpeg');
const bigFile = path.join(__dirname, '../assets/big.jpg');

async function FlatDirectoryTest() {
    const uploadCallback = {
        onProgress: (progress, count, isChange) => {
            console.log(`progress:${progress}, count:${count}, isChange:${isChange}`);
        },
        onFail: (err) => {
            throw new Error(`Upload failed: ${err.message}`);
        },
        onFinish: (totalUploadChunks, totalUploadSize, totalStorageCost) => {
            console.log(`totalUploadChunks:${totalUploadChunks}, totalUploadSize:${totalUploadSize}, totalStorageCost:${totalStorageCost}`);
        }
    };

    const fd = await FlatDirectory.create({
        rpc: 'https://rpc.beta.testnet.l2.quarkchain.io:8545',
        ethStorageRpc: 'https://rpc.beta.testnet.l2.ethstorage.io:9596',
        privateKey,
    });
    await fd.deploy();

    // Test calldata upload and download
    let request = {
        type: UploadType.Calldata,
        key: "data.txt",
        content: Buffer.from("1234567890"),
        gasIncPct: 1,
        callback: uploadCallback
    };
    let cost = await fd.estimateCost(request);
    console.log(cost);
    await fd.upload(request);
    cost = await fd.estimateCost(request);
    console.log(cost);

    // Test file upload
    let file = new NodeFile(smallFile);
    request = {
        type: UploadType.Calldata,
        key: "file.jpg",
        content: file,
        gasIncPct: 2,
        callback: uploadCallback
    };
    cost = await fd.estimateCost(request);
    console.log(cost);
    await fd.upload(request);
    cost = await fd.estimateCost(request);
    console.log(cost);

    // Test blob upload
    request = {
        type: UploadType.Blob,
        key: "blobData.txt",
        content: Buffer.from("12345678"),
        gasIncPct: 5,
        callback: uploadCallback
    };
    cost = await fd.estimateCost(request);
    console.log(cost);
    await fd.upload(request);
    cost = await fd.estimateCost(request);
    console.log(cost);

    // File blob upload
    file = new NodeFile(bigFile);
    request = {
        type: UploadType.Blob,
        key: "blobFile.jpg",
        content: file,
        gasIncPct: 5,
        chunkHashes: [],
        callback: uploadCallback
    };
    cost = await fd.estimateCost(request);
    console.log(cost);
    await fd.upload(request);
    cost = await fd.estimateCost(request);
    console.log(cost);

    // Download test
    await fd.download("data.txt", {
        onProgress: (progress, count, data) => {
            console.log(progress, count, Buffer.from(data).toString());
            if (!Buffer.from(data).equals(Buffer.from("1234567890"))) {
                throw new Error("Downloaded data does not match the original data.");
            }
        },
        onFail: (err) => {
            throw new Error(`Upload failed: ${err.message}`);
        },
        onFinish: () => {
            console.log('download finish');
        }
    });
    await fd.download("blobFile.jpg", {
        onProgress: (progress, count, data) => {
            console.log(progress, count, data.length);
        },
        onFail: (err) => {
            throw new Error(`Upload failed: ${err.message}`);
        },
        onFinish: () => {
            console.log('download finish');
        }
    });

    const hashes2 = await fd.fetchHashes(["file.jpg", "blobFile.jpg"]);
    console.log(hashes2);
}

async function runTests() {
    try {
        console.log("\nRunning FlatDirectory test...\n");
        await FlatDirectoryTest();

        console.log("✅ All tests passed successfully!");
    } catch (error) {
        console.error("❌ Error during tests:", error);
        await sendNotification("Test Failure", `Error during test execution: ${error.message}`);
    }
}

runTests();
