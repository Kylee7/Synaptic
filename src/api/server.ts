import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { SynapticConfig } from '../types/index';
import { Logger } from '../utils/Logger';
import { MemoryConnectionProtocol } from '../core/MemoryConnectionProtocol';
import { memoryRoutes } from './routes/memory';
import { aiRoutes } from './routes/ai';
import { blockchainRoutes } from './routes/blockchain';
import { authRoutes } from './routes/auth';
import { healthRoutes } from './routes/health';
import { createStandardRateLimiter } from './middleware/rateLimiter';

export class SynapticServer {
  private app: express.Application;
  private config: SynapticConfig;
  private logger: Logger;
  private protocol: MemoryConnectionProtocol;
  private server?: any;

  constructor(config: SynapticConfig, protocol: MemoryConnectionProtocol) {
    this.config = config;
    this.protocol = protocol;
    this.logger = new Logger('SynapticServer');
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: this.config.server.cors.origin,
      credentials: this.config.server.cors.credentials
    }));

    // Rate limiting
    const rateLimiter = createStandardRateLimiter();
    this.app.use('/api', rateLimiter.middleware);

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Logging
    this.app.use(morgan('combined'));

    // Basic health check endpoint (before rate limiting)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });
  }

  private setupRoutes(): void {
    // Health and monitoring routes (no auth required)
    this.app.use('/health', healthRoutes(this.protocol));
    
    // API routes
    this.app.use('/api/auth', authRoutes(this.protocol));
    this.app.use('/api/memory', memoryRoutes(this.protocol));
    this.app.use('/api/ai', aiRoutes(this.protocol));
    this.app.use('/api/blockchain', blockchainRoutes(this.protocol));

    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Synaptic API',
        version: '1.0.0',
        description: 'Decentralized MCP API',
        endpoints: {
          health: '/health',
          auth: '/api/auth',
          memory: '/api/memory',
          ai: '/api/ai',
          blockchain: '/api/blockchain'
        },
        documentation: {
          openapi: '/api/docs',
          postman: '/api/postman'
        }
      });
    });

    // API documentation endpoints
    this.app.get('/api/docs', (req, res) => {
      res.json({
        openapi: '3.0.0',
        info: {
          title: 'Synaptic API',
          version: '1.0.0',
          description: 'Decentralized MCP API'
        },
        servers: [
          {
            url: `http://${this.config.server.host}:${this.config.server.port}`,
            description: 'Development server'
          }
        ],
        paths: {
          '/health': {
            get: {
              summary: 'Health check',
              responses: {
                '200': { description: 'System is healthy' }
              }
            }
          },
          '/api/memory': {
            post: {
              summary: 'Create memory',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        content: { type: 'string' },
                        type: { type: 'string', enum: ['knowledge', 'conversation', 'insight', 'task'] },
                        category: { type: 'string', enum: ['technical', 'personal', 'business', 'creative', 'other'] }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
        availableEndpoints: [
          '/health',
          '/api',
          '/api/auth',
          '/api/memory',
          '/api/ai',
          '/api/blockchain'
        ]
      });
    });

    // Global error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      this.logger.error('Unhandled error', err);
      
      res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      });
    });
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.server.port, this.config.server.host, () => {
          this.logger.info(`Synaptic API server started on ${this.config.server.host}:${this.config.server.port}`);
          this.logger.info('Available endpoints:');
          this.logger.info(`  Health: http://${this.config.server.host}:${this.config.server.port}/health`);
          this.logger.info(`  API: http://${this.config.server.host}:${this.config.server.port}/api`);
          this.logger.info(`  Docs: http://${this.config.server.host}:${this.config.server.port}/api/docs`);
          resolve();
        });

        this.server.on('error', (error: any) => {
          this.logger.error('Server startup error', error);
          reject(error);
        });

        // Graceful shutdown handling
        process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
      } catch (error) {
        this.logger.error('Failed to start server', error);
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('API server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    this.logger.info(`Received ${signal}, shutting down gracefully...`);
    await this.stop();
    process.exit(0);
  }
}
