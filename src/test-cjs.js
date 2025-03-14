const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EthStorage, FlatDirectory, UploadType } = require('ethstorage-sdk');
const { NodeFile } = require("ethstorage-sdk/file");
const { flatDirectoryTest } = require("./utils/utils");

const dotenv = require("dotenv");
dotenv.config({ path: '../.env' });
const privateKey = process.env.PRIVATE_KEY;

const sendgrid = require('@sendgrid/mail');
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

function logInfo(message) {
    console.log(`ℹ️ [INFO] ${message}`);
}

function logError(message) {
    console.error(`❌ [ERROR] ${message}`);
}

async function sendNotification(subject, message) {
    logInfo("Sending email notification...");
    const msg = {
        to: process.env.QKC_EMAILLIST.split(','),
        from: 'QuarkChainMining@quarkchain.org',
        subject: subject,
        text: message
    };
    await sendgrid.send(msg);
    logInfo("Email notification sent.");
}

const smallFile = path.join(__dirname, '../assets/small.jpeg');
const name = smallFile.substring(smallFile.lastIndexOf("/") + 1);

async function SepoliaTest() {
    const es = await EthStorage.create({
        rpc: 'http://88.99.30.186:8545/',
        ethStorageRpc: 'http://65.108.236.27:9540',
        privateKey
    });

    const content = crypto.randomBytes(64);
    const cost = await es.estimateCost(name, content);
    logInfo(`Cost: ${cost}`);
    let result = await es.write("test.txt", content);
    if (!result.success) {
        throw new Error("Failed to write blob.");
    }
    let buff = await es.read("test.txt");
    if (Buffer.from(content).equals(Buffer.from(buff))) {
        logInfo("Read data matches written data ✅");
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

    const content = fs.readFileSync(smallFile);
    const cost = await es.estimateCost(name, content);
    logInfo(`Cost: ${cost}`);
    let result = await es.write(name, content);
    if (!result.success) {
        throw new Error("Failed to write blob.");
    }
    let buff = await es.read(name);
    if (Buffer.from(content).equals(Buffer.from(buff))) {
        logInfo("Read data matches written data ✅");
    } else {
        throw new Error("Read data does not match written data ❌");
    }

    const keys = ["key1", "key2"];
    const blobData = [Buffer.from("some data1"), Buffer.from("some data2")];
    result = await es.writeBlobs(keys, blobData);
    if (!result.success) {
        throw new Error("Failed to write blobs.");
    }
    buff = await es.read('key2');
    if (Buffer.from(blobData[1]).equals(Buffer.from(buff))) {
        logInfo("Data for keys matches ✅");
    } else {
        logError("Data for keys does not match ❌");
    }
}

async function fileResolver(filename) {
    return new NodeFile(path.join(__dirname, `../assets/${filename}`));
}

async function runTests() {
    try {
        logInfo("Running EthStorage test...");
        await EthStorageTest();

        logInfo("\n\n\nRunning FlatDirectory test...");
        await flatDirectoryTest(FlatDirectory, UploadType, privateKey, fileResolver);

        logInfo("\n\n\nRunning Sepolia test...");
        await SepoliaTest();

        logInfo("✅ All tests passed successfully!");
    } catch (error) {
        logError(`Error during tests: ${error.message}`);
        await sendNotification("RPC Test Failure", `Error is:\n ${error.message}`);
    }
}

runTests();
