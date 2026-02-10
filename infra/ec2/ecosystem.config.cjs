module.exports = {
  apps: [
    {
      name: 'soothsayer-api',
      cwd: '/home/ec2-user/soothsayer',
      script: 'npx',
      args: '-y pnpm@8.12.0 --filter @soothsayer/api dev',
      env: {
        NODE_ENV: 'development',
      },
      autorestart: true,
      max_restarts: 20,
      time: true,
    },
    {
      name: 'soothsayer-web',
      cwd: '/home/ec2-user/soothsayer',
      script: 'npx',
      args: '-y pnpm@8.12.0 --filter @soothsayer/web exec vite --host 0.0.0.0 --port 5173',
      env: {
        NODE_ENV: 'development',
      },
      autorestart: true,
      max_restarts: 20,
      time: true,
    },
  ],
};
