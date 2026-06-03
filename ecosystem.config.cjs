module.exports = {
  apps: [
    {
      name: 'soulmirror-api',
      cwd: './services/api',
      script: 'dist/main.js',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'soulmirror-ai',
      cwd: './services/ai',
      script: 'run-prod.sh',
      interpreter: 'bash',
    },
  ],
};
