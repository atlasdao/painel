module.exports = {
  apps: [{
    name: 'conta-atlas',
    script: 'node_modules/.bin/next',
    args: 'start -p 11338',
    cwd: '/home/cmo/ContaAtlas',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 11338
    }
  }]
};
