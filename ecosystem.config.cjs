module.exports = {
  apps: [
    {
      name: "janro-backend",
      script: "./server/server.js",
      instances: "max", // Uses all available CPU cores
      exec_mode: "cluster", // Enables Node.js cluster mode for load balancing
      watch: false,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
