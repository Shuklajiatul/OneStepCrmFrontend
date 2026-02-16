module.exports = {
  apps: [
    {
      name: "next-dev-app",
      script: "npm",
      args: "run dev",
      watch: false,      
      autorestart: true, 
      ignore_watch: ["node_modules", ".next", "public"], // Safety net
      env: {
        NODE_ENV: "development"
      }
    }
  ]
};
