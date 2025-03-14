async function flatDirectoryTest(FlatDirectory, UploadType, privateKey, fileResolver) {
    const uploadCallback = {
        onProgress: (progress, count, isChange) => {
            console.log(`progress:${progress}, count:${count}, isChange:${isChange}`);
        },
        onFail: (err) => {
            throw new Error(`Upload failed: ${err.message}`);
        },
        onFinish: (totalUploadChunks, totalUploadSize, totalStorageCost) => {
            console.log(`totalUploadChunks:${totalUploadChunks}, totalUploadSize:${totalUploadSize}, totalStorageCost:${totalStorageCost}`);
        }
    };

    const fd = await FlatDirectory.create({
        rpc: 'https://rpc.beta.testnet.l2.quarkchain.io:8545',
        ethStorageRpc: 'https://rpc.beta.testnet.l2.ethstorage.io:9596',
        privateKey,
    });
    await fd.deploy();

    // Test calldata upload
    // buffer
    let request = {
        type: UploadType.Calldata,
        key: "data.txt",
        content: new TextEncoder().encode("1234567890"),
        gasIncPct: 1,
        callback: uploadCallback
    };
    console.log(await fd.estimateCost(request));
    await fd.upload(request);

    // file
    let file = await fileResolver("small.jpeg");
    if (file) {
        request = {
            type: UploadType.Calldata,
            key: "file.jpg",
            content: file,
            gasIncPct: 2,
            callback: uploadCallback
        };
        console.log(await fd.estimateCost(request));
        await fd.upload(request);
    }



    // Test blob upload
    request = {
        type: UploadType.Blob,
        key: "blobData.txt",
        content: new TextEncoder().encode("12345678"),
        gasIncPct: 5,
        callback: uploadCallback
    };
    console.log(await fd.estimateCost(request));
    await fd.upload(request);

    // File blob upload
    file = await fileResolver("big.jpg");
    if (file) {
        request = {
            type: UploadType.Blob,
            key: "blobFile.jpg",
            content: file,
            gasIncPct: 5,
            chunkHashes: [],
            callback: uploadCallback
        };
        console.log(await fd.estimateCost(request));
        await fd.upload(request);
    }


    // Download test
    await fd.download("data.txt", {
        onProgress: (progress, count, data) => {
            console.log(progress, count);
            if (new TextDecoder().decode(data) !== "1234567890") {
                throw new Error("Downloaded data does not match the original data.");
            }
        },
        onFail: (err) => {
            throw new Error(`Upload failed: ${err.message}`);
        },
        onFinish: () => {
            console.log('download finish');
        }
    });
    await fd.download("blobFile.jpg", {
        onProgress: (progress, count, data) => {
            console.log(progress, count, data.length);
        },
        onFail: (err) => {
            throw new Error(`Upload failed: ${err.message}`);
        },
        onFinish: () => {
            console.log('download finish');
        }
    });

    const hashes2 = await fd.fetchHashes(["file.jpg", "blobFile.jpg"]);
    console.log(hashes2);
}


if (typeof module !== "undefined" && module.exports) {
    module.exports = { flatDirectoryTest };
}
if (typeof define === "undefined") {
    Object.assign(globalThis, { flatDirectoryTest });
}
