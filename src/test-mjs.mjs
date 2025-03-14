import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import './utils/utils.js';
import sendgrid from '@sendgrid/mail';
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
// File path for testing
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const privateKey = process.env.PRIVATE_KEY;

let FlatDirectory, UploadType, NodeFile;
try {
    console.log("🔄 Loading SDK modules...");
    const sdk = await import('ethstorage-sdk');
    FlatDirectory = sdk.FlatDirectory;
    UploadType = sdk.UploadType;

    const fileModule = await import('ethstorage-sdk/file');
    NodeFile = fileModule.NodeFile;
    console.log("✅ SDK modules loaded successfully!");
} catch (err) {
    console.error("❌ SDK error:", err);
    await sendNotification("MJS RPC Test Failure", `Error is:\n ${err.message}`);
    process.exit(1);
}

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

async function fileResolver(filename) {
    return new NodeFile(path.join(__dirname, `../assets/${filename}`));
}

async function runTests() {
    try {
        console.log()
        console.log()
        console.log()
        console.log("Running mjs FlatDirectory test...");
        await flatDirectoryTest(FlatDirectory, UploadType, privateKey, fileResolver);
        console.log("✅ All tests passed successfully!");
    } catch (error) {
        console.error("❌ Error during tests:", error);
        await sendNotification("MJS RPC Test Failure", `Error is:\n ${error.message}`);
    }
}

runTests();
