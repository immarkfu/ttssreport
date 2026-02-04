# 前端 Dockerfile
FROM node:22-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json 和 pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY client/ /app/

# 暴露端口
EXPOSE 5173

# 开发模式启动命令
CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0"]
