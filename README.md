# 证件照图片鉴黄API端

# 介绍
证件照图片鉴黄API端
<br>
二次开发源码来自：https://gitee.com/xiaoz_xiansen/nsfwjs-img-check

<br>
<hr>

# 环境
node 版本：v16.11.1

<br>
<hr>

# 安装
1.执行下面命令，下载依赖
```js
yarn
```
2.执行下面命令，启动服务
 ```js
yarn start
 ```

<br>
<hr>

# 其它

服务启动成功后，控制台会输出以下提示
```js
启动成功，端口号：3006
```

# Docker 部署说明

## 构建镜像
```bash
docker build -t checkimg-api .
```

## 运行容器
```bash
docker run -d -p 3006:3006 --name checkimg-api checkimg-api
```

## 查看容器日志
```bash
docker logs checkimg-api
```
