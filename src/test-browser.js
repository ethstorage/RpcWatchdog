const { JSDOM } = require('jsdom');
const { FlatDirectory, UploadType } = require('ethstorage-sdk');
const { flatDirectoryTest } = require("./test-utils");

const dotenv = require("dotenv")
dotenv.config({ path: '../.env' });
const privateKey = process.env.PRIVATE_KEY;

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

async function fileResolver() {
    return undefined;
}

(async () => {
    console.log()
    console.log()
    console.log()

    try {
        const dom = new JSDOM(`<!DOCTYPE html><html><body><button id="runTest">Run Test</button></body></html>`);
        global.document = dom.window.document;
        global.window = dom.window;
        global.navigator = dom.window.navigator;

        document.getElementById("runTest").addEventListener("click", async () => {
            try {
                console.log("🚀 Running Browser test...");
                await flatDirectoryTest(FlatDirectory, UploadType, privateKey, fileResolver);
                console.log("✅ All tests passed successfully!");
            } catch (err) {
                console.error("❌ Error during tests:", err);
                await sendNotification("Browser RPC Test Failure", `Error is:\n ${err.message}`);
            }
        });

        const button = document.getElementById("runTest");
        button.click();
    } catch (err) {
        console.error("❌ Error in jsdom test:", err);
    }
})();
