const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EthStorage, FlatDirectory, UploadType } = require('ethstorage-sdk');
const { NodeFile } = require("ethstorage-sdk/file");
const { flatDirectoryTest } = require("./test-utils");

const dotenv = require("dotenv")
dotenv.config({ path: '../.env' });

const sendgrid = require('@sendgrid/mail');
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


const privateKey = process.env.PRIVATE_KEY;


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

async function fileResolver(filename) {
    return new NodeFile(path.join(__dirname, `../assets/${filename}`));
}

async function runTests() {
    try {
        console.log("Running EthStorage test...");
        await EthStorageTest();

        console.log()
        console.log()
        console.log()
        console.log("Running FlatDirectory test...");
        await flatDirectoryTest(FlatDirectory, UploadType, privateKey, fileResolver);

        console.log()
        console.log()
        console.log()
        console.log("Running Sepolia test...");
        await SepoliaTest();

        console.log("✅ All tests passed successfully!");
    } catch (error) {
        console.error("❌ Error during tests:", error);
        await sendNotification("RPC Test Failure", `Error is:\n ${error.message}`);
    }
}

runTests();
