module.exports = {
  apps: [
    {
      name: "fire-backend",
      script: "bun",
      args: "run src/index.ts",
      cwd: "backend",
      interpreter: "none",
      watch: true,
      env_file: ".env",
    },
    {
      name: "fire-web",
      script: "npm",
      args: "run start",
      cwd: "web",
      watch: false,
    }
  ]
};
