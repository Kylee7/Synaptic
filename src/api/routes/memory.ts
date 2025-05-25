import { Router, Request, Response } from 'express';
import { MemoryConnectionProtocol } from '../../core/MemoryConnectionProtocol';
import { MemoryType, MemoryCategory, PrivacyLevel } from '../../types/index';
import { Logger } from '../../utils/Logger';

const logger = new Logger('MemoryRoutes');

export function memoryRoutes(protocol: MemoryConnectionProtocol): Router {
  const router = Router();

  // Create memory
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { content, type, category, tags, privacyLevel, metadata } = req.body;

      if (!content || !type || !category) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'content, type, and category are required'
        });
      }

      const memory = await protocol.createMemory(
        content,
        type as MemoryType,
        category as MemoryCategory,
        {
          tags: tags || [],
          privacyLevel: privacyLevel || PrivacyLevel.PRIVATE,
          metadata: metadata || {}
        }
      );

      res.status(201).json({
        success: true,
        data: memory
      });
    } catch (error) {
      logger.error('Failed to create memory', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create memory'
      });
    }
  });

  // Search memories
  router.get('/search', async (req: Request, res: Response) => {
    try {
      const { query, type, category, limit, minQuality } = req.query;

      if (!query) {
        return res.status(400).json({
          error: 'Missing query parameter',
          message: 'query parameter is required for search'
        });
      }

      const memories = await protocol.searchMemories(query as string, {
        type: type as MemoryType,
        category: category as MemoryCategory,
        limit: limit ? parseInt(limit as string) : 10,
        minQuality: minQuality ? parseFloat(minQuality as string) : 0
      });

      res.json({
        success: true,
        data: memories,
        count: memories.length
      });
    } catch (error) {
      logger.error('Failed to search memories', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to search memories'
      });
    }
  });

  // Get memory by ID
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      // Note: This would need to be implemented in the protocol
      // For now, return not implemented
      res.status(501).json({
        error: 'Not Implemented',
        message: 'Get memory by ID not yet implemented'
      });
    } catch (error) {
      logger.error('Failed to get memory', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get memory'
      });
    }
  });

  // Update memory
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedMemory = await protocol.updateMemory(id, updates);

      res.json({
        success: true,
        data: updatedMemory
      });
    } catch (error) {
      logger.error('Failed to update memory', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update memory'
      });
    }
  });

  // Delete memory
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await protocol.deleteMemory(id);

      res.json({
        success: true,
        message: 'Memory deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete memory', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete memory'
      });
    }
  });

  // Get memory statistics
  router.get('/stats/overview', async (req: Request, res: Response) => {
    try {
      const stats = await protocol.getMemoryStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Failed to get memory stats', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get memory statistics'
      });
    }
  });

  return router;
} 