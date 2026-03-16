#!/bin/bash
set -e
echo "Building Conta Atlas..."
npm run build
echo "Restarting PM2..."
PM2_HOME=/home/cmo/.pm2 pm2 restart conta-atlas --update-env
echo "Checking health..."
sleep 3
curl -sf http://localhost:11338 > /dev/null && echo "Deploy OK!" || echo "WARN: Health check failed"
