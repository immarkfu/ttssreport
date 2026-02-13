#!/bin/bash

SERVER="115.190.232.185"
PORT="22"
USER="root"
PASSWORD="Lovely610!!"
REPO="https://github.com/immarkfu/ttssreport.git"
TUSHARE_TOKEN="a266b71c03f7666e00c6492021a3f0e8517d7242ad446d79fb363fc9"

echo "=== TTSSReport 部署脚本 ==="
echo "服务器: $SERVER:$PORT"

# 使用 expect 进行自动 SSH 登录
/usr/bin/expect <<'EOF'
set timeout 600
set server [lindex $argv 0]
set port [lindex $argv 1]
set user [lindex $argv 2]
set password [lindex $argv 3]
set repo [lindex $argv 4]
set tushare_token [lindex $argv 5]

spawn ssh -p $port $user@$server
expect {
    "yes/no" { send "yes\r"; exp_continue }
    "password:" { send "$password\r" }
'password:"' { send "$password\r" }
    timeout { puts "❌ 连接超时"; exit 1 }
}

expect "#*"

# 1. 检查并安装 Docker
puts "步骤 1: 检查并安装 Docker..."
send "docker --version\r"
expect {
    "Docker version" {
        puts "✅ Docker 已安装"
    }
    "#*" {
        puts "⚠️  Docker 未安装，开始安装..."
        send "curl -fsSL https://get.docker.com | sh\r"
        expect "#*"
        send "systemctl enable docker\r"
        expect "#*"
        send "systemctl start docker\r"
        expect "#*"
        puts "✅ Docker 安装完成"
    }
    timeout { puts "❌ 安装超时"; exit 1 }
}

expect "#*"

# 2. 检查并安装 docker-compose
puts "步骤 2: 检查并安装 docker-compose..."
send "docker-compose --version\r"
expect {
    "docker-compose version" {
        puts "✅ docker-compose 已安装"
    }
    "#*" {
        puts "⚠️  docker-compose 未安装，开始安装..."
        send "curl -L 'https://github.com/docker/compose/releases/latest/download/docker-compose-'\\\$(uname -s)-'\\\$(uname -m)' -o /usr/local/bin/docker-compose\r"
        expect "#*"
        send "chmod +x /usr/local/bin/docker-compose\r"
        expect "#*"
        puts "✅ docker-compose 安装完成"
    }
    timeout { puts "❌ 安装超时"; exit 1 }
}

expect "#*"

# 3. 克隆/更新仓库
puts "步骤 3: 克隆/更新仓库..."
send "if [ -d ttssreport ]; then echo '更新现有仓库...'; cd ttssreport; git pull; else echo '克隆仓库...'; git clone $repo; cd ttssreport; fi\r"
expect {
    "Username" { send "im.markfu@gmail.com\r"; expect "Password"; send "6umLX56RE76@ump\r"; expect "#*" }
    "#*" {}
    timeout { puts "❌ 仓库操作超时"; exit 1 }
}
puts "✅ 仓库准备完成"

expect "#*"

# 4. 配置环境变量
puts "步骤 4: 配置环境变量..."
send "cd ttssreport\r"
expect "#*"

send "cat > .env << 'ENVEOF'\r"
expect ">"

send "TUSHARE_TOKEN=\$tushare_token\r"
expect ">"

send "MYSQL_HOST=mysql\r"
expect ">"

send "MYSQL_PORT=3306\r"
expect ">"

send "MYSQL_USER=ttssuser\r"
expect ">"

send "MYSQL_PASSWORD=ttsspassword\r"
expect ">"

send "MYSQL_DATABASE=ttssreport\r"
expect ">"

send "ENVEOF\r"
expect "#*"
puts "✅ 环境变量配置完成"

# 5. 拉取 Docker 镜像
puts "步骤 5: 拉取 Docker 镜像..."
send "docker pull immarkfu/ttssreport-backend:latest\r"
expect "#*"

send "docker pull immarkfu/ttssreport-frontend:latest\r"
expect "#*"
puts "✅ 镜像拉取完成"

# 6. 启动服务
puts "步骤 6: 启动服务..."
send "docker-compose up -d\r"
expect "#*"
puts "✅ 服务启动完成"

# 7. 查看服务状态
puts "步骤 7: 查看服务状态..."
send "docker-compose ps\r"
expect "#*"

# 8. 健康检查
puts "步骤 8: 健康检查..."
send "sleep 15\r"
expect "#*"

send "echo '=== 后端服务 ==='\r"
expect "#*"

send "curl -s http://localhost:8000/docs\r"
expect "#*"

send "echo ''\r"
expect "#*"

send "echo '=== 前端服务 ==='\r"
expect "#*"

send "curl -s http://localhost:3000\r"
expect "#*"

puts "\n=== 部署完成 ==="
puts "访问地址："
puts "  前端: http://$server:3000"
puts "  后端: http://$server:8000"
puts "  API 文档: http://$server:8000/docs"

send "exit\r"
expect eof
EOF
