module.exports = {
  apps: [
    {
      name: 'atlas-api',
      script: './dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 19997
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
      ignore_watch: ['node_modules', 'logs'],
      wait_ready: true,
      listen_timeout: 3000,
      kill_timeout: 5000
    }
  ]
};