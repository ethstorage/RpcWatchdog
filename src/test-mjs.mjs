import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import './utils/utils.js';

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import sendgrid from '@sendgrid/mail';
const privateKey = process.env.PRIVATE_KEY;

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

let FlatDirectory, UploadType, NodeFile;
try {
    logInfo("Loading SDK modules...");
    const sdk = await import('ethstorage-sdk');
    FlatDirectory = sdk.FlatDirectory;
    UploadType = sdk.UploadType;

    const fileModule = await import('ethstorage-sdk/file');
    NodeFile = fileModule.NodeFile;
    logInfo("SDK modules loaded successfully!");
} catch (err) {
    logError(`SDK error: ${err.message}`);
    await sendNotification("MJS RPC Test Failure", `Error is:\n ${err.message}`);
    process.exit(1);
}

async function fileResolver(filename) {
    return new NodeFile(path.join(__dirname, `../assets/${filename}`));
}

async function runTests() {
    try {
        logInfo("\nn\n\nRunning MJS FlatDirectory test...");
        await flatDirectoryTest(FlatDirectory, UploadType, privateKey, fileResolver);
        logInfo("✅ All tests passed successfully!");
    } catch (error) {
        logError(`Error during tests: ${error.message}`);
        await sendNotification("MJS RPC Test Failure", `Error is:\n ${error.message}`);
    }
}

runTests();
