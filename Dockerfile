# 使用多阶段构建
FROM node:16.11.1 AS builder

# 设置构建参数
ENV PYTHON=/usr/bin/python3

# 安装构建依赖
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装node-gyp
RUN npm install -g node-gyp

# 安装依赖，使用--build-from-source强制从源码构建
RUN npm install --build-from-source @tensorflow/tfjs-node && \
    npm install

# 第二阶段：运行环境
FROM node:16.11.1-slim

WORKDIR /app

# 复制构建好的依赖
COPY --from=builder /app/node_modules ./node_modules

# 复制应用代码
COPY . .

# 创建临时文件夹
RUN mkdir -p tempImgs && \
    chmod 777 tempImgs

# 暴露端口
EXPOSE 3006

# 启动命令
CMD ["npm", "start"] 