module.exports = {
  apps: [
    {
      name: 'soothsayer-api',
      cwd: '/home/ec2-user/soothsayer',
      script: 'pnpm',
      args: '--filter @soothsayer/api start:prod',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      max_restarts: 20,
      time: true,
    },
    {
      name: 'soothsayer-web',
      cwd: '/home/ec2-user/soothsayer',
      script: 'pnpm',
      args: '--filter @soothsayer/web exec vite preview --host 0.0.0.0 --port 4173',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      max_restarts: 20,
      time: true,
    },
  ],
};
