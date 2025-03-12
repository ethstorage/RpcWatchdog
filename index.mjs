import crypto from "crypto";
import sendgrid from '@sendgrid/mail';
import Core from '@alicloud/pop-core';
import 'dotenv/config';
import { EthStorage } from 'ethstorage-sdk';

const PRIVATE_KEY = process.env.PRIVATE_KEY;

// RPC config
const networks = [
    {
        name: 'Sepolia',
        rpc: 'http://88.99.30.186:8545/',
        ethStorageRpc: 'http://65.108.236.27:9540',
    },
    {
        name: 'QuarkChain',
        rpc: 'https://rpc.beta.testnet.l2.quarkchain.io:8545',
        ethStorageRpc: 'https://rpc.beta.testnet.l2.ethstorage.io:9596',
    }
];

const smsClient = new Core({
    accessKeyId: process.env.ALI_KEY,
    accessKeySecret: process.env.ALI_SECRET,
    // securityToken: '<your-sts-token>', // use STS Token
    endpoint: 'https://dysmsapi.aliyuncs.com',
    apiVersion: '2017-05-25'
});

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

async function sendNotification(subject, message) {
    const phones = process.env.QKC_PHONELIST.split(',');
    for (let phone of phones) {
        const params = {
            "SignName": "阿里云短信测试",
            "TemplateCode": "SMS_154950909",
            "PhoneNumbers": phone,
            "TemplateParam": "{\"code\":\"" + 8888 + "\"}"
        }
        const requestOption = {
            method: 'POST',
            formatParams: false,
        };
        smsClient.request('SendSms', params, requestOption).then((result) => {
            console.log(JSON.stringify(result));
        }, (ex) => {
            console.log(ex);
        })
    }


    const msg = {
        to: process.env.QKC_EMAILLIST.split(','),
        from: 'QuarkChainMining@quarkchain.org',
        subject: subject,
        text: message
    };
    await sendgrid.send(msg)
}

// Check RPC Services
async function checkRpcServices() {
    for (const network of networks) {
        try {
            const es = await EthStorage.create({
                rpc: network.rpc,
                ethStorageRpc: network.ethStorageRpc,
                privateKey: PRIVATE_KEY
            });

            // Check RPC by writing random data
            const randomData = crypto.randomBytes(16);
            let result = await es.write("test.txt", randomData);
            if (!result.success) {
                throw new Error("RPC write operation failed");
            }
            console.log(`${network.name} RPC check passed ✅`);

            // Wait for some time to ensure synchronization
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Check ethStorageRpc by reading back the data
            const storedData = await es.read("test.txt");
            if (!randomData.equals(Buffer.from(storedData))) {
                throw new Error("Read data does not match written data, ethStorage RPC may be out of sync");
            }
            console.log(`${network.name} ethStorage RPC check passed ✅`);
        } catch (error) {
            console.error(`${network.name} - L2 RPC or ethStorage RPC validation failed ❌:`, error);
            await sendNotification(`${network.name} - RPC validation failure`, `Error details: ${error.message}`);
            console.log();
        }
    }
}

checkRpcServices();
