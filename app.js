process.env.TF_CPP_MIN_LOG_LEVEL = '2';
const express = require("express");
const afs = require("fs-extra");
const multiparty = require("multiparty");
const imgJS = require("image-js");
const nsfw = require("nsfwjs");
const tf = require("@tensorflow/tfjs-node");
const bodyparser = require("body-parser");


const imgTypeoObj = {
    Drawing: "艺术性的",
    Neutral: "中性的",
    Sexy: "性感的",
    Porn: "色情的",
    Hentai: "变态的",
};

const safeContent = ["Drawing", "Neutral"];


const app = express();


app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());

// 转换图片格式
const convert = async (file) => {
    const image = await imgJS.Image.load(file.path);
    const numChannels = 3;
    const numPixels = image.width * image.height;
    const values = new Int32Array(numPixels * numChannels);

    for (let i = 0; i < numPixels; i++) {
        for (let c = 0; c < numChannels; ++c) {
            values[i * numChannels + c] = image.data[i * 4 + c];
        }
    }

    return tf.tensor3d(values, [image.height, image.width, numChannels], "int32");
};

// 初始化 NSFW 模型
let model;
(async function () {
    model = await nsfw.load("file://./web_model/", {
        type: "graph",
    });
})();

// 检查图片是否安全
const isSafeContent = (predictions) => {
    let safeProbability = 0;
    let imgTypeValArr = [];

    predictions.forEach((item) => {
        if (safeContent.includes(item.className)) {
            safeProbability += item.probability;
        }
    });

    imgTypeValArr = predictions.sort((a, b) => b.probability - a.probability);
    const myimgType = imgTypeValArr.length && imgTypeValArr[0]
        ? imgTypeoObj[imgTypeValArr[0].className]
        : "";

    return {
        isSafe: safeProbability > 0.5,
        imgType: myimgType,
    };
};


app.post("/checkImg", async (req, res) => {
    try {
        const form = new multiparty.Form();
        form.uploadDir = "./tempImgs"; // 设置临时文件存储路径

        form.parse(req, async (err, fields, files) => {
            if (err || !files || !files.file[0]) {
                return res.send({
                    code: 1,
                    msg: "系统繁忙，请稍后再试",
                });
            }

            const originImgName = files.file[0].originalFilename || files.file[0].path;
            if (!/\S+\.(png|jpeg|jpg)$/g.test(originImgName)) {
                return res.send({
                    code: 1,
                    msg: "仅支持png, jpeg, jpg格式",
                });
            }

            let img;
            try {
                img = await convert(files.file[0]);
                const predictions = await model.classify(img);
                const { isSafe, imgType } = isSafeContent(predictions);

                res.send({
                    code: isSafe ? "0" : "1",
                    msg: `0通过，1不通过`,
                });
            } catch (error) {
                console.error("处理图片出错：", error);
                res.send({
                    code: 1,
                    msg: "检测失败，请重试",
                });
            } finally {
                if (img) img.dispose(); // 确保 Tensor 资源释放
                await afs.remove(files.file[0].path); // 删除临时文件
            }
        });
    } catch (error) {
        console.error("处理请求出错：", error);
        res.send({
            code: 1,
            msg: "服务器内部错误",
        });
    }
});

// 监听端口
app.listen(3006, () => {
    console.log("服务启动成功，监听端口：3006");
});

// 捕获未处理的异常，防止崩溃
process.on("uncaughtException", (err) => {
    console.error("未捕获的异常：", err);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("未处理的Promise拒绝：", promise, "原因：", reason);
});
