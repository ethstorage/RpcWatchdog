import { JSDOM } from 'jsdom';
import { FlatDirectory, UploadType } from 'ethstorage-sdk';
import { flatDirectoryTest } from './test-utils.js';
import sendgrid from "@sendgrid/mail";
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });
const privateKey = process.env.PRIVATE_KEY;

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

async function fileResolver() {
    return undefined;
}

(async () => {
    try {
        const dom = new JSDOM(`<!DOCTYPE html><html><body><button id="runTest">Run Test</button></body></html>`);
        global.document = dom.window.document;
        global.window = dom.window;
        global.navigator = dom.window.navigator;

        document.getElementById("runTest").addEventListener("click", async () => {
            try {
                console.log("🚀 Running SDK test in jsdom...");
                await flatDirectoryTest(FlatDirectory, UploadType, privateKey, fileResolver);
                console.log("✅ SDK 测试通过！");
            } catch (err) {
                console.error("❌ SDK 测试失败:", err);
            }
        });

        const button = document.getElementById("runTest");
        button.click();
    } catch (err) {
        console.error("❌ Error in jsdom test:", err);
        await sendNotification("Browser Test Failure", `Error during test execution: ${err.message}`);
    }
})();
