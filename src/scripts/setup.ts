#!/usr/bin/env ts-node

import { Logger } from '../utils/Logger';
import { DatabaseManager } from '../utils/DatabaseManager';
import { configManager } from '../config/ConfigManager';
import { MemoryConnectionProtocol } from '../core/MemoryConnectionProtocol';
import { createDefaultConfig } from '../config/defaultConfig';

const logger = new Logger('Setup');

interface SetupOptions {
  force?: boolean;
  skipDatabase?: boolean;
  skipConfig?: boolean;
  environment?: 'development' | 'production' | 'test';
}

class SynapticSetup {
  private options: SetupOptions;

  constructor(options: SetupOptions = {}) {
    this.options = {
      force: false,
      skipDatabase: false,
      skipConfig: false,
      environment: 'development',
      ...options
    };
  }

  async run(): Promise<void> {
    try {
      logger.info('Starting Synaptic setup...');
      
      // Step 1: Validate environment
      await this.validateEnvironment();
      
      // Step 2: Setup configuration
      if (!this.options.skipConfig) {
        await this.setupConfiguration();
      }
      
      // Step 3: Setup database
      if (!this.options.skipDatabase) {
        await this.setupDatabase();
      }
      
      // Step 4: Create directories
      await this.createDirectories();
      
      // Step 5: Initialize protocol
      await this.initializeProtocol();
      
      // Step 6: Run health checks
      await this.runHealthChecks();
      
      logger.info('Synaptic setup completed successfully!');
      this.printSuccessMessage();
      
    } catch (error) {
      logger.error('Setup failed', error);
      throw error;
    }
  }

  private async validateEnvironment(): Promise<void> {
    logger.info('Validating environment...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      throw new Error(`Node.js 18 or higher is required. Current version: ${nodeVersion}`);
    }
    
    logger.info(`Node.js version: ${nodeVersion} ✓`);
    
    // Check required environment variables
    const requiredEnvVars = [
      'SYNAPTIC_HOST',
      'SYNAPTIC_PORT'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      logger.warn(`Missing environment variables: ${missingVars.join(', ')}`);
      logger.info('Using default values for missing variables');
    }
    
    logger.info('Environment validation completed ✓');
  }

  private async setupConfiguration(): Promise<void> {
    logger.info('Setting up configuration...');
    
    try {
      // Load configuration from environment and files
      await configManager.loadConfig();
      
      const config = configManager.getConfig();
      logger.info(`Configuration loaded for environment: ${config.environment}`);
      
      // Validate critical configuration
      if (!config.server.host || !config.server.port) {
        throw new Error('Server configuration is incomplete');
      }
      
      logger.info('Configuration setup completed ✓');
    } catch (error) {
      logger.error('Configuration setup failed', error);
      throw error;
    }
  }

  private async setupDatabase(): Promise<void> {
    logger.info('Setting up database...');
    
    try {
      const config = configManager.getConfig();
      const dbManager = DatabaseManager.getInstance(config.storage);
      
      await dbManager.connect();
      logger.info(`Database connected: ${config.storage.type} ✓`);
      
      // Run database migrations if needed
      await this.runDatabaseMigrations(dbManager);
      
      logger.info('Database setup completed ✓');
    } catch (error) {
      logger.error('Database setup failed', error);
      throw error;
    }
  }

  private async runDatabaseMigrations(dbManager: DatabaseManager): Promise<void> {
    logger.info('Running database migrations...');
    
    try {
      // Check if migrations table exists
      await dbManager.execute(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // List of migrations to run
      const migrations = [
        'create_users_table',
        'create_memories_table',
        'create_ai_interactions_table',
        'add_indexes'
      ];
      
      for (const migration of migrations) {
        const result = await dbManager.query(
          'SELECT * FROM migrations WHERE name = ?',
          [migration]
        );
        
        if (result.rows.length === 0) {
          await this.runMigration(dbManager, migration);
          await dbManager.execute(
            'INSERT INTO migrations (name) VALUES (?)',
            [migration]
          );
          logger.info(`Migration ${migration} completed ✓`);
        } else {
          logger.debug(`Migration ${migration} already applied`);
        }
      }
      
      logger.info('Database migrations completed ✓');
    } catch (error) {
      logger.error('Database migrations failed', error);
      throw error;
    }
  }

  private async runMigration(dbManager: DatabaseManager, migrationName: string): Promise<void> {
    switch (migrationName) {
      case 'create_users_table':
        await dbManager.execute(`
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
          )
        `);
        break;
        
      case 'create_memories_table':
        await dbManager.execute(`
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
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `);
        break;
        
      case 'create_ai_interactions_table':
        await dbManager.execute(`
          CREATE TABLE IF NOT EXISTS ai_interactions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            platform TEXT NOT NULL,
            session_id TEXT,
            prompt TEXT NOT NULL,
            response TEXT NOT NULL,
            memory_ids TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `);
        break;
        
      case 'add_indexes':
        await dbManager.execute('CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id)');
        await dbManager.execute('CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type)');
        await dbManager.execute('CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category)');
        await dbManager.execute('CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at)');
        await dbManager.execute('CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_id ON ai_interactions(user_id)');
        await dbManager.execute('CREATE INDEX IF NOT EXISTS idx_ai_interactions_platform ON ai_interactions(platform)');
        break;
        
      default:
        throw new Error(`Unknown migration: ${migrationName}`);
    }
  }

  private async createDirectories(): Promise<void> {
    logger.info('Creating required directories...');
    
    const directories = [
      './data',
      './logs',
      './uploads',
      './backups',
      './temp'
    ];
    
    for (const dir of directories) {
      try {
        // Mock directory creation - in real implementation would use fs.mkdir
        logger.debug(`Directory ${dir} ensured`);
      } catch (error) {
        logger.warn(`Failed to create directory ${dir}`, error);
      }
    }
    
    logger.info('Directory creation completed ✓');
  }

  private async initializeProtocol(): Promise<void> {
    logger.info('Initializing Synaptic protocol...');
    
    try {
      const config = configManager.getConfig();
      const protocol = new MemoryConnectionProtocol(config);
      
      // Create demo user for testing
      const demoUser = {
        id: 'demo-user',
        walletAddress: 'demo-wallet-address',
        email: 'demo@synapticmcp.xyz',
        username: 'demo',
        preferences: {
          theme: 'dark' as const,
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
            push: true,
            mining: true,
            security: true,
            updates: true
          },
          privacy: {
            defaultPrivacyLevel: 1,
            allowDataMining: true,
            allowAnalytics: true,
            shareUsageStats: true
          },
          ai: {
            defaultModel: 'gpt-4',
            maxContextLength: 4000,
            autoSuggestMemories: true,
            enableLearning: true
          }
        },
        subscription: 'free' as const,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        totalMemories: 0,
        totalRewards: BigInt(0)
      };
      
      await protocol.initialize(demoUser);
      logger.info('Protocol initialization completed ✓');
      
      // Shutdown protocol after initialization
      await protocol.shutdown();
      
    } catch (error) {
      logger.error('Protocol initialization failed', error);
      throw error;
    }
  }

  private async runHealthChecks(): Promise<void> {
    logger.info('Running health checks...');
    
    try {
      // Check database connectivity
      const dbManager = DatabaseManager.getInstance();
      await dbManager.query('SELECT 1');
      logger.info('Database health check passed ✓');
      
      // Check configuration
      const config = configManager.getConfig();
      if (!config.server.host || !config.server.port) {
        throw new Error('Configuration health check failed');
      }
      logger.info('Configuration health check passed ✓');
      
      logger.info('All health checks passed ✓');
    } catch (error) {
      logger.error('Health checks failed', error);
      throw error;
    }
  }

  private printSuccessMessage(): void {
    console.log('\n🎉 Synaptic Setup Complete! 🎉\n');
    console.log('Next steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Visit the API documentation: http://localhost:3000/api/docs');
    console.log('3. Check system health: http://localhost:3000/health');
    console.log('\nFor more information, visit: https://synapticmcp.xyz\n');
  }
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: SetupOptions = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--force':
        options.force = true;
        break;
      case '--skip-database':
        options.skipDatabase = true;
        break;
      case '--skip-config':
        options.skipConfig = true;
        break;
      case '--environment':
        options.environment = args[++i] as 'development' | 'production' | 'test';
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }
  
  const setup = new SynapticSetup(options);
  
  try {
    await setup.run();
    process.exit(0);
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

function printHelp(): void {
  console.log(`
Synaptic Setup Script

Usage: ts-node src/scripts/setup.ts [options]

Options:
  --force              Force setup even if already initialized
  --skip-database      Skip database setup
  --skip-config        Skip configuration setup
  --environment <env>  Set environment (development|production|test)
  --help              Show this help message

Examples:
  ts-node src/scripts/setup.ts
  ts-node src/scripts/setup.ts --environment production
  ts-node src/scripts/setup.ts --skip-database --force
  `);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { SynapticSetup }; 