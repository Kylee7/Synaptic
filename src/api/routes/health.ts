import { Router, Request, Response } from 'express';
import { MemoryConnectionProtocol } from '../../core/MemoryConnectionProtocol';
import { Logger } from '../../utils/Logger';
import { performanceMonitor } from '../../utils/PerformanceMonitor';
import { ErrorHandler } from '../../utils/ErrorHandler';

const logger = new Logger('HealthRoutes');

export function healthRoutes(protocol: MemoryConnectionProtocol): Router {
  const router = Router();

  // Basic health check
  router.get('/', async (req: Request, res: Response) => {
    try {
      const startTime = Date.now();
      
      // Check system components
      const checks = await Promise.allSettled([
        checkDatabase(),
        checkMemoryVault(),
        checkAIBridge(),
        checkBlockchain()
      ]);

      const responseTime = Date.now() - startTime;
      const allHealthy = checks.every(check => check.status === 'fulfilled');

      const healthStatus = {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        version: '1.0.0',
        uptime: process.uptime ? `${Math.floor(process.uptime())}s` : 'unknown',
        checks: {
          database: checks[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
          memoryVault: checks[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
          aiBridge: checks[2].status === 'fulfilled' ? 'healthy' : 'unhealthy',
          blockchain: checks[3].status === 'fulfilled' ? 'healthy' : 'unhealthy'
        }
      };

      const statusCode = allHealthy ? 200 : 503;
      res.status(statusCode).json(healthStatus);
    } catch (error) {
      logger.error('Health check failed', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  });

  // Detailed system metrics
  router.get('/metrics', async (req: Request, res: Response) => {
    try {
      const metrics = performanceMonitor.exportMetrics();
      const errorStats = ErrorHandler.getErrorStats();

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          performance: metrics,
          errors: errorStats,
          memory: getMemoryUsage(),
          system: getSystemInfo()
        }
      });
    } catch (error) {
      logger.error('Failed to get metrics', error);
      res.status(500).json({
        error: 'METRICS_ERROR',
        message: 'Failed to retrieve system metrics'
      });
    }
  });

  // Performance statistics
  router.get('/performance', async (req: Request, res: Response) => {
    try {
      const performanceStats = performanceMonitor.getPerformanceStats();
      const systemMetrics = performanceMonitor.getSystemMetrics();
      const slowOperations = performanceMonitor.getSlowOperations();

      res.json({
        success: true,
        data: {
          statistics: performanceStats,
          systemMetrics,
          slowOperations: slowOperations.slice(0, 10) // Last 10 slow operations
        }
      });
    } catch (error) {
      logger.error('Failed to get performance data', error);
      res.status(500).json({
        error: 'PERFORMANCE_ERROR',
        message: 'Failed to retrieve performance data'
      });
    }
  });

  // Error statistics
  router.get('/errors', async (req: Request, res: Response) => {
    try {
      const errorStats = ErrorHandler.getErrorStats();

      res.json({
        success: true,
        data: errorStats
      });
    } catch (error) {
      logger.error('Failed to get error stats', error);
      res.status(500).json({
        error: 'ERROR_STATS_ERROR',
        message: 'Failed to retrieve error statistics'
      });
    }
  });

  // Clear error statistics (admin only)
  router.delete('/errors', async (req: Request, res: Response) => {
    try {
      ErrorHandler.clearStats();
      res.json({
        success: true,
        message: 'Error statistics cleared'
      });
    } catch (error) {
      logger.error('Failed to clear error stats', error);
      res.status(500).json({
        error: 'CLEAR_STATS_ERROR',
        message: 'Failed to clear error statistics'
      });
    }
  });

  // System information
  router.get('/system', async (req: Request, res: Response) => {
    try {
      const systemInfo = {
        platform: process.platform || 'unknown',
        nodeVersion: process.version || 'unknown',
        architecture: process.arch || 'unknown',
        uptime: process.uptime ? `${Math.floor(process.uptime())}s` : 'unknown',
        memory: getMemoryUsage(),
        environment: process.env.NODE_ENV || 'unknown',
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: systemInfo
      });
    } catch (error) {
      logger.error('Failed to get system info', error);
      res.status(500).json({
        error: 'SYSTEM_INFO_ERROR',
        message: 'Failed to retrieve system information'
      });
    }
  });

  // Readiness probe (for Kubernetes)
  router.get('/ready', async (req: Request, res: Response) => {
    try {
      // Check if all critical services are ready
      const isReady = await checkSystemReadiness();
      
      if (isReady) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Readiness check failed', error);
      res.status(503).json({
        status: 'not ready',
        error: 'Readiness check failed'
      });
    }
  });

  // Liveness probe (for Kubernetes)
  router.get('/live', async (req: Request, res: Response) => {
    // Simple liveness check - if we can respond, we're alive
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  });

  return router;
}

// Helper functions
async function checkDatabase(): Promise<boolean> {
  try {
    // Mock database check
    return true;
  } catch (error) {
    logger.error('Database health check failed', error);
    return false;
  }
}

async function checkMemoryVault(): Promise<boolean> {
  try {
    // Mock memory vault check
    return true;
  } catch (error) {
    logger.error('Memory vault health check failed', error);
    return false;
  }
}

async function checkAIBridge(): Promise<boolean> {
  try {
    // Mock AI bridge check
    return true;
  } catch (error) {
    logger.error('AI bridge health check failed', error);
    return false;
  }
}

async function checkBlockchain(): Promise<boolean> {
  try {
    // Mock blockchain check
    return true;
  } catch (error) {
    logger.error('Blockchain health check failed', error);
    return false;
  }
}

async function checkSystemReadiness(): Promise<boolean> {
  try {
    const checks = await Promise.allSettled([
      checkDatabase(),
      checkMemoryVault(),
      checkAIBridge()
    ]);

    return checks.every(check => check.status === 'fulfilled' && check.value === true);
  } catch (error) {
    logger.error('System readiness check failed', error);
    return false;
  }
}

function getMemoryUsage(): any {
  try {
    if (process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`
      };
    }
    return { status: 'unavailable' };
  } catch (error) {
    return { status: 'error' };
  }
}

function getSystemInfo(): any {
  try {
    return {
      platform: process.platform || 'unknown',
      nodeVersion: process.version || 'unknown',
      architecture: process.arch || 'unknown',
      pid: process.pid || 'unknown',
      uptime: process.uptime ? `${Math.floor(process.uptime())}s` : 'unknown'
    };
  } catch (error) {
    return { status: 'error' };
  }
} 