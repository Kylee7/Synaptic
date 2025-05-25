import { Logger } from './Logger';
import { SynapticError, ErrorCode } from './ErrorHandler';

export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql' | 'memory';
  path?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  maxConnections?: number;
  connectionTimeout?: number;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  fields?: string[];
}

export interface DatabaseConnection {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  execute(sql: string, params?: any[]): Promise<void>;
  transaction<T>(callback: (conn: DatabaseConnection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private logger: Logger;
  private config: DatabaseConfig;
  private connection?: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor(config: DatabaseConfig) {
    this.config = config;
    this.logger = new Logger('DatabaseManager');
  }

  static getInstance(config?: DatabaseConfig): DatabaseManager {
    if (!DatabaseManager.instance && config) {
      DatabaseManager.instance = new DatabaseManager(config);
    }
    return DatabaseManager.instance;
  }

  async connect(): Promise<void> {
    try {
      this.logger.info(`Connecting to ${this.config.type} database`);

      switch (this.config.type) {
        case 'sqlite':
          this.connection = await this.createSQLiteConnection();
          break;
        case 'postgresql':
          this.connection = await this.createPostgreSQLConnection();
          break;
        case 'memory':
          this.connection = await this.createMemoryConnection();
          break;
        default:
          throw new SynapticError(
            ErrorCode.DATABASE_ERROR,
            `Unsupported database type: ${this.config.type}`
          );
      }

      await this.initializeSchema();
      this.isConnected = true;
      this.logger.info('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw new SynapticError(
        ErrorCode.DATABASE_ERROR,
        `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.isConnected = false;
      this.logger.info('Database disconnected');
    }
  }

  getConnection(): DatabaseConnection {
    if (!this.connection || !this.isConnected) {
      throw new SynapticError(
        ErrorCode.DATABASE_ERROR,
        'Database not connected'
      );
    }
    return this.connection;
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const connection = this.getConnection();
    return await connection.query<T>(sql, params);
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    const connection = this.getConnection();
    return await connection.execute(sql, params);
  }

  async transaction<T>(callback: (conn: DatabaseConnection) => Promise<T>): Promise<T> {
    const connection = this.getConnection();
    return await connection.transaction(callback);
  }

  private async createSQLiteConnection(): Promise<DatabaseConnection> {
    // Mock SQLite connection for development
    return new MockSQLiteConnection(this.config.path || './data/synaptic.db');
  }

  private async createPostgreSQLConnection(): Promise<DatabaseConnection> {
    // Mock PostgreSQL connection for development
    return new MockPostgreSQLConnection(this.config);
  }

  private async createMemoryConnection(): Promise<DatabaseConnection> {
    // Mock in-memory connection for development
    return new MockMemoryConnection();
  }

  private async initializeSchema(): Promise<void> {
    const schema = `
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        quality_score REAL DEFAULT 0.0,
        privacy_level INTEGER DEFAULT 1,
        tags TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ai_interactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL,
        session_id TEXT,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        memory_ids TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        wallet_address TEXT UNIQUE,
        email TEXT UNIQUE,
        username TEXT UNIQUE,
        preferences TEXT,
        subscription_tier TEXT DEFAULT 'free',
        total_memories INTEGER DEFAULT 0,
        total_rewards TEXT DEFAULT '0',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
      CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
      CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_id ON ai_interactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_interactions_platform ON ai_interactions(platform);
    `;

    const statements = schema.split(';').filter(stmt => stmt.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        await this.execute(statement.trim());
      }
    }
  }
}

// Mock database connections for development
class MockSQLiteConnection implements DatabaseConnection {
  private data: Map<string, any[]> = new Map();
  private logger: Logger;

  constructor(private path: string) {
    this.logger = new Logger('MockSQLiteConnection');
    this.initializeTables();
  }

  private initializeTables(): void {
    this.data.set('memories', []);
    this.data.set('ai_interactions', []);
    this.data.set('users', []);
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    this.logger.debug(`Executing query: ${sql}`, { params });
    
    // Simple mock implementation
    if (sql.toLowerCase().includes('select')) {
      const tableName = this.extractTableName(sql);
      const rows = this.data.get(tableName) || [];
      return { rows: rows as T[], rowCount: rows.length };
    }
    
    return { rows: [], rowCount: 0 };
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    this.logger.debug(`Executing statement: ${sql}`, { params });
    
    if (sql.toLowerCase().includes('insert')) {
      const tableName = this.extractTableName(sql);
      const table = this.data.get(tableName) || [];
      // Mock insert - would need proper SQL parsing in real implementation
      table.push({ id: Date.now().toString(), ...params });
      this.data.set(tableName, table);
    }
  }

  async transaction<T>(callback: (conn: DatabaseConnection) => Promise<T>): Promise<T> {
    // Mock transaction - in real implementation would handle rollback
    return await callback(this);
  }

  async close(): Promise<void> {
    this.logger.info('SQLite connection closed');
  }

  private extractTableName(sql: string): string {
    const match = sql.match(/(?:from|into|table)\s+(\w+)/i);
    return match ? match[1] : 'unknown';
  }
}

class MockPostgreSQLConnection implements DatabaseConnection {
  private logger: Logger;

  constructor(private config: DatabaseConfig) {
    this.logger = new Logger('MockPostgreSQLConnection');
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    this.logger.debug(`PostgreSQL query: ${sql}`, { params });
    return { rows: [], rowCount: 0 };
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    this.logger.debug(`PostgreSQL execute: ${sql}`, { params });
  }

  async transaction<T>(callback: (conn: DatabaseConnection) => Promise<T>): Promise<T> {
    return await callback(this);
  }

  async close(): Promise<void> {
    this.logger.info('PostgreSQL connection closed');
  }
}

class MockMemoryConnection implements DatabaseConnection {
  private data: Map<string, any[]> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger('MockMemoryConnection');
    this.data.set('memories', []);
    this.data.set('ai_interactions', []);
    this.data.set('users', []);
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    this.logger.debug(`Memory query: ${sql}`, { params });
    return { rows: [], rowCount: 0 };
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    this.logger.debug(`Memory execute: ${sql}`, { params });
  }

  async transaction<T>(callback: (conn: DatabaseConnection) => Promise<T>): Promise<T> {
    return await callback(this);
  }

  async close(): Promise<void> {
    this.logger.info('Memory connection closed');
  }
}

export { DatabaseManager as default }; 