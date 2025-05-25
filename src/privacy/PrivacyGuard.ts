import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  PrivacyLevel,
  SecurityConfig,
  User,
  Memory,
  DifferentialPrivacyConfig
} from '../types/index';
import { Logger } from '../utils/Logger';

export interface ProtectedContent {
  content: string;
  isEncrypted: boolean;
  encryptionKey?: string;
}

export class PrivacyGuard extends EventEmitter {
  private securityConfig: SecurityConfig;
  private logger: Logger;
  private currentUser?: User;
  private masterKey?: Buffer;

  constructor(securityConfig: SecurityConfig) {
    super();
    this.securityConfig = securityConfig;
    this.logger = new Logger('PrivacyGuard');
  }

  async initialize(user: User): Promise<void> {
    try {
      this.logger.info('Initializing Privacy Guard', { userId: user.id });
      
      this.currentUser = user;
      
      // Generate or derive master key for user
      this.masterKey = await this.deriveMasterKey(user.walletAddress);
      
      this.logger.info('Privacy Guard initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Privacy Guard', error);
      throw error;
    }
  }

  async protectContent(content: string, privacyLevel: PrivacyLevel): Promise<ProtectedContent> {
    try {
      switch (privacyLevel) {
        case PrivacyLevel.PRIVATE:
          return await this.encryptContent(content);
        
        case PrivacyLevel.ANONYMIZED:
          return {
            content: await this.anonymizeContent(content),
            isEncrypted: false
          };
        
        case PrivacyLevel.SHARED:
        case PrivacyLevel.PUBLIC:
          return {
            content: content,
            isEncrypted: false
          };
        
        default:
          throw new Error(`Unknown privacy level: ${privacyLevel}`);
      }
    } catch (error) {
      this.logger.error('Failed to protect content', error);
      throw error;
    }
  }

  async decryptContent(encryptedContent: string, encryptionKey: string): Promise<string> {
    try {
      if (!this.masterKey) {
        throw new Error('Privacy Guard not initialized');
      }

      // Decode the encryption key
      const keyBuffer = Buffer.from(encryptionKey, 'base64');
      
      // Decrypt the content key with master key
      const decipher = crypto.createDecipher('aes-256-gcm', this.masterKey);
      let contentKey = decipher.update(keyBuffer, undefined, 'utf8');
      contentKey += decipher.final('utf8');

      // Decrypt the actual content
      const contentDecipher = crypto.createDecipher('aes-256-gcm', Buffer.from(contentKey, 'base64'));
      let decrypted = contentDecipher.update(encryptedContent, 'base64', 'utf8');
      decrypted += contentDecipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt content', error);
      throw error;
    }
  }

  async prepareForSync(memory: Memory): Promise<Memory> {
    try {
      // Apply additional privacy protection for sync
      const syncMemory = { ...memory };
      
      if (memory.metadata.privacyLevel === PrivacyLevel.PRIVATE) {
        // Don't sync private memories
        throw new Error('Private memories cannot be synced');
      }
      
      if (memory.metadata.privacyLevel === PrivacyLevel.ANONYMIZED) {
        // Apply differential privacy
        syncMemory.content = await this.applyDifferentialPrivacy(memory.content);
      }

      return syncMemory;
    } catch (error) {
      this.logger.error('Failed to prepare memory for sync', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      this.logger.info('Closing Privacy Guard');
      
      // Clear sensitive data
      if (this.masterKey) {
        this.masterKey.fill(0);
        this.masterKey = undefined;
      }
      
      this.currentUser = undefined;
      
      this.logger.info('Privacy Guard closed successfully');
    } catch (error) {
      this.logger.error('Error closing Privacy Guard', error);
      throw error;
    }
  }

  // Private methods

  private async deriveMasterKey(walletAddress: string): Promise<Buffer> {
    try {
      // Use PBKDF2 to derive a master key from wallet address
      const salt = Buffer.from('synaptic-salt', 'utf8');
      const iterations = this.securityConfig.encryption.iterations;
      
      return new Promise((resolve, reject) => {
        crypto.pbkdf2(walletAddress, salt, iterations, 32, 'sha256', (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        });
      });
    } catch (error) {
      this.logger.error('Failed to derive master key', error);
      throw error;
    }
  }

  private async encryptContent(content: string): Promise<ProtectedContent> {
    try {
      if (!this.masterKey) {
        throw new Error('Master key not available');
      }

      // Generate a random content key
      const contentKey = crypto.randomBytes(32);
      
      // Encrypt the content with the content key
      const cipher = crypto.createCipher('aes-256-gcm', contentKey);
      let encrypted = cipher.update(content, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Encrypt the content key with the master key
      const keyCipher = crypto.createCipher('aes-256-gcm', this.masterKey);
      let encryptedKey = keyCipher.update(contentKey.toString('base64'), 'utf8', 'base64');
      encryptedKey += keyCipher.final('base64');

      return {
        content: encrypted,
        isEncrypted: true,
        encryptionKey: encryptedKey
      };
    } catch (error) {
      this.logger.error('Failed to encrypt content', error);
      throw error;
    }
  }

  private async anonymizeContent(content: string): Promise<string> {
    try {
      let anonymized = content;

      // Remove or replace personally identifiable information
      const patterns = [
        // Email addresses
        { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
        // Phone numbers
        { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
        // Credit card numbers
        { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CARD]' },
        // Social security numbers
        { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
        // IP addresses
        { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[IP]' },
        // Names (simple pattern)
        { pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, replacement: '[NAME]' }
      ];

      for (const { pattern, replacement } of patterns) {
        anonymized = anonymized.replace(pattern, replacement);
      }

      return anonymized;
    } catch (error) {
      this.logger.error('Failed to anonymize content', error);
      throw error;
    }
  }

  private async applyDifferentialPrivacy(content: string): Promise<string> {
    try {
      // Simple differential privacy implementation
      // In production, use more sophisticated techniques
      
      const config: DifferentialPrivacyConfig = {
        epsilon: 1.0,
        delta: 1e-5,
        sensitivity: 1.0,
        mechanism: 'laplace'
      };

      // Add Laplace noise to numerical values
      const words = content.split(' ');
      const noisyWords = words.map(word => {
        // If word is a number, add noise
        if (/^\d+(\.\d+)?$/.test(word)) {
          const number = parseFloat(word);
          const noise = this.generateLaplaceNoise(config.sensitivity / config.epsilon);
          return Math.max(0, number + noise).toString();
        }
        return word;
      });

      return noisyWords.join(' ');
    } catch (error) {
      this.logger.error('Failed to apply differential privacy', error);
      throw error;
    }
  }

  private generateLaplaceNoise(scale: number): number {
    // Generate Laplace noise using inverse transform sampling
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
} 