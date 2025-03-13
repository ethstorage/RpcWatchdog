import { FlatDirectory, UploadType } from 'ethstorage-sdk';
import { NodeFile } from 'ethstorage-sdk/file';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import './test-utils.js';

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import sendgrid from '@sendgrid/mail';
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

const privateKey = process.env.PRIVATE_KEY;

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
