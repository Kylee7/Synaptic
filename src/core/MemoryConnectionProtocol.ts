import { EventEmitter } from 'events';
import {
  Memory,
  MemoryType,
  MemoryCategory,
  AIPlatform,
  AIAdapter,
  AIResponse,
  PrivacyLevel,
  SynapticEvent,
  MemoryEvent,
  User,
  SynapticConfig
} from '@types/index';
import { MemoryVault } from '@storage/MemoryVault';
import { CrossMindBridge } from '@ai/CrossMindBridge';
import { PrivacyGuard } from '@privacy/PrivacyGuard';
import { MemoryMiner } from '@blockchain/MemoryMiner';
import { Logger } from '@utils/Logger';

export class MemoryConnectionProtocol extends EventEmitter {
  private memoryVault: MemoryVault;
  private crossMindBridge: CrossMindBridge;
  private privacyGuard: PrivacyGuard;
  private memoryMiner: MemoryMiner;
  private logger: Logger;
  private config: SynapticConfig;
  private currentUser?: User;
  private isInitialized: boolean = false;

  constructor(config: SynapticConfig) {
    super();
    this.config = config;
    this.logger = new Logger('MemoryConnectionProtocol');
    
    // Initialize core modules
    this.memoryVault = new MemoryVault(config.storage, config.security);
    this.crossMindBridge = new CrossMindBridge(config.ai);
    this.privacyGuard = new PrivacyGuard(config.security);
    this.memoryMiner = new MemoryMiner(config.blockchain);

    this.setupEventHandlers();
  }

  /**
   * Initialize the MCP
   */
  async initialize(user: User): Promise<void> {
    try {
      this.logger.info('Initializing MCP', { userId: user.id });
      
      this.currentUser = user;
      
      // Initialize all modules
      await this.memoryVault.initialize(user.id);
      await this.crossMindBridge.initialize();
      await this.privacyGuard.initialize(user);
      await this.memoryMiner.initialize(user.walletAddress);

      this.isInitialized = true;
      this.emit('initialized', { userId: user.id });
      
      this.logger.info('MCP initialized successfully');
    } catch (error) {
              this.logger.error('Failed to initialize MCP', error);
      throw error;
    }
  }

  /**
   * Create a new memory entry
   */
  async createMemory(
    content: string,
    type: MemoryType,
    category: MemoryCategory,
    options: {
      tags?: string[];
      privacyLevel?: PrivacyLevel;
      aiPlatform?: AIPlatform;
      sessionId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<Memory> {
    this.ensureInitialized();
    
    try {
      // Apply privacy protection
      const protectedContent = await this.privacyGuard.protectContent(
        content,
        options.privacyLevel || this.currentUser!.preferences.privacy.defaultPrivacyLevel
      );

      // Generate embedding for semantic search
      const embedding = await this.crossMindBridge.generateEmbedding(content);

      // Create memory object
      const memory: Memory = {
        id: this.generateMemoryId(),
        userId: this.currentUser!.id,
        content: protectedContent.content,
        type,
        category,
        metadata: {
          source: 'user_input',
          aiPlatform: options.aiPlatform,
          sessionId: options.sessionId,
          privacyLevel: options.privacyLevel || this.currentUser!.preferences.privacy.defaultPrivacyLevel,
          sharePermissions: [],
          version: 1,
          childMemoryIds: [],
          ...options.metadata
        },
        embedding,
        createdAt: new Date(),
        updatedAt: new Date(),
        accessCount: 0,
        quality: 0,
        tags: options.tags || [],
        isEncrypted: protectedContent.isEncrypted,
        encryptionKey: protectedContent.encryptionKey
      };

      // Store memory
      await this.memoryVault.store(memory);

      // Emit event
      const event: MemoryEvent = {
        type: 'memory_created',
        payload: { memoryId: memory.id },
        timestamp: new Date(),
        userId: this.currentUser!.id
      };
      this.emit('memory_created', event);

      // Start quality assessment for mining
      this.memoryMiner.assessQuality(memory).catch(error => {
        this.logger.error('Failed to assess memory quality', error);
      });

      this.logger.info('Memory created successfully', { memoryId: memory.id });
      return memory;
    } catch (error) {
      this.logger.error('Failed to create memory', error);
      throw error;
    }
  }

  /**
   * Retrieve memories with semantic search
   */
  async searchMemories(
    query: string,
    options: {
      type?: MemoryType;
      category?: MemoryCategory;
      limit?: number;
      minQuality?: number;
      includeEmbedding?: boolean;
    } = {}
  ): Promise<Memory[]> {
    this.ensureInitialized();
    
    try {
      // Generate query embedding
      const queryEmbedding = await this.crossMindBridge.generateEmbedding(query);
      
      // Search memories
      const memories = await this.memoryVault.search(queryEmbedding, {
        userId: this.currentUser!.id,
        type: options.type,
        category: options.category,
        limit: options.limit || 10,
        minQuality: options.minQuality || 0
      });

      // Decrypt content if needed
      const decryptedMemories = await Promise.all(
        memories.map(async (memory) => {
          if (memory.isEncrypted) {
            const decryptedContent = await this.privacyGuard.decryptContent(
              memory.content,
              memory.encryptionKey!
            );
            return { ...memory, content: decryptedContent };
          }
          return memory;
        })
      );

      // Update access count
      await Promise.all(
        decryptedMemories.map(memory => 
          this.memoryVault.incrementAccessCount(memory.id)
        )
      );

      return options.includeEmbedding ? decryptedMemories : 
        decryptedMemories.map(m => ({ ...m, embedding: undefined }));
    } catch (error) {
      this.logger.error('Failed to search memories', error);
      throw error;
    }
  }

  /**
   * Get relevant memories for AI context injection
   */
  async getRelevantMemories(
    currentContext: string,
    aiPlatform: AIPlatform,
    maxMemories: number = 5
  ): Promise<Memory[]> {
    this.ensureInitialized();
    
    try {
      // Search for relevant memories
      const memories = await this.searchMemories(currentContext, {
        limit: maxMemories * 2, // Get more to filter
        minQuality: 0.3
      });

      // Filter by AI platform compatibility and user preferences
      const filteredMemories = memories
        .filter(memory => this.isMemoryCompatible(memory, aiPlatform))
        .slice(0, maxMemories);

      this.logger.debug('Retrieved relevant memories for AI context', {
        aiPlatform,
        memoryCount: filteredMemories.length
      });

      return filteredMemories;
    } catch (error) {
      this.logger.error('Failed to get relevant memories', error);
      return [];
    }
  }

  /**
   * Process AI interaction and extract memories
   */
  async processAIInteraction(
    platform: AIPlatform,
    userMessage: string,
    aiResponse: AIResponse,
    sessionId: string
  ): Promise<void> {
    this.ensureInitialized();
    
    try {
      // Extract valuable information from the interaction
      const extractedMemories = await this.crossMindBridge.extractMemories(
        userMessage,
        aiResponse.content,
        platform
      );

      // Create memories for extracted information
      for (const extracted of extractedMemories) {
        await this.createMemory(
          extracted.content,
          extracted.type,
          extracted.category,
          {
            tags: extracted.tags,
            aiPlatform: platform,
            sessionId,
            metadata: {
              extractedFrom: 'ai_interaction',
              originalQuery: userMessage,
              aiModel: aiResponse.model,
              confidence: extracted.confidence
            }
          }
        );
      }

      this.logger.info('Processed AI interaction', {
        platform,
        sessionId,
        extractedCount: extractedMemories.length
      });
    } catch (error) {
      this.logger.error('Failed to process AI interaction', error);
    }
  }

  /**
   * Sync memories across devices
   */
  async syncMemories(deviceId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      this.logger.info('Starting memory sync', { deviceId });
      
      // Get local changes since last sync
      const localChanges = await this.memoryVault.getChangesSince(
        await this.memoryVault.getLastSyncTime(deviceId)
      );

      // Apply privacy protection for sync
      const protectedChanges = await Promise.all(
        localChanges.map(change => this.privacyGuard.prepareForSync(change))
      );

      // Sync with other devices (implementation depends on sync strategy)
      await this.memoryVault.syncChanges(deviceId, protectedChanges);

      this.logger.info('Memory sync completed', { 
        deviceId, 
        changesCount: localChanges.length 
      });
    } catch (error) {
      this.logger.error('Failed to sync memories', error);
      throw error;
    }
  }

  /**
   * Update memory
   */
  async updateMemory(
    memoryId: string,
    updates: Partial<Memory>
  ): Promise<Memory> {
    this.ensureInitialized();
    
    try {
      const existingMemory = await this.memoryVault.get(memoryId);
      if (!existingMemory || existingMemory.userId !== this.currentUser!.id) {
        throw new Error('Memory not found or access denied');
      }

      // Apply updates
      const updatedMemory: Memory = {
        ...existingMemory,
        ...updates,
        updatedAt: new Date(),
        metadata: {
          ...existingMemory.metadata,
          version: existingMemory.metadata.version + 1
        }
      };

      // Re-generate embedding if content changed
      if (updates.content && updates.content !== existingMemory.content) {
        updatedMemory.embedding = await this.crossMindBridge.generateEmbedding(
          updates.content
        );
      }

      await this.memoryVault.update(updatedMemory);

      // Emit event
      const event: MemoryEvent = {
        type: 'memory_updated',
        payload: { memoryId, changes: updates },
        timestamp: new Date(),
        userId: this.currentUser!.id
      };
      this.emit('memory_updated', event);

      return updatedMemory;
    } catch (error) {
      this.logger.error('Failed to update memory', error);
      throw error;
    }
  }

  /**
   * Delete memory
   */
  async deleteMemory(memoryId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      const memory = await this.memoryVault.get(memoryId);
      if (!memory || memory.userId !== this.currentUser!.id) {
        throw new Error('Memory not found or access denied');
      }

      await this.memoryVault.delete(memoryId);

      // Emit event
      const event: MemoryEvent = {
        type: 'memory_deleted',
        payload: { memoryId },
        timestamp: new Date(),
        userId: this.currentUser!.id
      };
      this.emit('memory_deleted', event);

      this.logger.info('Memory deleted', { memoryId });
    } catch (error) {
      this.logger.error('Failed to delete memory', error);
      throw error;
    }
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(): Promise<{
    totalMemories: number;
    memoriesByType: Record<MemoryType, number>;
    memoriesByCategory: Record<MemoryCategory, number>;
    averageQuality: number;
    totalRewards: bigint;
  }> {
    this.ensureInitialized();
    
    try {
      const stats = await this.memoryVault.getStats(this.currentUser!.id);
      const rewards = await this.memoryMiner.getTotalRewards(this.currentUser!.id);
      
      return {
        ...stats,
        totalRewards: rewards
      };
    } catch (error) {
      this.logger.error('Failed to get memory stats', error);
      throw error;
    }
  }

  /**
   * Shutdown the protocol
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down MCP');
      
      await this.memoryVault.close();
      await this.crossMindBridge.close();
      await this.privacyGuard.close();
      await this.memoryMiner.close();
      
      this.isInitialized = false;
      this.emit('shutdown');
      
      this.logger.info('MCP shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown', error);
      throw error;
    }
  }

  // Private methods

  private setupEventHandlers(): void {
    // Handle memory vault events
    this.memoryVault.on('error', (error) => {
      this.logger.error('Memory vault error', error);
      this.emit('error', error);
    });

    // Handle AI bridge events
    this.crossMindBridge.on('error', (error) => {
      this.logger.error('Cross mind bridge error', error);
      this.emit('error', error);
    });

    // Handle mining events
    this.memoryMiner.on('reward_earned', (reward) => {
      this.emit('mining_reward', reward);
    });
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.currentUser) {
      throw new Error('MCP not initialized');
    }
  }

  private generateMemoryId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isMemoryCompatible(memory: Memory, aiPlatform: AIPlatform): boolean {
    // Check if memory is compatible with the AI platform
    // This could include checking privacy levels, content types, etc.
    const privacyLevel = memory.metadata.privacyLevel;
    
    // Don't share private memories with AI platforms
    if (privacyLevel === PrivacyLevel.PRIVATE) {
      return false;
    }

    // Check user preferences for AI platform sharing
    if (!this.currentUser?.preferences.ai.enableLearning) {
      return privacyLevel >= PrivacyLevel.SHARED;
    }

    return true;
  }
} 