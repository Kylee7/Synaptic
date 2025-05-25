import { Logger } from './Logger';

export enum ErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Memory errors
  MEMORY_NOT_FOUND = 'MEMORY_NOT_FOUND',
  MEMORY_CREATION_FAILED = 'MEMORY_CREATION_FAILED',
  MEMORY_UPDATE_FAILED = 'MEMORY_UPDATE_FAILED',
  MEMORY_DELETE_FAILED = 'MEMORY_DELETE_FAILED',
  MEMORY_SEARCH_FAILED = 'MEMORY_SEARCH_FAILED',
  
  // AI errors
  AI_PLATFORM_ERROR = 'AI_PLATFORM_ERROR',
  AI_API_ERROR = 'AI_API_ERROR',
  AI_RATE_LIMIT = 'AI_RATE_LIMIT',
  AI_INVALID_RESPONSE = 'AI_INVALID_RESPONSE',
  
  // Blockchain errors
  BLOCKCHAIN_CONNECTION_ERROR = 'BLOCKCHAIN_CONNECTION_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  WALLET_ERROR = 'WALLET_ERROR',
  TOKEN_ERROR = 'TOKEN_ERROR',
  
  // Privacy errors
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  DECRYPTION_ERROR = 'DECRYPTION_ERROR',
  PRIVACY_VIOLATION = 'PRIVACY_VIOLATION',
  
  // Storage errors
  STORAGE_ERROR = 'STORAGE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  BACKUP_ERROR = 'BACKUP_ERROR',
  
  // Authentication errors
  AUTH_FAILED = 'AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR'
}

export interface ErrorContext {
  userId?: string;
  memoryId?: string;
  sessionId?: string;
  platform?: string;
  operation?: string;
  field?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export class SynapticError extends Error {
  public readonly code: ErrorCode;
  public context: ErrorContext;
  public readonly isRetryable: boolean;
  public readonly statusCode: number;

  constructor(
    code: ErrorCode,
    message: string,
    context: ErrorContext = {},
    isRetryable: boolean = false,
    statusCode: number = 500
  ) {
    super(message);
    this.name = 'SynapticError';
    this.code = code;
    this.context = { ...context, timestamp: new Date() };
    this.isRetryable = isRetryable;
    this.statusCode = statusCode;

    // Maintain proper stack trace (if available)
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, SynapticError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      isRetryable: this.isRetryable,
      statusCode: this.statusCode,
      stack: this.stack
    };
  }
}

export class ErrorHandler {
  private static logger = new Logger('ErrorHandler');
  private static errorCounts = new Map<ErrorCode, number>();
  private static lastErrors = new Map<ErrorCode, Date>();

  /**
   * Handle and log errors with context
   */
  static handle(error: Error | SynapticError, context: ErrorContext = {}): SynapticError {
    let synapticError: SynapticError;

    if (error instanceof SynapticError) {
      synapticError = error;
      // Merge additional context
      synapticError.context = { ...synapticError.context, ...context };
    } else {
      // Convert generic error to SynapticError
      synapticError = new SynapticError(
        ErrorCode.UNKNOWN_ERROR,
        error.message || 'An unknown error occurred',
        context
      );
    }

    // Track error frequency
    this.trackError(synapticError.code);

    // Log the error
    this.logError(synapticError);

    return synapticError;
  }

  /**
   * Create memory-related errors
   */
  static createMemoryError(
    operation: string,
    message: string,
    context: ErrorContext = {}
  ): SynapticError {
    const errorCode = this.getMemoryErrorCode(operation);
    return new SynapticError(
      errorCode,
      message,
      { ...context, operation },
      false,
      400
    );
  }

  /**
   * Create AI-related errors
   */
  static createAIError(
    platform: string,
    message: string,
    context: ErrorContext = {},
    isRetryable: boolean = true
  ): SynapticError {
    return new SynapticError(
      ErrorCode.AI_PLATFORM_ERROR,
      message,
      { ...context, platform },
      isRetryable,
      502
    );
  }

  /**
   * Create validation errors
   */
  static createValidationError(
    field: string,
    message: string,
    context: ErrorContext = {}
  ): SynapticError {
    return new SynapticError(
      ErrorCode.VALIDATION_ERROR,
      `Validation failed for ${field}: ${message}`,
      { ...context, field },
      false,
      400
    );
  }

  /**
   * Create authentication errors
   */
  static createAuthError(
    message: string,
    context: ErrorContext = {}
  ): SynapticError {
    return new SynapticError(
      ErrorCode.AUTH_FAILED,
      message,
      context,
      false,
      401
    );
  }

  /**
   * Create blockchain errors
   */
  static createBlockchainError(
    message: string,
    context: ErrorContext = {},
    isRetryable: boolean = true
  ): SynapticError {
    return new SynapticError(
      ErrorCode.BLOCKCHAIN_CONNECTION_ERROR,
      message,
      context,
      isRetryable,
      503
    );
  }

  /**
   * Check if error should be retried
   */
  static shouldRetry(error: SynapticError, attemptCount: number = 0): boolean {
    if (!error.isRetryable || attemptCount >= 3) {
      return false;
    }

    // Check if we've seen this error too frequently
    const errorCount = this.errorCounts.get(error.code) || 0;
    const lastError = this.lastErrors.get(error.code);
    
    if (lastError && errorCount > 10) {
      const timeSinceLastError = Date.now() - lastError.getTime();
      if (timeSinceLastError < 60000) { // Less than 1 minute
        return false;
      }
    }

    return true;
  }

  /**
   * Get error statistics
   */
  static getErrorStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [code, count] of this.errorCounts.entries()) {
      stats[code] = {
        count,
        lastOccurrence: this.lastErrors.get(code)
      };
    }

    return stats;
  }

  /**
   * Clear error statistics
   */
  static clearStats(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }

  private static trackError(code: ErrorCode): void {
    const currentCount = this.errorCounts.get(code) || 0;
    this.errorCounts.set(code, currentCount + 1);
    this.lastErrors.set(code, new Date());
  }

  private static logError(error: SynapticError): void {
    const logData = {
      code: error.code,
      message: error.message,
      context: error.context,
      isRetryable: error.isRetryable,
      statusCode: error.statusCode
    };

    if (error.statusCode >= 500) {
      this.logger.error('System error occurred', logData);
    } else if (error.statusCode >= 400) {
      this.logger.warn('Client error occurred', logData);
    } else {
      this.logger.info('Error handled', logData);
    }
  }

  private static getMemoryErrorCode(operation: string): ErrorCode {
    switch (operation.toLowerCase()) {
      case 'create':
        return ErrorCode.MEMORY_CREATION_FAILED;
      case 'update':
        return ErrorCode.MEMORY_UPDATE_FAILED;
      case 'delete':
        return ErrorCode.MEMORY_DELETE_FAILED;
      case 'search':
        return ErrorCode.MEMORY_SEARCH_FAILED;
      default:
        return ErrorCode.MEMORY_NOT_FOUND;
    }
  }
}

/**
 * Retry decorator for async functions
 */
export function retry(maxAttempts: number = 3, delayMs: number = 1000) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError: SynapticError;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await method.apply(this, args);
        } catch (error) {
          lastError = ErrorHandler.handle(error as Error);
          
          if (attempt === maxAttempts || !ErrorHandler.shouldRetry(lastError, attempt)) {
            throw lastError;
          }

          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
      }

      throw lastError!;
    };
  };
} 