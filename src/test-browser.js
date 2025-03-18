const puppeteer = require('puppeteer');
const esbuild = require('esbuild');
const path = require('path');

const dotenv = require("dotenv");
dotenv.config({ path: '../.env' });
const privateKey = process.env.PRIVATE_KEY;

(async () => {
    console.log(`ℹ️ [INFO] Packing test script...`);
    await esbuild.build({
        entryPoints: [path.resolve(__dirname, 'utils/browser-bundle.mjs')],
        bundle: true,
        format: 'esm',
        outfile: path.resolve(__dirname, 'dist/browser-bundle.mjs'),
    });

    console.log(`ℹ️ [INFO] Packing completed, starting tests...`);
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
        const page = await browser.newPage();
        await page.goto('about:blank');
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

        await page.addScriptTag({ path: path.resolve(__dirname, 'dist/browser-bundle.mjs') });
        const result = await page.evaluate(async (privateKey) => {
            if (typeof window.test !== 'function') {
                throw new Error('test is not available on window.');
            }
            return await window.test(privateKey);
        }, privateKey);
        if (result && result.error) {
            throw new Error(result.error);
        }
    } finally {
        if (browser) await browser.close();
    }
    console.log(`✅ All tests passed successfully!`);
})();

