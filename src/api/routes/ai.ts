import { Router, Request, Response } from 'express';
import { MemoryConnectionProtocol } from '../../core/MemoryConnectionProtocol';
import { AIPlatform } from '../../types/index';
import { Logger } from '../../utils/Logger';

const logger = new Logger('AIRoutes');

export function aiRoutes(protocol: MemoryConnectionProtocol): Router {
  const router = Router();

  // Process AI interaction
  router.post('/interaction', async (req: Request, res: Response) => {
    try {
      const { platform, userMessage, aiResponse, sessionId } = req.body;

      if (!platform || !userMessage || !aiResponse) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'platform, userMessage, and aiResponse are required'
        });
      }

      await protocol.processAIInteraction(
        platform as AIPlatform,
        userMessage,
        aiResponse,
        sessionId || `session_${Date.now()}`
      );

      res.json({
        success: true,
        message: 'AI interaction processed successfully'
      });
    } catch (error) {
      logger.error('Failed to process AI interaction', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process AI interaction'
      });
    }
  });

  // Get relevant memories for AI context
  router.post('/context', async (req: Request, res: Response) => {
    try {
      const { currentContext, aiPlatform, maxMemories } = req.body;

      if (!currentContext || !aiPlatform) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'currentContext and aiPlatform are required'
        });
      }

      const memories = await protocol.getRelevantMemories(
        currentContext,
        aiPlatform as AIPlatform,
        maxMemories || 5
      );

      res.json({
        success: true,
        data: memories,
        count: memories.length
      });
    } catch (error) {
      logger.error('Failed to get relevant memories', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get relevant memories'
      });
    }
  });

  // Get supported AI platforms
  router.get('/platforms', async (req: Request, res: Response) => {
    try {
      const platforms = Object.values(AIPlatform);
      
      res.json({
        success: true,
        data: platforms,
        count: platforms.length
      });
    } catch (error) {
      logger.error('Failed to get AI platforms', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get AI platforms'
      });
    }
  });

  return router;
} 