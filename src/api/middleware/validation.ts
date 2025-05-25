import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/Logger';
import { SynapticError, ErrorCode } from '../../utils/ErrorHandler';
import { validateMemory, validateUser, validateAIInteraction } from '../../utils/Validator';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  body?: ValidationRule[];
  params?: ValidationRule[];
  query?: ValidationRule[];
}

export class ValidationMiddleware {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('ValidationMiddleware');
  }

  /**
   * Create validation middleware from schema
   */
  validate = (schema: ValidationSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const errors: string[] = [];

        // Validate body
        if (schema.body) {
          const bodyErrors = this.validateObject(req.body || {}, schema.body, 'body');
          errors.push(...bodyErrors);
        }

        // Validate params
        if (schema.params) {
          const paramErrors = this.validateObject(req.params || {}, schema.params, 'params');
          errors.push(...paramErrors);
        }

        // Validate query
        if (schema.query) {
          const queryErrors = this.validateObject(req.query || {}, schema.query, 'query');
          errors.push(...queryErrors);
        }

        if (errors.length > 0) {
          res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: errors,
            timestamp: new Date().toISOString()
          });
          return;
        }

        next();
      } catch (error) {
        this.logger.error('Validation middleware error', error);
        res.status(500).json({
          error: 'VALIDATION_MIDDLEWARE_ERROR',
          message: 'Internal validation error',
          timestamp: new Date().toISOString()
        });
      }
    };
  };

  /**
   * Validate memory creation request
   */
  validateMemoryCreation = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { content, type, category, tags, metadata } = req.body;

      const validation = validateMemory({
        content,
        type,
        category,
        tags,
        metadata
      });

      if (!validation.isValid) {
        res.status(400).json({
          error: 'MEMORY_VALIDATION_ERROR',
          message: 'Memory validation failed',
          details: validation.errors,
          timestamp: new Date().toISOString()
        });
        return;
      }

      next();
    } catch (error) {
      this.logger.error('Memory validation error', error);
      res.status(500).json({
        error: 'VALIDATION_ERROR',
        message: 'Memory validation failed',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Validate user registration request
   */
  validateUserRegistration = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { email, username, walletAddress } = req.body;

      const validation = validateUser({
        email,
        username,
        walletAddress
      });

      if (!validation.isValid) {
        res.status(400).json({
          error: 'USER_VALIDATION_ERROR',
          message: 'User validation failed',
          details: validation.errors,
          timestamp: new Date().toISOString()
        });
        return;
      }

      next();
    } catch (error) {
      this.logger.error('User validation error', error);
      res.status(500).json({
        error: 'VALIDATION_ERROR',
        message: 'User validation failed',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Validate AI interaction request
   */
  validateAIInteractionRequest = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { platform, prompt, sessionId } = req.body;

      const validation = validateAIInteraction({
        platform,
        prompt,
        sessionId
      });

      if (!validation.isValid) {
        res.status(400).json({
          error: 'AI_INTERACTION_VALIDATION_ERROR',
          message: 'AI interaction validation failed',
          details: validation.errors,
          timestamp: new Date().toISOString()
        });
        return;
      }

      next();
    } catch (error) {
      this.logger.error('AI interaction validation error', error);
      res.status(500).json({
        error: 'VALIDATION_ERROR',
        message: 'AI interaction validation failed',
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Validate object against rules
   */
  private validateObject(obj: any, rules: ValidationRule[], context: string): string[] {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = obj[rule.field];
      const fieldPath = `${context}.${rule.field}`;

      // Check required
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${fieldPath} is required`);
        continue;
      }

      // Skip validation if field is not required and empty
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      if (rule.type && !this.validateType(value, rule.type)) {
        errors.push(`${fieldPath} must be of type ${rule.type}`);
        continue;
      }

      // String validations
      if (rule.type === 'string' && typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${fieldPath} must be at least ${rule.minLength} characters long`);
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${fieldPath} must be at most ${rule.maxLength} characters long`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${fieldPath} format is invalid`);
        }
      }

      // Number validations
      if (rule.type === 'number' && typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${fieldPath} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${fieldPath} must be at most ${rule.max}`);
        }
      }

      // Enum validation
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${fieldPath} must be one of: ${rule.enum.join(', ')}`);
      }

      // Custom validation
      if (rule.custom) {
        const customResult = rule.custom(value);
        if (customResult !== true) {
          errors.push(typeof customResult === 'string' ? customResult : `${fieldPath} is invalid`);
        }
      }
    }

    return errors;
  }

  /**
   * Validate value type
   */
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }
}

// Pre-defined validation schemas
export const memoryCreationSchema: ValidationSchema = {
  body: [
    { field: 'content', required: true, type: 'string', minLength: 1, maxLength: 10000 },
    { field: 'type', required: true, type: 'string', enum: ['knowledge', 'conversation', 'insight', 'task'] },
    { field: 'category', required: true, type: 'string', enum: ['technical', 'personal', 'business', 'creative', 'other'] },
    { field: 'tags', required: false, type: 'array' },
    { field: 'metadata', required: false, type: 'object' }
  ]
};

export const memorySearchSchema: ValidationSchema = {
  query: [
    { field: 'query', required: true, type: 'string', minLength: 1, maxLength: 1000 },
    { field: 'limit', required: false, type: 'number', min: 1, max: 100 },
    { field: 'type', required: false, type: 'string', enum: ['knowledge', 'conversation', 'insight', 'task'] },
    { field: 'category', required: false, type: 'string', enum: ['technical', 'personal', 'business', 'creative', 'other'] }
  ]
};

export const aiInteractionSchema: ValidationSchema = {
  body: [
    { field: 'platform', required: true, type: 'string', enum: ['claude', 'openai', 'gemini', 'custom'] },
    { field: 'prompt', required: true, type: 'string', minLength: 1, maxLength: 10000 },
    { field: 'sessionId', required: false, type: 'string', maxLength: 100 },
    { field: 'maxMemories', required: false, type: 'number', min: 1, max: 20 }
  ]
};

export const userRegistrationSchema: ValidationSchema = {
  body: [
    { field: 'email', required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { field: 'username', required: true, type: 'string', minLength: 3, maxLength: 30, pattern: /^[a-zA-Z0-9_]+$/ },
    { field: 'walletAddress', required: false, type: 'string', minLength: 32, maxLength: 64 }
  ]
};

// Export singleton instance
export const validationMiddleware = new ValidationMiddleware(); 