import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/Logger';
import { SynapticError, ErrorCode } from '../../utils/ErrorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    walletAddress: string;
    email: string;
    username: string;
  };
}

export class AuthMiddleware {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('AuthMiddleware');
  }

  /**
   * Middleware to authenticate API requests
   */
  authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        throw new SynapticError(
          ErrorCode.AUTH_FAILED,
          'Authorization header missing',
          {},
          false,
          401
        );
      }

      const token = authHeader.replace('Bearer ', '');
      
      if (!token) {
        throw new SynapticError(
          ErrorCode.AUTH_FAILED,
          'Invalid authorization format',
          {},
          false,
          401
        );
      }

      // Mock authentication - in real implementation would verify JWT
      const user = await this.verifyToken(token);
      req.user = user;
      
      next();
    } catch (error) {
      this.logger.error('Authentication failed', error);
      
      if (error instanceof SynapticError) {
        res.status(error.statusCode).json({
          error: error.code,
          message: error.message,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(401).json({
          error: 'AUTHENTICATION_FAILED',
          message: 'Invalid authentication credentials',
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Optional authentication middleware
   */
  optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        if (token) {
          const user = await this.verifyToken(token);
          req.user = user;
        }
      }
      
      next();
    } catch (error) {
      // For optional auth, continue without user
      this.logger.debug('Optional authentication failed, continuing without user', error);
      next();
    }
  };

  /**
   * Middleware to check if user is authenticated
   */
  requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required for this endpoint',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    next();
  };

  /**
   * Mock token verification - replace with real JWT verification
   */
  private async verifyToken(token: string): Promise<any> {
    // Mock implementation - in real app would verify JWT
    if (token === 'demo-token') {
      return {
        id: 'demo-user',
        walletAddress: 'demo-wallet-address',
        email: 'demo@synapticmcp.xyz',
        username: 'demo'
      };
    }
    
    throw new SynapticError(
      ErrorCode.TOKEN_EXPIRED,
      'Invalid or expired token',
      {},
      false,
      401
    );
  }

  /**
   * Generate a mock token - replace with real JWT generation
   */
  generateToken(user: any): string {
    // Mock implementation - in real app would generate JWT
    return 'demo-token';
  }
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware(); 