import { EventEmitter } from 'events';
import {
  AIPlatform,
  AIAdapter,
  AIResponse,
  AIConfig,
  MemoryType,
  MemoryCategory
} from '../types/index';
import { Logger } from '../utils/Logger';

export interface ExtractedMemory {
  content: string;
  type: MemoryType;
  category: MemoryCategory;
  tags: string[];
  confidence: number;
}

export class CrossMindBridge extends EventEmitter {
  private aiConfig: AIConfig;
  private logger: Logger;
  private adapters: Map<AIPlatform, AIAdapter> = new Map();
  private isInitialized: boolean = false;

  constructor(aiConfig: AIConfig) {
    super();
    this.aiConfig = aiConfig;
    this.logger = new Logger('CrossMindBridge');
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Cross Mind Bridge');

      // Initialize AI adapters
      for (const [platform, adapter] of Object.entries(this.aiConfig.providers)) {
        this.adapters.set(platform as AIPlatform, adapter);
      }

      this.isInitialized = true;
      this.logger.info('Cross Mind Bridge initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Cross Mind Bridge', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // For now, return a simple hash-based embedding
      // In production, this would use a proper embedding model
      return this.generateSimpleEmbedding(text);
    } catch (error) {
      this.logger.error('Failed to generate embedding', error);
      throw error;
    }
  }

  async extractMemories(
    userMessage: string,
    aiResponse: string,
    platform: AIPlatform
  ): Promise<ExtractedMemory[]> {
    try {
      const extractedMemories: ExtractedMemory[] = [];

      // Extract preferences from user message
      const preferences = this.extractPreferences(userMessage);
      if (preferences.length > 0) {
        extractedMemories.push(...preferences);
      }

      // Extract knowledge from AI response
      const knowledge = this.extractKnowledge(aiResponse);
      if (knowledge.length > 0) {
        extractedMemories.push(...knowledge);
      }

      // Extract context from the conversation
      const context = this.extractContext(userMessage, aiResponse);
      if (context) {
        extractedMemories.push(context);
      }

      this.logger.debug('Extracted memories from AI interaction', {
        platform,
        extractedCount: extractedMemories.length
      });

      return extractedMemories;
    } catch (error) {
      this.logger.error('Failed to extract memories', error);
      return [];
    }
  }

  async close(): Promise<void> {
    try {
      this.logger.info('Closing Cross Mind Bridge');
      this.adapters.clear();
      this.isInitialized = false;
      this.logger.info('Cross Mind Bridge closed successfully');
    } catch (error) {
      this.logger.error('Error closing Cross Mind Bridge', error);
      throw error;
    }
  }

  // Private methods

  private generateSimpleEmbedding(text: string): number[] {
    // Simple hash-based embedding for demonstration
    // In production, use proper embedding models like OpenAI's text-embedding-ada-002
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0); // 384-dimensional embedding

    for (const word of words) {
      const hash = this.simpleHash(word);
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] += Math.sin(hash + i) * 0.1;
      }
    }

    // Normalize the embedding
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }

    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  private extractPreferences(userMessage: string): ExtractedMemory[] {
    const preferences: ExtractedMemory[] = [];
    const lowerMessage = userMessage.toLowerCase();

    // Extract language preferences
    const languagePatterns = [
      /i prefer (.*?) language/i,
      /i like to use (.*?) for/i,
      /my favorite (.*?) is/i
    ];

    for (const pattern of languagePatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        preferences.push({
          content: `User prefers ${match[1]}`,
          type: MemoryType.PREFERENCE,
          category: MemoryCategory.TECHNICAL,
          tags: ['preference', 'language', 'tool'],
          confidence: 0.8
        });
      }
    }

    // Extract workflow preferences
    if (lowerMessage.includes('i usually') || lowerMessage.includes('i typically')) {
      preferences.push({
        content: userMessage,
        type: MemoryType.PREFERENCE,
        category: MemoryCategory.PROFESSIONAL,
        tags: ['workflow', 'habit', 'preference'],
        confidence: 0.7
      });
    }

    return preferences;
  }

  private extractKnowledge(aiResponse: string): ExtractedMemory[] {
    const knowledge: ExtractedMemory[] = [];

    // Extract code snippets
    const codeBlocks = aiResponse.match(/```[\s\S]*?```/g);
    if (codeBlocks) {
      for (const codeBlock of codeBlocks) {
        const language = codeBlock.match(/```(\w+)/)?.[1] || 'unknown';
        knowledge.push({
          content: codeBlock,
          type: MemoryType.KNOWLEDGE,
          category: MemoryCategory.TECHNICAL,
          tags: ['code', 'snippet', language],
          confidence: 0.9
        });
      }
    }

    // Extract definitions and explanations
    const definitionPatterns = [
      /(\w+) is a (.*?)\./g,
      /(\w+) refers to (.*?)\./g,
      /(\w+) means (.*?)\./g
    ];

    for (const pattern of definitionPatterns) {
      let match;
      while ((match = pattern.exec(aiResponse)) !== null) {
        knowledge.push({
          content: match[0],
          type: MemoryType.KNOWLEDGE,
          category: MemoryCategory.EDUCATIONAL,
          tags: ['definition', 'concept', match[1].toLowerCase()],
          confidence: 0.8
        });
      }
    }

    return knowledge;
  }

  private extractContext(userMessage: string, aiResponse: string): ExtractedMemory | null {
    // Extract project context
    const projectPatterns = [
      /working on (.*?) project/i,
      /building (.*?) application/i,
      /developing (.*?) system/i
    ];

    for (const pattern of projectPatterns) {
      const match = userMessage.match(pattern);
      if (match) {
        return {
          content: `Working on ${match[1]} project: ${userMessage}`,
          type: MemoryType.PROJECT,
          category: MemoryCategory.PROFESSIONAL,
          tags: ['project', 'context', match[1].toLowerCase()],
          confidence: 0.8
        };
      }
    }

    // Extract general conversation context
    if (userMessage.length > 50 && aiResponse.length > 100) {
      return {
        content: `Conversation about: ${userMessage.substring(0, 100)}...`,
        type: MemoryType.CONTEXT,
        category: this.categorizeContent(userMessage),
        tags: ['conversation', 'context'],
        confidence: 0.6
      };
    }

    return null;
  }

  private categorizeContent(content: string): MemoryCategory {
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('code') || lowerContent.includes('programming') || 
        lowerContent.includes('development') || lowerContent.includes('technical')) {
      return MemoryCategory.TECHNICAL;
    }

    if (lowerContent.includes('work') || lowerContent.includes('business') || 
        lowerContent.includes('project') || lowerContent.includes('professional')) {
      return MemoryCategory.PROFESSIONAL;
    }

    if (lowerContent.includes('learn') || lowerContent.includes('study') || 
        lowerContent.includes('education') || lowerContent.includes('course')) {
      return MemoryCategory.EDUCATIONAL;
    }

    if (lowerContent.includes('creative') || lowerContent.includes('art') || 
        lowerContent.includes('design') || lowerContent.includes('writing')) {
      return MemoryCategory.CREATIVE;
    }

    if (lowerContent.includes('social') || lowerContent.includes('friend') || 
        lowerContent.includes('family') || lowerContent.includes('relationship')) {
      return MemoryCategory.SOCIAL;
    }

    return MemoryCategory.PERSONAL;
  }
} 