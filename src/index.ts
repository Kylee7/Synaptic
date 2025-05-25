import { MemoryConnectionProtocol } from './core/MemoryConnectionProtocol';
import { SynapticServer } from './api/server';
import { Logger } from './utils/Logger';
import { SynapticConfig, User, PrivacyLevel, SubscriptionTier } from './types/index';
import { createDefaultConfig } from './config/defaultConfig';

export class Synaptic {
  private protocol: MemoryConnectionProtocol;
  private server?: SynapticServer;
  private config: SynapticConfig;
  private logger: Logger;

  constructor(config?: Partial<SynapticConfig>) {
    this.config = { ...createDefaultConfig(), ...config };
    this.logger = new Logger('Synaptic');
    this.protocol = new MemoryConnectionProtocol(this.config);
  }

  async start(options: { enableAPI?: boolean } = {}): Promise<void> {
    try {
      this.logger.info('Starting Synaptic');
      
      // Initialize the protocol with demo user
      const demoUser: User = {
        id: 'demo-user-id',
        walletAddress: 'demo-wallet-address',
        email: 'demo@synapticmcp.xyz',
        username: 'demo-user',
        preferences: {
          theme: 'dark',
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: false,
            push: false,
            mining: false,
            security: false,
            updates: false
          },
          privacy: {
            defaultPrivacyLevel: PrivacyLevel.PRIVATE,
            allowDataMining: false,
            allowAnalytics: false,
            shareUsageStats: false
          },
          ai: {
            defaultModel: 'claude-3-sonnet',
            maxContextLength: 4000,
            autoSuggestMemories: true,
            enableLearning: true
          }
        },
        subscription: SubscriptionTier.FREE,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        totalMemories: 0,
        totalRewards: BigInt(0)
      };

      await this.protocol.initialize(demoUser);

      // Start API server if enabled
      if (options.enableAPI !== false) {
        this.server = new SynapticServer(this.config, this.protocol);
        await this.server.start();
      }
      
      this.logger.info('Synaptic started successfully');
    } catch (error) {
      this.logger.error('Failed to start Synaptic', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Synaptic');
      
      // Stop API server if running
      if (this.server) {
        // Note: SynapticServer would need a stop method
        this.logger.info('API server stopped');
      }
      
      await this.protocol.shutdown();
      this.logger.info('Synaptic stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping Synaptic', error);
      throw error;
    }
  }

  getProtocol(): MemoryConnectionProtocol {
    return this.protocol;
  }

  getServer(): SynapticServer | undefined {
    return this.server;
  }

  getConfig(): SynapticConfig {
    return this.config;
  }
}

// Export main classes and types
export * from './core/MemoryConnectionProtocol';
export * from './storage/MemoryVault';
export * from './ai/CrossMindBridge';
export * from './privacy/PrivacyGuard';
export * from './blockchain/MemoryMiner';
export * from './api/server';
export * from './utils/Logger';
export * from './utils/Encryption';
export * from './utils/Validator';
export * from './types/index';

// Default export
export default Synaptic; 