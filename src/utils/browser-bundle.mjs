import { FlatDirectory, UploadType } from 'ethstorage-sdk';
import './utils';

window.test = async function test(privateKey) {
    return await window.flatDirectoryTest(FlatDirectory, UploadType, privateKey, () => undefined);
}
