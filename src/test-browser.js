const puppeteer = require('puppeteer');
const esbuild = require('esbuild');
const path = require('path');

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

(async () => {
    let browser;
    try {
        logInfo("\n\n\nPacking test script...");
        await esbuild.build({
            entryPoints: [path.resolve(__dirname, 'utils/browser-bundle.mjs')],
            bundle: true,
            format: 'esm',
            outfile: path.resolve(__dirname, 'dist/browser-bundle.mjs'),
        });
        logInfo("Packing completed, starting tests...");

        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto('about:blank');
        page.on('console', msg => logInfo(`BROWSER LOG: ${msg.text()}`));

        await page.addScriptTag({ path: path.resolve(__dirname, 'dist/browser-bundle.mjs') });
        const result = await page.evaluate(async (privateKey) => {
            try {
                if (typeof window.test !== 'function') {
                    throw new Error('test is not available on window.');
                }
                return await window.test(privateKey);
            } catch (err) {
                return { error: err.message };
            }
        }, privateKey);

        if (result && result.error) {
            throw new Error(result.error);
        }
    } catch (err) {
        logError(`Error during tests: ${err.message}`);
        await sendNotification("Browser Test Failure", `Error is:\n ${err.message}`);
    } finally {
        if (browser) await browser.close();
    }
})();
