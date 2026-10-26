/**
 * PM2 process file for the Thabayehkom API.
 *
 *   pm2 start ecosystem.config.js        # first time (or after `pm2 delete thabayehkom-backend`)
 *   pm2 reload ecosystem.config.js       # zero-downtime restart after a deploy
 *   pm2 save                              # remember it across server reboots (with `pm2 startup`)
 *
 * Logs are kept in ./logs (stdout = requests + app logs, stderr = errors), timestamped,
 * and rotated by pm2-logrotate (see README "Logs").
 */
module.exports = {
  apps: [
    {
      name: 'thabayehkom-backend',
      script: 'dist/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
      // Back off instead of restart-looping if the app crashes on boot.
      exp_backoff_restart_delay: 200,
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      time: true, // prefix every line with a timestamp
    },
  ],
};
