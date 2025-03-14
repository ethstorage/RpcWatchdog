const puppeteer = require('puppeteer');
const esbuild = require('esbuild');
const path = require('path');

const dotenv = require("dotenv");
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

(async () => {
    let browser;
    try {
        // 1. 打包 testUtils.js 和相关依赖（esbuild）
        console.log('正在打包测试脚本...');
        await esbuild.build({
            entryPoints: [path.resolve(__dirname, 'utils/browser-bundle.mjs')],
            bundle: true,
            format: 'esm',
            outfile: path.resolve(__dirname, 'dist/browser-bundle.mjs'),
        });
        console.log('打包完成，开始测试...');

        // 2. 启动 Puppeteer
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('about:blank');
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

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
        console.error("❌ Error during tests:", err.message);
        await sendNotification("Browser Test Failure", `Error is:\n ${err.message}`);
    } finally {
        if (browser) await browser.close();
    }
})();
