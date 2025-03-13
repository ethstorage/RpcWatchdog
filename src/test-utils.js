

export async function flatDirectoryTest(FlatDirectory, UploadType, NodeFile, rpc, ethStorageRpc, privateKey, fileResolver) {
    const uploadCallback = {
        onProgress: (progress, count, isChange) => console.log(`progress:${progress}, count:${count}, isChange:${isChange}`),
        onFail: (err) => { throw new Error(`Upload failed: ${err.message}`); },
        onFinish: (totalUploadChunks, totalUploadSize, totalStorageCost) => {
            console.log(`totalUploadChunks:${totalUploadChunks}, totalUploadSize:${totalUploadSize}, totalStorageCost:${totalStorageCost}`);
        }
    };

    const fd = await FlatDirectory.create({ rpc, ethStorageRpc, privateKey });
    await fd.deploy();

    let fileContent = new Uint8Array([49, 50, 51, 52, 53, 54, 55, 56, 57, 48]); // "1234567890"
    let request = {
        type: UploadType.Calldata,
        key: "data.txt",
        content: Buffer.from(fileContent),
        gasIncPct: 1,
        callback: uploadCallback
    };
    console.log(await fd.estimateCost(request));
    await fd.upload(request);

    // 处理文件上传（Node 和 浏览器区分）
    let smallFile = await fileResolver("small.jpeg");
    if (smallFile) {
        request = {
            type: UploadType.Calldata,
            key: "file.jpg",
            content: smallFile,
            gasIncPct: 2,
            callback: uploadCallback
        };
        console.log(await fd.estimateCost(request));
        await fd.upload(request);
    }

    // 测试下载
    await fd.download("data.txt", {
        onProgress: (progress, count, data) => {
            console.log(progress, count, Buffer.from(data).toString());
            if (!Buffer.from(data).equals(Buffer.from(fileContent))) {
                throw new Error("Downloaded data mismatch.");
            }
        },
        onFail: (err) => { throw new Error(`Download failed: ${err.message}`); },
        onFinish: () => console.log('Download complete')
    });

    console.log("✅ Test completed successfully!");
}
