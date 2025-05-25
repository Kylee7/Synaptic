import { Memory, MemoryType, MemoryCategory, PrivacyLevel, User } from '../types/index';
import { Logger } from './Logger';

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class Validator {
  private static logger = new Logger('Validator');

  /**
   * Validate memory object
   */
  static validateMemory(memory: Partial<Memory>): void {
    if (!memory.content || typeof memory.content !== 'string') {
      throw new ValidationError('Memory content is required and must be a string', 'content');
    }

    if (memory.content.length > 10000) {
      throw new ValidationError('Memory content exceeds maximum length of 10000 characters', 'content');
    }

    if (!memory.type || !Object.values(MemoryType).includes(memory.type)) {
      throw new ValidationError('Valid memory type is required', 'type');
    }

    if (!memory.category || !Object.values(MemoryCategory).includes(memory.category)) {
      throw new ValidationError('Valid memory category is required', 'category');
    }

    if (memory.tags && !Array.isArray(memory.tags)) {
      throw new ValidationError('Tags must be an array', 'tags');
    }

    if (memory.tags && memory.tags.length > 20) {
      throw new ValidationError('Maximum 20 tags allowed', 'tags');
    }

    if (memory.metadata?.privacyLevel !== undefined && 
        !Object.values(PrivacyLevel).includes(memory.metadata.privacyLevel)) {
      throw new ValidationError('Valid privacy level is required', 'privacyLevel');
    }
  }

  /**
   * Validate user object
   */
  static validateUser(user: Partial<User>): void {
    if (!user.walletAddress || typeof user.walletAddress !== 'string') {
      throw new ValidationError('Wallet address is required', 'walletAddress');
    }

    if (user.email && !this.isValidEmail(user.email)) {
      throw new ValidationError('Invalid email format', 'email');
    }

    if (user.username && (user.username.length < 3 || user.username.length > 30)) {
      throw new ValidationError('Username must be between 3 and 30 characters', 'username');
    }
  }

  /**
   * Validate search query
   */
  static validateSearchQuery(query: string, options?: any): void {
    if (!query || typeof query !== 'string') {
      throw new ValidationError('Search query is required and must be a string', 'query');
    }

    if (query.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters long', 'query');
    }

    if (query.length > 500) {
      throw new ValidationError('Search query exceeds maximum length of 500 characters', 'query');
    }

    if (options?.limit && (options.limit < 1 || options.limit > 100)) {
      throw new ValidationError('Limit must be between 1 and 100', 'limit');
    }
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate wallet address format (basic validation)
   */
  static isValidWalletAddress(address: string): boolean {
    // Basic validation for Solana wallet address
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  }

  /**
   * Validate API key format
   */
  static isValidAPIKey(apiKey: string): boolean {
    return typeof apiKey === 'string' && apiKey.length >= 10 && apiKey.length <= 200;
  }

  /**
   * Validate memory ID format
   */
  static isValidMemoryId(id: string): boolean {
    return /^mem_\d+_[a-z0-9]{9}$/.test(id);
  }

  /**
   * Validate session ID format
   */
  static isValidSessionId(sessionId: string): boolean {
    return typeof sessionId === 'string' && sessionId.length >= 10 && sessionId.length <= 100;
  }

  /**
   * Validate privacy level
   */
  static isValidPrivacyLevel(level: any): level is PrivacyLevel {
    return Object.values(PrivacyLevel).includes(level);
  }

  /**
   * Validate memory type
   */
  static isValidMemoryType(type: any): type is MemoryType {
    return Object.values(MemoryType).includes(type);
  }

  /**
   * Validate memory category
   */
  static isValidMemoryCategory(category: any): category is MemoryCategory {
    return Object.values(MemoryCategory).includes(category);
  }

  /**
   * Validate and sanitize tags array
   */
  static validateAndSanitizeTags(tags: any[]): string[] {
    if (!Array.isArray(tags)) {
      return [];
    }

    return tags
      .filter(tag => typeof tag === 'string')
      .map(tag => this.sanitizeString(tag))
      .filter(tag => tag.length > 0 && tag.length <= 50)
      .slice(0, 20); // Maximum 20 tags
  }
} 