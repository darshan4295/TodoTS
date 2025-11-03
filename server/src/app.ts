import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as OpenApiValidator from 'express-openapi-validator';
import { Server } from 'http';
import swaggerUi from 'swagger-ui-express';
import { Database } from './config/database';
import { createTodoRoutes } from './routes/todoRoutes';
import apiDocs from './openapi.json';

export class TodoApplication {
  private app: Express;
  private server?: Server;
  private database: Database;

  constructor() {
    this.app = express();
    this.database = Database.getInstance();
    this.setupMiddleware();
  }

  private setupMiddleware(): void {
    // CORS middleware
    this.app.use(cors());

    // JSON parsing middleware
    this.app.use(express.json());

    // OpenAPI validation middleware
    this.app.use(
      OpenApiValidator.middleware({
        apiSpec: apiDocs as any,
        validateRequests: {
          allowUnknownQueryParameters: false,
          coerceTypes: true,
          removeAdditional: true,
        },
        validateResponses: {
          coerceTypes: true,
          removeAdditional: true,
        },
        ignorePaths: /.*\/api-docs.*/,
      }),
    );
  }

  private setupRoutes(): void {
    // Create todo routes with dependencies
    const todoRoutes = createTodoRoutes();

    // Swagger UI documentation
    this.app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(apiDocs, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Todo API Documentation',
        swaggerOptions: {
          persistAuthorization: true,
        },
      }),
    );

    // API routes
    this.app.use('/api/todos', todoRoutes);

    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // 404 handler for unmatched routes
    this.app.use('*', (_req: Request, res: Response) => {
      res.status(404).json({ message: 'not found' });
    });
  }

  private setupErrorHandling(): void {
    // OpenAPI validation error handler
    this.app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      if (err.status && err.status >= 400 && err.status < 500) {
        // OpenAPI validation error
        res.status(err.status).json({
          message: err.message,
          errors: err.errors || [],
        });
        return;
      }
      next(err);
    });

    // General error handling middleware
    this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error(err.stack);
      res.status(500).json({ error: 'Something went wrong!' });
    });
  }

  public async initialize(): Promise<void> {
    // Connect to database
    await this.database.connect(process.env['MONGO_URI'] || 'mongodb://localhost:27017/todoapp');

    // Setup routes after database connection
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Get the Express application instance
   */
  public getApp(): Express {
    return this.app;
  }

  /**
   * Start the server on the specified port
   */
  public async start(port: number = 3000): Promise<Server> {
    // Initialize database and routes if not already done
    if (!this.database.isConnected()) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(port, () => {
          console.log(`Server is running on port ${port}`);
          console.log(`Health check: http://localhost:${port}/health`);
          console.log(`API endpoints: http://localhost:${port}/api/todos`);
          console.log(`Swagger UI: http://localhost:${port}/api-docs`);
          resolve(this.server!);
        });

        this.server.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    const serverClosePromise = new Promise<void>((resolve, reject) => {
      if (this.server) {
        this.server.close((error) => {
          if (error) {
            reject(error);
          } else {
            console.log('Server stopped');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });

    // Disconnect from database
    await this.database.disconnect();

    // Wait for server to close
    await serverClosePromise;
  }

  /**
   * Get the server instance (if running)
   */
  public getServer(): Server | undefined {
    return this.server;
  }

  /**
   * Check if the server is running
   */
  public isRunning(): boolean {
    return !!this.server && this.server.listening;
  }

  /**
   * Get the address of the server
   * Returns the address in the format: http://<address>:<port>
   */
  public getAddress(): string | undefined {
    const addressInfo = this.server?.address() ?? '';
    const address =
      typeof addressInfo === 'string'
        ? addressInfo
        : `${addressInfo.address === '::' ? 'localhost' : addressInfo.address}:${addressInfo.port}`;

    return `http://${address}`;
  }
}
