import { Logger } from './Logger';
import { performanceMonitor } from './PerformanceMonitor';

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  ttl?: number;
  tags?: string[];
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry?: number;
  newestEntry?: number;
}

export class CacheManager<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private logger: Logger;
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private stats = {
    hits: 0,
    misses: 0
  };

  constructor(
    maxSize: number = 1000,
    defaultTTL: number = 3600000, // 1 hour in milliseconds
    cleanupIntervalMs: number = 300000 // 5 minutes
  ) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.logger = new Logger('CacheManager');
    
    // Start cleanup interval
    this.startCleanup(cleanupIntervalMs);
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number, tags?: string[]): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
      ttl: ttl || this.defaultTTL,
      tags
    };

    this.cache.set(key, entry);
    this.logger.debug(`Cache entry set: ${key}`, { tags, ttl });
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache entry deleted: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.logger.info('Cache cleared');
  }

  /**
   * Get or set value with a factory function
   */
  async getOrSet<U extends T>(
    key: string,
    factory: () => Promise<U> | U,
    ttl?: number,
    tags?: string[]
  ): Promise<U> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached as U;
    }

    const timerId = performanceMonitor.startTimer(`cache.factory.${key}`);
    try {
      const value = await factory();
      this.set(key, value, ttl, tags);
      performanceMonitor.endTimer(timerId);
      return value;
    } catch (error) {
      performanceMonitor.endTimer(timerId);
      throw error;
    }
  }

  /**
   * Get multiple values from cache
   */
  getMultiple(keys: string[]): Map<string, T> {
    const results = new Map<string, T>();
    
    for (const key of keys) {
      const value = this.get(key);
      if (value !== null) {
        results.set(key, value);
      }
    }
    
    return results;
  }

  /**
   * Set multiple values in cache
   */
  setMultiple(entries: Array<{ key: string; value: T; ttl?: number; tags?: string[] }>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.value, entry.ttl, entry.tags);
    }
  }

  /**
   * Delete entries by tag
   */
  deleteByTag(tag: string): number {
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.includes(tag)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    this.logger.debug(`Deleted ${deletedCount} entries with tag: ${tag}`);
    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.createdAt)) : undefined,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.createdAt)) : undefined
    };
  }

  /**
   * Get all keys in cache
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get entries by tag
   */
  getByTag(tag: string): Array<CacheEntry<T>> {
    const results: Array<CacheEntry<T>> = [];
    
    for (const entry of this.cache.values()) {
      if (entry.tags && entry.tags.includes(tag)) {
        results.push(entry);
      }
    }
    
    return results;
  }

  /**
   * Refresh TTL for a key
   */
  refreshTTL(key: string, newTTL?: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    entry.ttl = newTTL || this.defaultTTL;
    entry.createdAt = Date.now(); // Reset creation time
    return true;
  }

  /**
   * Get cache size in bytes (estimated)
   */
  private estimateMemoryUsage(): number {
    let size = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimation
      size += key.length * 2; // UTF-16 characters
      size += JSON.stringify(entry.value).length * 2;
      size += 100; // Overhead for entry metadata
    }
    
    return size;
  }

  /**
   * Check if entry has expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.createdAt > entry.ttl;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.debug(`Evicted LRU entry: ${oldestKey}`);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const beforeSize = this.cache.size;
    let expiredCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      this.logger.debug(`Cleaned up ${expiredCount} expired entries`);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Specialized cache managers for different data types
export class MemoryCacheManager extends CacheManager<any> {
  constructor() {
    super(500, 1800000); // 500 entries, 30 minutes TTL
  }
}

export class AIResponseCacheManager extends CacheManager<any> {
  constructor() {
    super(200, 3600000); // 200 entries, 1 hour TTL
  }

  /**
   * Generate cache key for AI responses
   */
  generateAIKey(platform: string, prompt: string, model?: string): string {
    const hash = this.simpleHash(prompt);
    return `ai:${platform}:${model || 'default'}:${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

export class EmbeddingCacheManager extends CacheManager<number[]> {
  constructor() {
    super(1000, 7200000); // 1000 entries, 2 hours TTL
  }

  /**
   * Generate cache key for embeddings
   */
  generateEmbeddingKey(text: string, model?: string): string {
    const hash = this.simpleHash(text);
    return `embedding:${model || 'default'}:${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// Export singleton instances
export const memoryCache = new MemoryCacheManager();
export const aiResponseCache = new AIResponseCacheManager();
export const embeddingCache = new EmbeddingCacheManager(); 