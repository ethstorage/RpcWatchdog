import { FlatDirectory, UploadType } from 'ethstorage-sdk';
import { NodeFile } from 'ethstorage-sdk/file';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import './utils/utils.js';

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
const privateKey = process.env.PRIVATE_KEY;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function fileResolver(filename) {
    return new NodeFile(path.join(__dirname, `../assets/${filename}`));
}

async function runTests() {
    console.log(`ℹ️ [INFO] Running MJS FlatDirectory test...`);
    await flatDirectoryTest(FlatDirectory, UploadType, privateKey, fileResolver);  // If it fails, this will throw
    console.log(`✅ All tests passed successfully!`);
}

runTests();
