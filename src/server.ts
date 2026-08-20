import { buildApp } from "./app.js";
import { config } from "./config/env.js";

export async function startServer() {
  try {
    const app = await buildApp({ enableLogging: true });

    const address = await app.listen({
      port: config.PORT,
      host: config.HOST
    });

    app.log.info(`🚀 Cinely Media Engine V1 running at ${address}`);
    app.log.info(`📡 Liveness probe available at ${address}/healthz`);
    app.log.info(`📡 Readiness probe available at ${address}/readyz`);
    app.log.info(`🔍 Discovery API available at ${address}/v1/discover`);

    // Graceful Shutdown with bounded 10s ceiling
    let isShuttingDown = false;
    const closeGracefully = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      app.log.info(`Received signal ${signal}. Starting graceful shutdown...`);

      // 10s hard timeout to guarantee process termination
      const forceShutdownTimer = setTimeout(() => {
        app.log.error("Graceful shutdown timed out after 10s. Forcing exit.");
        process.exit(1);
      }, 10_000);
      forceShutdownTimer.unref();

      try {
        await app.close();
        app.log.info("Server closed successfully. Clean exit.");
        process.exit(0);
      } catch (err) {
        app.log.error({ err }, "Error during server close");
        process.exit(1);
      }
    };

    process.on("SIGINT", () => closeGracefully("SIGINT"));
    process.on("SIGTERM", () => closeGracefully("SIGTERM"));

    return app;
  } catch (err) {
    console.error("Error starting Cinely server:", err);
    process.exit(1);
  }
}

// Automatically start if executed as main module
startServer();
