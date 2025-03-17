const { execSync} = require('child_process');
const fs = require('fs');

const dotenv = require("dotenv");
dotenv.config({ path: '../.env' });
const privateKey = process.env.PRIVATE_KEY;

const sendgrid = require('@sendgrid/mail');
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

const TEST_FILE = 'test.txt';
fs.writeFileSync(TEST_FILE, 'This is a test file for ethfs-cli.', 'utf-8');

async function sendNotification(subject, message) {
    const msg = {
        to: process.env.QKC_EMAILLIST.split(','),
        from: 'QuarkChainMining@quarkchain.org',
        subject: subject,
        text: message
    };
    await sendgrid.send(msg);
}

function executeCommand(command, description) {
    console.log(`\n🔧 ${description}`);
    const result = execSync(command).toString();
    console.log(`✅ SUCCESS: ${result}`);
    return result;
}

const createAddress = async (chainId) => {
    const createResult = executeCommand(`npx ethfs-cli create -p ${privateKey} -c ${chainId}`, "Deploying contract");
    const contractAddress = createResult.match(/FlatDirectory: Address is (0x[a-fA-F0-9]{40})/)?.[1];
    if (!contractAddress) {
        throw new Error('Failed to extract contract address from the output.');
    }
    return contractAddress;
};

const setDfault = (address, chainId) => {
    const setDefaultCommand = `npx ethfs-cli default -a ${address} -p ${privateKey} -c ${chainId} -f index.html`;
    executeCommand(setDefaultCommand, "Setting default contract");
};

const upload = (address, chainId) => {
    const uploadCommand = `npx ethfs-cli upload -a ${address} -p ${privateKey} -c ${chainId} -f ${TEST_FILE}`;
    executeCommand(uploadCommand, "Upload test File");
};

const download = (address, chainId) => {
    const originalContent = fs.readFileSync(TEST_FILE, 'utf-8');
    fs.unlinkSync(TEST_FILE);

    const downloadCommand = `npx ethfs-cli download -a ${address} -c ${chainId} -f ${TEST_FILE}`;
    executeCommand(downloadCommand, "Downloading test file");
    const downloadedContent = fs.readFileSync(TEST_FILE, "utf-8");

    if (originalContent === downloadedContent) {
        console.log('✅ File content matches.');
    } else {
        console.error('❌ File content does not match.');
        throw new Error('File content does not match.')
    }
};

const main = async () => {
    try {
        let chainId = 3335;
        let address = await createAddress(chainId);
        upload(address, chainId);
        setDfault(address, chainId);
        download(address, chainId);

        chainId = 11155111;
        address = await createAddress(chainId);
        upload(address, chainId);
        await new Promise(resolve => setTimeout(resolve, 20000));
        download(address, chainId);
        console.log("✅ All tests passed successfully!");
    } catch (error) {
        console.log(`Error during tests: ${error.message}`);
        await sendNotification("ethfs-cli Test Failure", `Error is:\n ${error.message}`);
    } finally {
        if (fs.existsSync(TEST_FILE)) {
            fs.unlinkSync(TEST_FILE);
        }
    }
};

main();
