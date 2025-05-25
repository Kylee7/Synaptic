import { EventEmitter } from 'events';
import {
  Memory,
  MiningReward,
  RewardReason,
  BlockchainConfig,
  WalletConnection
} from '../types/index';
import { Logger } from '../utils/Logger';

export class MemoryMiner extends EventEmitter {
  private blockchainConfig: BlockchainConfig;
  private logger: Logger;
  private walletConnection?: WalletConnection;
  private isInitialized: boolean = false;

  constructor(blockchainConfig: BlockchainConfig) {
    super();
    this.blockchainConfig = blockchainConfig;
    this.logger = new Logger('MemoryMiner');
  }

  async initialize(walletAddress: string): Promise<void> {
    try {
      this.logger.info('Initializing Memory Miner', { walletAddress });
      
      // Initialize wallet connection
      this.walletConnection = {
        address: walletAddress,
        network: this.blockchainConfig.network,
        balance: BigInt(0),
        isConnected: false
      };

      // Connect to blockchain (mock implementation)
      await this.connectToBlockchain();
      
      this.isInitialized = true;
      this.logger.info('Memory Miner initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Memory Miner', error);
      throw error;
    }
  }

  async assessQuality(memory: Memory): Promise<number> {
    try {
      let qualityScore = 0;

      // Content length factor (longer content generally more valuable)
      const lengthScore = Math.min(memory.content.length / 1000, 1) * 0.2;
      qualityScore += lengthScore;

      // Type-based scoring
      const typeScores = {
        knowledge: 0.3,
        skill: 0.25,
        project: 0.2,
        preference: 0.15,
        conversation: 0.1,
        context: 0.05,
        template: 0.2
      };
      qualityScore += typeScores[memory.type] || 0.1;

      // Category-based scoring
      const categoryScores = {
        technical: 0.25,
        professional: 0.2,
        educational: 0.2,
        creative: 0.15,
        personal: 0.1,
        social: 0.1
      };
      qualityScore += categoryScores[memory.category] || 0.1;

      // Tag diversity bonus
      const tagBonus = Math.min(memory.tags.length * 0.05, 0.2);
      qualityScore += tagBonus;

      // Normalize to 0-1 range
      qualityScore = Math.min(qualityScore, 1);

      // Update memory quality
      memory.quality = qualityScore;

      // Award tokens if quality is high enough
      if (qualityScore > 0.7) {
        await this.awardTokens(memory, RewardReason.QUALITY_CONTRIBUTION);
      }

      this.logger.debug('Assessed memory quality', {
        memoryId: memory.id,
        quality: qualityScore
      });

      return qualityScore;
    } catch (error) {
      this.logger.error('Failed to assess memory quality', error);
      return 0;
    }
  }

  async getTotalRewards(userId: string): Promise<bigint> {
    try {
      // Mock implementation - in production, query blockchain
      return BigInt(1000); // 1000 SYNA tokens
    } catch (error) {
      this.logger.error('Failed to get total rewards', error);
      return BigInt(0);
    }
  }

  async close(): Promise<void> {
    try {
      this.logger.info('Closing Memory Miner');
      
      if (this.walletConnection) {
        this.walletConnection.isConnected = false;
        this.walletConnection = undefined;
      }
      
      this.isInitialized = false;
      this.logger.info('Memory Miner closed successfully');
    } catch (error) {
      this.logger.error('Error closing Memory Miner', error);
      throw error;
    }
  }

  // Private methods

  private async connectToBlockchain(): Promise<void> {
    try {
      // Mock blockchain connection
      if (this.walletConnection) {
        this.walletConnection.isConnected = true;
        this.walletConnection.balance = BigInt(1000000); // 1M SYNA tokens
      }
      
      this.logger.info('Connected to blockchain', {
        network: this.blockchainConfig.network,
        rpcUrl: this.blockchainConfig.rpcUrl
      });
    } catch (error) {
      this.logger.error('Failed to connect to blockchain', error);
      throw error;
    }
  }

  private async awardTokens(memory: Memory, reason: RewardReason): Promise<void> {
    try {
      if (!this.walletConnection?.isConnected) {
        throw new Error('Wallet not connected');
      }

      // Calculate reward amount based on quality and reason
      let rewardAmount = BigInt(0);
      
      switch (reason) {
        case RewardReason.QUALITY_CONTRIBUTION:
          rewardAmount = BigInt(Math.floor(memory.quality * 100)); // Up to 100 SYNA
          break;
        case RewardReason.QUALITY_VALIDATION:
          rewardAmount = BigInt(50);
          break;
        case RewardReason.PATTERN_DISCOVERY:
          rewardAmount = BigInt(200);
          break;
        case RewardReason.GOVERNANCE_PARTICIPATION:
          rewardAmount = BigInt(25);
          break;
        case RewardReason.DAILY_USAGE:
          rewardAmount = BigInt(10);
          break;
      }

      if (rewardAmount > 0) {
        const reward: MiningReward = {
          userId: memory.userId,
          memoryId: memory.id,
          amount: rewardAmount,
          reason,
          timestamp: new Date(),
          transactionHash: this.generateMockTransactionHash()
        };

        // Emit reward event
        this.emit('reward_earned', reward);

        this.logger.info('Awarded tokens', {
          userId: memory.userId,
          memoryId: memory.id,
          amount: rewardAmount.toString(),
          reason
        });
      }
    } catch (error) {
      this.logger.error('Failed to award tokens', error);
    }
  }

  private generateMockTransactionHash(): string {
    // Generate a mock transaction hash
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }
} 