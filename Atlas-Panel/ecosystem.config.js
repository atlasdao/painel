module.exports = {
  apps: [
    {
      name: 'atlas-panel',
      script: 'node_modules/.bin/next',
      args: 'start --port 11337',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 11337
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.next'],
      wait_ready: true,
      listen_timeout: 3000,
      kill_timeout: 5000
    }
  ]
};