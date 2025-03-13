import puppeteer from 'puppeteer';
import { spawn } from 'child_process';

const SERVER_PORT = 5173;
const TEST_URL = `http://localhost:${SERVER_PORT}/test-browser.html`;

async function startServer() {
    return new Promise((resolve, reject) => {
        const viteProcess = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

        setTimeout(() => {
            console.log('✅ Vite server started.');
            resolve(viteProcess);
        }, 3000); // 等待 3 秒启动
    });
}

async function runPuppeteerTest() {
    console.log("🚀 Launching Puppeteer...");
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    page.on('console', msg => {
        console.log(`BROWSER LOG: ${msg.text()}`);
        if (msg.text().includes("✅ Test completed successfully!")) {
            console.log("🎉 SDK 测试通过！");
        }
        if (msg.text().includes("❌")) {
            console.error("❌ SDK 测试失败！");
            process.exit(1);
        }
    });

    console.log(`🌍 Opening ${TEST_URL}`);
    await page.goto(TEST_URL);
    await page.click("#runTest");
    await page.waitForTimeout(10000);
    await browser.close();
}

async function main() {
    const serverProcess = await startServer();
    try {
        await runPuppeteerTest();
    } catch (error) {
        console.error("❌ Puppeteer 测试失败:", error);
        process.exit(1);
    } finally {
        console.log("🛑 Stopping server...");
        serverProcess.kill();
    }
}

main();
