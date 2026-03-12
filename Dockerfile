# 前端 Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# 安装 pnpm（使用清华镜像加速）
RUN npm install -g pnpm --registry=https://registry.npmmirror.com

# 复制所有文件
COPY . .

# 安装依赖（使用清华镜像加速）
RUN pnpm install --frozen-lockfile --registry=https://registry.npmmirror.com

# 构建
RUN pnpm run build

# 生产镜像
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/client/dist /usr/share/nginx/html

# 注入支持 SPA 路由 + API 代理的 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
