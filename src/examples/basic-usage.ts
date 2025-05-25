/**
 * Synaptic Basic Usage Examples
 * 
 * This file demonstrates how to use the core features of Synaptic
 * including memory management, AI interactions, and cross-platform integration.
 */

import Synaptic from '../index';
import { MemoryType, MemoryCategory, PrivacyLevel, AIPlatform } from '../types/index';

async function basicUsageExample(): Promise<void> {
  console.log('🧠 Synaptic Basic Usage Example\n');

  // Initialize Synaptic
  const synaptic = new Synaptic({
    server: {
      host: 'localhost',
      port: 3000,
      cors: {
        origin: ['*'],
        credentials: true
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
      }
    },
    storage: {
      local: {
        path: './demo-memories.db',
        maxSize: 1024 * 1024 * 100 // 100MB
      },
      ipfs: {
        host: 'localhost',
        port: 5001,
        protocol: 'http'
      }
    },
    ai: {
      defaultProvider: AIPlatform.OPENAI,
      providers: {
        [AIPlatform.OPENAI]: {
          platform: AIPlatform.OPENAI,
          apiKey: process.env.OPENAI_API_KEY || 'demo-key',
          model: 'gpt-4',
          maxTokens: 2000
        },
        [AIPlatform.CLAUDE]: {
          platform: AIPlatform.CLAUDE,
          apiKey: process.env.ANTHROPIC_API_KEY || 'demo-key',
          model: 'claude-3-sonnet',
          maxTokens: 2000
        },
        [AIPlatform.GEMINI]: {
          platform: AIPlatform.GEMINI,
          apiKey: process.env.GEMINI_API_KEY || 'demo-key'
        },
        [AIPlatform.CURSOR]: {
          platform: AIPlatform.CURSOR,
          apiKey: 'demo-key'
        },
        [AIPlatform.WINDSURF]: {
          platform: AIPlatform.WINDSURF,
          apiKey: 'demo-key'
        },
        [AIPlatform.CUSTOM]: {
          platform: AIPlatform.CUSTOM,
          apiKey: 'demo-key'
        }
      },
      embedding: {
        model: 'text-embedding-ada-002',
        dimensions: 1536,
        batchSize: 100
      }
    }
  });

  try {
    // Start the system
    console.log('1. Starting Synaptic...');
    await synaptic.start({ enableAPI: false }); // Disable API for this example
    console.log('✅ Synaptic started successfully\n');

    const protocol = synaptic.getProtocol();

    // Example 1: Create memories
    console.log('2. Creating memories...');
    
    const memory1 = await protocol.createMemory(
      'TypeScript is a strongly typed programming language that builds on JavaScript',
      MemoryType.KNOWLEDGE,
      MemoryCategory.TECHNICAL,
      {
        tags: ['typescript', 'programming', 'javascript'],
        privacyLevel: PrivacyLevel.PUBLIC,
        metadata: {
          source: 'documentation',
          difficulty: 'beginner',
          lastReviewed: new Date().toISOString()
        }
      }
    );
    console.log(`✅ Created memory: ${memory1.id}`);

    const memory2 = await protocol.createMemory(
      'Remember to buy groceries: milk, bread, eggs, and coffee',
      MemoryType.CONTEXT,
      MemoryCategory.PERSONAL,
      {
        tags: ['shopping', 'groceries', 'todo'],
        privacyLevel: PrivacyLevel.PRIVATE,
        metadata: {
          priority: 'medium',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      }
    );
    console.log(`✅ Created memory: ${memory2.id}`);

    const memory3 = await protocol.createMemory(
      'The meeting with the client went well. They are interested in our AI solution and want a demo next week.',
      MemoryType.CONVERSATION,
      MemoryCategory.PROFESSIONAL,
      {
        tags: ['meeting', 'client', 'demo', 'ai-solution'],
        privacyLevel: PrivacyLevel.SHARED,
        metadata: {
          participants: ['User A', 'User B'],
          meetingDate: new Date().toISOString(),
          followUpRequired: true
        }
      }
    );
    console.log(`✅ Created memory: ${memory3.id}\n`);

    // Example 2: Search memories
    console.log('3. Searching memories...');
    
    const searchResults1 = await protocol.searchMemories('TypeScript programming', {
      limit: 5,
      minQuality: 0.5
    });
    console.log(`✅ Found ${searchResults1.length} memories for "TypeScript programming"`);

    const searchResults2 = await protocol.searchMemories('meeting client', {
      type: MemoryType.CONVERSATION,
      limit: 3
    });
    console.log(`✅ Found ${searchResults2.length} conversation memories for "meeting client"`);

    const searchResults3 = await protocol.searchMemories('groceries', {
      category: MemoryCategory.PERSONAL,
      limit: 5
    });
    console.log(`✅ Found ${searchResults3.length} personal memories for "groceries"\n`);

    // Example 3: Process AI interactions
    console.log('4. Processing AI interactions...');
    
    const aiResponse1 = {
      content: 'TypeScript offers several benefits over JavaScript: static typing, better IDE support, early error detection, improved code maintainability, and enhanced developer productivity.',
      usage: { promptTokens: 15, completionTokens: 35, totalTokens: 50 },
      model: 'claude-3-sonnet',
      timestamp: new Date(),
      memoryContext: []
    };
    
    await protocol.processAIInteraction(
      AIPlatform.CLAUDE,
      'What are the benefits of using TypeScript over JavaScript?',
      aiResponse1,
      'session-001'
    );
    console.log(`✅ Processed Claude interaction`);

    const aiResponse2 = {
      content: 'Here are some tips for improving work-from-home productivity: create a dedicated workspace, establish a routine, take regular breaks, minimize distractions, use productivity tools, and maintain work-life balance.',
      usage: { promptTokens: 12, completionTokens: 42, totalTokens: 54 },
      model: 'gpt-4',
      timestamp: new Date(),
      memoryContext: []
    };
    
    await protocol.processAIInteraction(
      AIPlatform.OPENAI,
      'How can I improve my productivity when working from home?',
      aiResponse2,
      'session-002'
    );
    console.log(`✅ Processed OpenAI interaction\n`);

    // Example 4: Get relevant context for AI
    console.log('5. Getting AI context...');
    
    const context = await protocol.getRelevantMemories(
      'I need help with TypeScript development',
      AIPlatform.CLAUDE,
      3
    );
    console.log(`✅ Retrieved ${context.length} relevant memories for AI context\n`);

    // Example 5: Update memory
    console.log('6. Updating memory...');
    
    const updatedMemory = await protocol.updateMemory(memory2.id, {
      content: 'Remember to buy groceries: milk, bread, eggs, coffee, and bananas (added bananas)',
      tags: ['shopping', 'groceries', 'todo', 'updated'],
      metadata: {
        ...memory2.metadata,
        priority: 'high'
      }
    });
    console.log(`✅ Updated memory: ${updatedMemory.id}\n`);

    // Example 6: Get memory statistics
    console.log('7. Getting memory statistics...');
    
    const stats = await protocol.getMemoryStats();
    console.log('✅ Memory Statistics:');
    console.log(`   Total memories: ${stats.totalMemories}`);
    console.log(`   By type: Knowledge(${stats.memoriesByType[MemoryType.KNOWLEDGE] || 0}), Context(${stats.memoriesByType[MemoryType.CONTEXT] || 0}), Conversations(${stats.memoriesByType[MemoryType.CONVERSATION] || 0})`);
    console.log(`   By category: Technical(${stats.memoriesByCategory[MemoryCategory.TECHNICAL] || 0}), Personal(${stats.memoriesByCategory[MemoryCategory.PERSONAL] || 0}), Professional(${stats.memoriesByCategory[MemoryCategory.PROFESSIONAL] || 0})`);
    console.log(`   Average quality: ${stats.averageQuality.toFixed(2)}\n`);

    // Example 7: Cross-platform memory synthesis
    console.log('8. Demonstrating cross-platform synthesis...');
    
    // Simulate memories from different AI platforms
    await protocol.processAIInteraction(
      AIPlatform.CLAUDE,
      'Explain React hooks',
      {
        content: 'React hooks are functions that let you use state and other React features in functional components.',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        model: 'claude-3-sonnet',
        timestamp: new Date(),
        memoryContext: []
      },
      'react-session-1'
    );

    await protocol.processAIInteraction(
      AIPlatform.OPENAI,
      'What are the most commonly used React hooks?',
      {
        content: 'The most commonly used React hooks are useState, useEffect, useContext, useReducer, and useMemo.',
        usage: { promptTokens: 12, completionTokens: 18, totalTokens: 30 },
        model: 'gpt-4',
        timestamp: new Date(),
        memoryContext: []
      },
      'react-session-2'
    );

    await protocol.processAIInteraction(
      AIPlatform.GEMINI,
      'How do I optimize React performance?',
      {
        content: 'React performance can be optimized using React.memo, useMemo, useCallback, code splitting, and avoiding unnecessary re-renders.',
        usage: { promptTokens: 8, completionTokens: 25, totalTokens: 33 },
        model: 'gemini-pro',
        timestamp: new Date(),
        memoryContext: []
      },
      'react-session-3'
    );

    // Search across all platforms
    const crossPlatformResults = await protocol.searchMemories('React hooks performance', {
      limit: 10,
      minQuality: 0.3
    });
    console.log(`✅ Found ${crossPlatformResults.length} memories across all AI platforms about React`);
    
    // Get synthesized context
    const synthesizedContext = await protocol.getRelevantMemories(
      'I want to learn about React hooks and performance optimization',
      AIPlatform.CLAUDE,
      5
    );
    console.log(`✅ Synthesized context from ${synthesizedContext.length} memories across platforms\n`);

    // Example 8: Privacy and security demonstration
    console.log('9. Privacy and security features...');
    
    // Create a private memory
    const privateMemory = await protocol.createMemory(
      'My personal API key: api-key-1234567890abcdef',
      MemoryType.KNOWLEDGE,
      MemoryCategory.PERSONAL,
      {
        tags: ['api-key', 'secret', 'personal'],
        privacyLevel: PrivacyLevel.PRIVATE,
        metadata: {
          encrypted: true,
          sensitiveData: true
        }
      }
    );
    console.log(`✅ Created private memory with encryption: ${privateMemory.id}`);

    // Search should respect privacy levels
    const publicSearch = await protocol.searchMemories('API key', {
      limit: 5
    });
    console.log(`✅ Public search found ${publicSearch.length} memories (private memories filtered out)\n`);

    // Example 9: Cleanup
    console.log('10. Cleaning up...');
    
    await protocol.deleteMemory(memory1.id);
    console.log(`✅ Deleted memory: ${memory1.id}`);

    const finalStats = await protocol.getMemoryStats();
    console.log(`✅ Final memory count: ${finalStats.totalMemories}\n`);

    // Stop the system
    console.log('11. Stopping Synaptic...');
    await synaptic.stop();
    console.log('✅ Synaptic stopped successfully\n');

    console.log('🎉 Basic usage example completed successfully!');
    console.log('\nKey features demonstrated:');
    console.log('• Memory creation with different types and categories');
    console.log('• Semantic search across memories');
    console.log('• AI interaction processing and context retrieval');
    console.log('• Cross-platform memory synthesis');
    console.log('• Privacy-aware memory management');
    console.log('• Memory statistics and analytics');
    console.log('• Memory updates and deletion');

  } catch (error) {
    console.error('❌ Error in basic usage example:', error);
    throw error;
  }
}

// Advanced usage example
async function advancedUsageExample(): Promise<void> {
  console.log('\n🚀 Synaptic Advanced Usage Example\n');

  const synaptic = new Synaptic({
    storage: {
      local: { path: './advanced-demo.db', maxSize: 1024 * 1024 * 50 },
      ipfs: { host: 'localhost', port: 5001, protocol: 'http' }
    },
    ai: { 
      defaultProvider: AIPlatform.CLAUDE,
      providers: {
        [AIPlatform.CLAUDE]: {
          platform: AIPlatform.CLAUDE,
          apiKey: 'demo-key'
        },
        [AIPlatform.OPENAI]: {
          platform: AIPlatform.OPENAI,
          apiKey: 'demo-key'
        },
        [AIPlatform.GEMINI]: {
          platform: AIPlatform.GEMINI,
          apiKey: 'demo-key'
        },
        [AIPlatform.CURSOR]: {
          platform: AIPlatform.CURSOR,
          apiKey: 'demo-key'
        },
        [AIPlatform.WINDSURF]: {
          platform: AIPlatform.WINDSURF,
          apiKey: 'demo-key'
        },
        [AIPlatform.CUSTOM]: {
          platform: AIPlatform.CUSTOM,
          apiKey: 'demo-key'
        }
      },
      embedding: {
        model: 'text-embedding-ada-002',
        dimensions: 1536,
        batchSize: 100
      }
    }
  });

  try {
    await synaptic.start({ enableAPI: false });
    const protocol = synaptic.getProtocol();

    // Advanced feature 1: Batch operations
    console.log('1. Batch memory operations...');
    
    const batchMemories = [
      {
        content: 'JavaScript is a dynamic programming language',
        type: MemoryType.KNOWLEDGE,
        category: MemoryCategory.TECHNICAL,
        options: { tags: ['javascript', 'programming'] }
      },
      {
        content: 'Python is great for data science and machine learning',
        type: MemoryType.KNOWLEDGE,
        category: MemoryCategory.TECHNICAL,
        options: { tags: ['python', 'data-science', 'ml'] }
      },
      {
        content: 'Rust provides memory safety without garbage collection',
        type: MemoryType.KNOWLEDGE,
        category: MemoryCategory.TECHNICAL,
        options: { tags: ['rust', 'systems-programming', 'memory-safety'] }
      }
    ];

    const createdMemories = [];
    for (const memoryData of batchMemories) {
      const memory = await protocol.createMemory(
        memoryData.content,
        memoryData.type,
        memoryData.category,
        memoryData.options
      );
      createdMemories.push(memory);
    }
    console.log(`✅ Created ${createdMemories.length} memories in batch\n`);

    // Advanced feature 2: Complex search with filters
    console.log('2. Complex search operations...');
    
    const complexSearch = await protocol.searchMemories('programming language', {
      type: MemoryType.KNOWLEDGE,
      category: MemoryCategory.TECHNICAL,
      limit: 10,
      minQuality: 0.4
    });
    console.log(`✅ Complex search found ${complexSearch.length} technical knowledge memories\n`);

    // Advanced feature 3: Memory quality analysis
    console.log('3. Memory quality analysis...');
    
    for (const memory of createdMemories) {
      console.log(`   Memory ${memory.id}: Quality score ${memory.quality.toFixed(2)}`);
    }
    console.log('✅ Quality analysis completed\n');

    await synaptic.stop();
    console.log('🎉 Advanced usage example completed!\n');

  } catch (error) {
    console.error('❌ Error in advanced usage example:', error);
    throw error;
  }
}

// API usage example
async function apiUsageExample(): Promise<void> {
  console.log('\n🌐 Synaptic API Usage Example\n');

  const synaptic = new Synaptic({
    server: { 
      host: 'localhost', 
      port: 3001,
      cors: { origin: ['*'], credentials: true },
      rateLimit: { windowMs: 15 * 60 * 1000, max: 100 }
    },
    storage: {
      local: { path: './api-demo.db', maxSize: 1024 * 1024 * 50 },
      ipfs: { host: 'localhost', port: 5001, protocol: 'http' }
    }
  });

  try {
    // Start with API enabled
    await synaptic.start({ enableAPI: true });
    console.log('✅ API server started on http://localhost:3001\n');

    console.log('API endpoints available:');
    console.log('• GET  /health - Health check');
    console.log('• GET  /api - API documentation');
    console.log('• POST /api/memory - Create memory');
    console.log('• GET  /api/memory/search - Search memories');
    console.log('• POST /api/ai/interaction - Process AI interaction');
    console.log('• GET  /health/metrics - System metrics\n');

    console.log('Example API calls:');
    console.log('curl -X POST http://localhost:3001/api/memory \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"content":"Hello World","type":"knowledge","category":"technical"}\'');
    console.log('');
    console.log('curl "http://localhost:3001/api/memory/search?query=hello&limit=5"');
    console.log('');

    // Keep server running for a moment
    console.log('Server will run for 5 seconds for testing...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    await synaptic.stop();
    console.log('✅ API server stopped\n');

  } catch (error) {
    console.error('❌ Error in API usage example:', error);
    throw error;
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    await basicUsageExample();
    await advancedUsageExample();
    await apiUsageExample();
    
    console.log('\n🎊 All examples completed successfully!');
    console.log('\nNext steps:');
    console.log('• Explore the API documentation at /api/docs');
    console.log('• Check out the desktop and mobile apps');
    console.log('• Visit https://synapticmcp.xyz for more information\n');
    
  } catch (error) {
    console.error('❌ Example execution failed:', error);
    process.exit(1);
  }
}

// Run examples if called directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  basicUsageExample,
  advancedUsageExample,
  apiUsageExample
}; 