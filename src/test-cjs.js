const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sendgrid = require('@sendgrid/mail');
const { EthStorage, FlatDirectory, UploadType } = require('ethstorage-sdk');
const { NodeFile } = require("ethstorage-sdk/file");

const dotenv = require("dotenv")
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
const smallFile = path.join(__dirname, '../assets/small.jpeg');
const name = smallFile.substring(smallFile.lastIndexOf("/") + 1);
const bigFile = path.join(__dirname, '../assets/big.jpg');

async function EthStorageTest() {
    const es = await EthStorage.create({
        rpc: 'https://rpc.beta.testnet.l2.quarkchain.io:8545',
        ethStorageRpc: 'https://rpc.beta.testnet.l2.ethstorage.io:9596',
        privateKey
    });

    // single file
    const content = fs.readFileSync(smallFile);
    const cost = await es.estimateCost(name, content);
    console.log("cost:", cost);
    let result = await es.write(name, content);
    if (!result.success) {
        throw new Error("Failed to write blob.");
    }
    let buff = await es.read(name);
    if (Buffer.from(content).equals(Buffer.from(buff))) {
        console.log("Read data matches written data ✅");
    } else {
        throw new Error("Read data does not match written data ❌");
    }

    // Write blobs
    const keys = ["key1", "key2"];
    const blobData = [Buffer.from("some data1"), Buffer.from("some data2")];
    result = await es.writeBlobs(keys, blobData);
    if (!result.success) {
        throw new Error("Failed to write blobs.");
    }
    // Read blob data
    buff = await es.read('key2');
    if (Buffer.from(blobData[1]).equals(Buffer.from(buff))) {
        console.log(`Data for keys matches ✅`);
    } else {
        console.log(`Data for keys does not match ❌`);
    }
}

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

async function SepoliaTest() {
    const es = await EthStorage.create({
        rpc: 'http://88.99.30.186:8545/',
        ethStorageRpc: 'http://65.108.236.27:9540',
        privateKey
    });

    const content = crypto.randomBytes(64);
    const cost = await es.estimateCost(name, content);
    console.log("cost:", cost);
    let result = await es.write("test.txt", content);
    if (!result.success) {
        throw new Error("Failed to write blob.");
    }
    let buff = await es.read("test.txt");
    if (Buffer.from(content).equals(Buffer.from(buff))) {
        console.log("Read data matches written data ✅");
    } else {
        throw new Error("Read data does not match written data ❌");
    }
}

async function runTests() {
    try {
        console.log("\nRunning EthStorage test...\n");
        await EthStorageTest();

        console.log("\nRunning FlatDirectory test...\n");
        await FlatDirectoryTest();

        console.log("\nRunning Sepolia test...\n");
        await SepoliaTest();

        console.log("✅ All tests passed successfully!");
    } catch (error) {
        console.error("❌ Error during tests:", error);
        await sendNotification("Test Failure", `Error during test execution: ${error.message}`);
    }
}

runTests();
