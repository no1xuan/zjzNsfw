// 导入express模块
const express = require("express");
let fs = require('fs');
const path = require("path");
const afs = require('fs-extra');
const multiparty = require('multiparty');
const imgJS = require("image-js");
const nsfw = require('nsfwjs');
const tf = require('@tensorflow/tfjs-node');
const bodyparser = require("body-parser");

let imgTypeoObj = {
    Drawing: '艺术性的',
    Neutral: '中性的',
    Sexy: '性感的',
    Porn: '色情的',
    Hentai: '变态的',
};

const safeContent = ['Drawing', 'Neutral'];

// 创建服务器对象
let app = express();

// 配置body-parser模块
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());

// 转换图片格式
const convert = async file => {
    const image = await imgJS.Image.load(file.path);
    const numChannels = 3;
    const numPixels = image.width * image.height;
    const values = new Int32Array(numPixels * numChannels);

    for (let i = 0; i < numPixels; i++) {
        for (let c = 0; c < numChannels; ++c) {
            values[i * numChannels + c] = image.data[i * 4 + c];
        }
    }

    return tf.tensor3d(values, [image.height, image.width, numChannels], 'int32');
};

// 初始化NSFW模型
let model;
(async function() {
    model = await nsfw.load('file://./web_model/', {
        type: 'graph'
    });
})();

// 检查图片是否安全
const isSafeContent = predictions => {
    let safeProbability = 0;
    let imgTypeValArr = [];
    for (let index = 0; index < predictions.length; index++) {
        const item = predictions[index];
        const className = item.className;
        const probability = item.probability;
        if (safeContent.includes(className)) {
            safeProbability += probability;
        };
    }
    imgTypeValArr = predictions.sort((a, b) => b.probability - a.probability);
    let myimgType = '';
    if (imgTypeValArr.length && imgTypeValArr[0]) {
        myimgType = imgTypeoObj[imgTypeValArr[0].className];
    }
    return {
        isSafe: safeProbability > 0.5,
        imgType: myimgType
    };
};

// 处理图片上传和检测
app.post('/checkImg', async (req, res) => {
    try {
        let form = new multiparty.Form();
        form.uploadDir = './tempImgs'; // 设置临时文件存储路径
        form.parse(req, async (err, fields, files) => {
            if (err || !files || !files.file[0]) {
                return res.send({
                    code: -1,
                    msg: '请求错误'
                });
            }

            let imgReg = /\S+\.(png|jpeg|jpg)$/g;
            let originImgName = files.file[0].originalFilename || files.file[0].path;
            if (!imgReg.test(originImgName)) {
                return res.send({
                    code: -2,
                    msg: '仅支持png,jpeg,jpg'
                });
            }

            let img = await convert(files.file[0]);

            try {
                let predictions = await model.classify(img);
                const { isSafe, imgType } = isSafeContent(predictions);

                res.send({
                    code: isSafe ? '0' : '1',
                    msg: '0通过，1不通过'
                });
            } finally {
                // 确保在任何情况下都释放Tensor
                img.dispose();
            }

            // 删除临时文件
            fs.unlink(files.file[0].path, err => {
                if (err) console.error('删除失败', err);
            });
        });
    } catch (error) {
        res.send({
            code: 0,
            msg: '上传失败'
        });
    }
});

// 监听端口
app.listen(3006, () => {
    console.log("启动成功，port：3006");
});
