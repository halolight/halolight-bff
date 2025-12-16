import dotenv from 'dotenv';
import { createServer } from './server';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Start the server
 */
async function main() {
  const { app, logger } = createServer();

  app.listen(Number(PORT), HOST, () => {
    logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 HaloLight BFF Gateway                                ║
║                                                           ║
║   Server running at: http://${HOST}:${PORT}               ║
║   tRPC endpoint: http://${HOST}:${PORT}/trpc              ║
║   Health check: http://${HOST}:${PORT}/health            ║
║                                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                      ║
║   Press Ctrl+C to stop                                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the server
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
