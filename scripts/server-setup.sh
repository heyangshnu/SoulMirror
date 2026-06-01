#!/bin/bash
# 云服务器首次初始化（Ubuntu 22.04+）
set -e

echo "==> 安装基础工具"
sudo apt update
sudo apt install -y git curl nginx

echo "==> 安装 Node.js 20"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "==> 安装 Python 3 + venv"
sudo apt install -y python3 python3-pip python3-venv

echo "==> 安装 Docker"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  echo "请重新登录 SSH 后再执行 docker 命令"
fi

echo "==> 安装 PM2"
sudo npm install -g pm2

echo "==> 安装 EAS CLI（用于触发云端打包 Android/iOS）"
sudo npm install -g eas-cli

echo ""
echo "✅ 服务器环境安装完成"
echo "下一步："
echo "  1. git clone 你的仓库到 /opt/soulmirror"
echo "  2. 配置 services/api/.env 和 services/ai/.env"
echo "  3. 运行 bash scripts/server-deploy.sh"
