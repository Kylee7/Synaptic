import * as crypto from 'crypto';
import { EncryptionConfig } from '../types/index';
import { Logger } from './Logger';

export interface EncryptionResult {
  encrypted: string;
  iv: string;
  authTag: string;
}

export interface DecryptionInput {
  encrypted: string;
  iv: string;
  authTag: string;
}

export class EncryptionManager {
  private config: EncryptionConfig;
  private logger: Logger;

  constructor(config: EncryptionConfig) {
    this.config = config;
    this.logger = new Logger('EncryptionManager');
  }

  /**
   * Generate a cryptographically secure random key
   */
  generateKey(length: number = 32): Buffer {
    return crypto.randomBytes(length);
  }

  /**
   * Derive a key from a password using PBKDF2
   */
  async deriveKey(password: string, salt: Buffer, iterations?: number): Promise<Buffer> {
    const iterationCount = iterations || this.config.iterations;
    
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterationCount, 32, 'sha256', (err, derivedKey) => {
        if (err) {
          this.logger.error('Key derivation failed', err);
          reject(err);
        } else {
          resolve(derivedKey);
        }
      });
    });
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data: string, key: Buffer): EncryptionResult {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-gcm', key);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(input: DecryptionInput, key: Buffer): string {
    try {
      const decipher = crypto.createDecipher('aes-256-gcm', key);
      decipher.setAuthTag(Buffer.from(input.authTag, 'hex'));
      
      let decrypted = decipher.update(input.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate a secure hash of data
   */
  hash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Generate HMAC for data integrity
   */
  generateHMAC(data: string, key: Buffer, algorithm: string = 'sha256'): string {
    return crypto.createHmac(algorithm, key).update(data).digest('hex');
  }

  /**
   * Verify HMAC
   */
  verifyHMAC(data: string, hmac: string, key: Buffer, algorithm: string = 'sha256'): boolean {
    const expectedHmac = this.generateHMAC(data, key, algorithm);
    return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'));
  }

  /**
   * Generate a secure random salt
   */
  generateSalt(length?: number): Buffer {
    return crypto.randomBytes(length || this.config.saltLength);
  }
} 