module.exports = {
  apps: [{
    name: "loopdeloop",
    cwd: "/root/leverage-prime-webapp",
    script: "pnpm",
    args: "start",
    interpreter: "none",
    autorestart: true,
    max_restarts: 10,
    env: { NODE_ENV: "production" },
  }],
};
