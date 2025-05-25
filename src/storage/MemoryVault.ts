import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  Memory,
  MemoryType,
  MemoryCategory,
  StorageConfig,
  SecurityConfig,
  EncryptionConfig
} from '../types/index';
import { Logger } from '../utils/Logger';

export interface SearchOptions {
  userId: string;
  type?: MemoryType;
  category?: MemoryCategory;
  limit?: number;
  minQuality?: number;
  minSimilarity?: number;
}

export interface MemoryStats {
  totalMemories: number;
  memoriesByType: Record<MemoryType, number>;
  memoriesByCategory: Record<MemoryCategory, number>;
  averageQuality: number;
}

export class MemoryVault extends EventEmitter {
  private storageConfig: StorageConfig;
  private securityConfig: SecurityConfig;
  private logger: Logger;
  private memories: Map<string, Memory> = new Map();
  private userMemories: Map<string, Set<string>> = new Map();
  private isInitialized: boolean = false;
  private storagePath: string;

  constructor(storageConfig: StorageConfig, securityConfig: SecurityConfig) {
    super();
    this.storageConfig = storageConfig;
    this.securityConfig = securityConfig;
    this.logger = new Logger('MemoryVault');
    this.storagePath = storageConfig.local.path;
  }

  async initialize(userId: string): Promise<void> {
    try {
      this.logger.info('Initializing Memory Vault', { userId });

      // Ensure storage directory exists
      await this.ensureStorageDirectory();

      // Load existing memories for user
      await this.loadUserMemories(userId);

      this.isInitialized = true;
      this.logger.info('Memory Vault initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Memory Vault', error);
      throw error;
    }
  }

  async store(memory: Memory): Promise<void> {
    try {
      // Validate memory
      this.validateMemory(memory);

      // Store in memory
      this.memories.set(memory.id, memory);

      // Update user index
      if (!this.userMemories.has(memory.userId)) {
        this.userMemories.set(memory.userId, new Set());
      }
      this.userMemories.get(memory.userId)!.add(memory.id);

      // Persist to disk
      await this.persistMemory(memory);

      this.logger.debug('Memory stored successfully', { memoryId: memory.id });
    } catch (error) {
      this.logger.error('Failed to store memory', error);
      throw error;
    }
  }

  async get(memoryId: string): Promise<Memory | null> {
    try {
      const memory = this.memories.get(memoryId);
      if (!memory) {
        // Try to load from disk
        const loadedMemory = await this.loadMemoryFromDisk(memoryId);
        if (loadedMemory) {
          this.memories.set(memoryId, loadedMemory);
          return loadedMemory;
        }
        return null;
      }
      return memory;
    } catch (error) {
      this.logger.error('Failed to get memory', error);
      return null;
    }
  }

  async update(memory: Memory): Promise<void> {
    try {
      this.validateMemory(memory);

      // Update in memory
      this.memories.set(memory.id, memory);

      // Persist to disk
      await this.persistMemory(memory);

      this.logger.debug('Memory updated successfully', { memoryId: memory.id });
    } catch (error) {
      this.logger.error('Failed to update memory', error);
      throw error;
    }
  }

  async delete(memoryId: string): Promise<void> {
    try {
      const memory = this.memories.get(memoryId);
      if (!memory) {
        throw new Error('Memory not found');
      }

      // Remove from memory
      this.memories.delete(memoryId);

      // Update user index
      const userMemorySet = this.userMemories.get(memory.userId);
      if (userMemorySet) {
        userMemorySet.delete(memoryId);
      }

      // Delete from disk
      await this.deleteMemoryFromDisk(memoryId);

      this.logger.debug('Memory deleted successfully', { memoryId });
    } catch (error) {
      this.logger.error('Failed to delete memory', error);
      throw error;
    }
  }

  async search(queryEmbedding: number[], options: SearchOptions): Promise<Memory[]> {
    try {
      const userMemoryIds = this.userMemories.get(options.userId) || new Set();
      const candidates: Array<{ memory: Memory; similarity: number }> = [];

      // Calculate similarities
      for (const memoryId of userMemoryIds) {
        const memory = this.memories.get(memoryId);
        if (!memory || !memory.embedding) continue;

        // Apply filters
        if (options.type && memory.type !== options.type) continue;
        if (options.category && memory.category !== options.category) continue;
        if (options.minQuality && memory.quality < options.minQuality) continue;

        // Calculate cosine similarity
        const similarity = this.calculateCosineSimilarity(queryEmbedding, memory.embedding);
        
        if (similarity >= (options.minSimilarity || 0.1)) {
          candidates.push({ memory, similarity });
        }
      }

      // Sort by similarity and limit results
      candidates.sort((a, b) => b.similarity - a.similarity);
      const limit = options.limit || 10;
      
      return candidates.slice(0, limit).map(c => c.memory);
    } catch (error) {
      this.logger.error('Failed to search memories', error);
      throw error;
    }
  }

  async incrementAccessCount(memoryId: string): Promise<void> {
    try {
      const memory = this.memories.get(memoryId);
      if (memory) {
        memory.accessCount++;
        memory.updatedAt = new Date();
        await this.persistMemory(memory);
      }
    } catch (error) {
      this.logger.error('Failed to increment access count', error);
    }
  }

  async getStats(userId: string): Promise<MemoryStats> {
    try {
      const userMemoryIds = this.userMemories.get(userId) || new Set();
      const memories = Array.from(userMemoryIds)
        .map(id => this.memories.get(id))
        .filter(Boolean) as Memory[];

      const memoriesByType: Record<MemoryType, number> = {} as any;
      const memoriesByCategory: Record<MemoryCategory, number> = {} as any;
      let totalQuality = 0;

      for (const memory of memories) {
        memoriesByType[memory.type] = (memoriesByType[memory.type] || 0) + 1;
        memoriesByCategory[memory.category] = (memoriesByCategory[memory.category] || 0) + 1;
        totalQuality += memory.quality;
      }

      return {
        totalMemories: memories.length,
        memoriesByType,
        memoriesByCategory,
        averageQuality: memories.length > 0 ? totalQuality / memories.length : 0
      };
    } catch (error) {
      this.logger.error('Failed to get memory stats', error);
      throw error;
    }
  }

  async getChangesSince(timestamp: Date): Promise<Memory[]> {
    try {
      const changes: Memory[] = [];
      for (const memory of this.memories.values()) {
        if (memory.updatedAt > timestamp) {
          changes.push(memory);
        }
      }
      return changes;
    } catch (error) {
      this.logger.error('Failed to get changes since timestamp', error);
      return [];
    }
  }

  async getLastSyncTime(deviceId: string): Promise<Date> {
    try {
      const syncFilePath = path.join(this.storagePath, 'sync', `${deviceId}.json`);
      const syncData = await fs.readFile(syncFilePath, 'utf-8');
      const parsed = JSON.parse(syncData);
      return new Date(parsed.lastSyncTime);
    } catch (error) {
      // Return epoch if no sync file exists
      return new Date(0);
    }
  }

  async syncChanges(deviceId: string, changes: Memory[]): Promise<void> {
    try {
      // Apply changes
      for (const change of changes) {
        await this.store(change);
      }

      // Update sync timestamp
      const syncFilePath = path.join(this.storagePath, 'sync', `${deviceId}.json`);
      await fs.mkdir(path.dirname(syncFilePath), { recursive: true });
      await fs.writeFile(syncFilePath, JSON.stringify({
        lastSyncTime: new Date().toISOString(),
        changesCount: changes.length
      }));

      this.logger.info('Sync changes applied', { deviceId, changesCount: changes.length });
    } catch (error) {
      this.logger.error('Failed to sync changes', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      this.logger.info('Closing Memory Vault');
      
      // Save all pending changes
      await this.saveAllMemories();
      
      // Clear memory
      this.memories.clear();
      this.userMemories.clear();
      
      this.isInitialized = false;
      this.logger.info('Memory Vault closed successfully');
    } catch (error) {
      this.logger.error('Error closing Memory Vault', error);
      throw error;
    }
  }

  // Private methods

  private async ensureStorageDirectory(): Promise<void> {
    await fs.mkdir(this.storagePath, { recursive: true });
    await fs.mkdir(path.join(this.storagePath, 'memories'), { recursive: true });
    await fs.mkdir(path.join(this.storagePath, 'sync'), { recursive: true });
  }

  private async loadUserMemories(userId: string): Promise<void> {
    try {
      const userDir = path.join(this.storagePath, 'memories', userId);
      
      try {
        const files = await fs.readdir(userDir);
        const memoryIds = new Set<string>();

        for (const file of files) {
          if (file.endsWith('.json')) {
            const memoryId = file.replace('.json', '');
            const memory = await this.loadMemoryFromDisk(memoryId);
            if (memory) {
              this.memories.set(memoryId, memory);
              memoryIds.add(memoryId);
            }
          }
        }

        this.userMemories.set(userId, memoryIds);
        this.logger.info('Loaded user memories', { userId, count: memoryIds.size });
      } catch (error) {
        // User directory doesn't exist yet
        this.userMemories.set(userId, new Set());
      }
    } catch (error) {
      this.logger.error('Failed to load user memories', error);
      throw error;
    }
  }

  private async loadMemoryFromDisk(memoryId: string): Promise<Memory | null> {
    try {
      // Find the memory file across all user directories
      const memoriesDir = path.join(this.storagePath, 'memories');
      const userDirs = await fs.readdir(memoriesDir);

      for (const userDir of userDirs) {
        const memoryPath = path.join(memoriesDir, userDir, `${memoryId}.json`);
        try {
          const data = await fs.readFile(memoryPath, 'utf-8');
          const memory = JSON.parse(data) as Memory;
          
          // Convert date strings back to Date objects
          memory.createdAt = new Date(memory.createdAt);
          memory.updatedAt = new Date(memory.updatedAt);
          
          return memory;
        } catch (error) {
          // File doesn't exist in this user directory, continue
          continue;
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to load memory from disk', error);
      return null;
    }
  }

  private async persistMemory(memory: Memory): Promise<void> {
    try {
      const userDir = path.join(this.storagePath, 'memories', memory.userId);
      await fs.mkdir(userDir, { recursive: true });
      
      const memoryPath = path.join(userDir, `${memory.id}.json`);
      await fs.writeFile(memoryPath, JSON.stringify(memory, null, 2));
    } catch (error) {
      this.logger.error('Failed to persist memory', error);
      throw error;
    }
  }

  private async deleteMemoryFromDisk(memoryId: string): Promise<void> {
    try {
      const memory = this.memories.get(memoryId);
      if (memory) {
        const memoryPath = path.join(this.storagePath, 'memories', memory.userId, `${memoryId}.json`);
        await fs.unlink(memoryPath);
      }
    } catch (error) {
      this.logger.error('Failed to delete memory from disk', error);
    }
  }

  private async saveAllMemories(): Promise<void> {
    try {
      const savePromises = Array.from(this.memories.values()).map(memory => 
        this.persistMemory(memory)
      );
      await Promise.all(savePromises);
    } catch (error) {
      this.logger.error('Failed to save all memories', error);
    }
  }

  private validateMemory(memory: Memory): void {
    if (!memory.id || !memory.userId || !memory.content) {
      throw new Error('Invalid memory: missing required fields');
    }
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
} 