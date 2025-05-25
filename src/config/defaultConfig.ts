import { SynapticConfig, AIPlatform } from '../types/index';

export function createDefaultConfig(): SynapticConfig {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      cors: {
        origin: ['http://localhost:3000', 'https://synapticmcp.xyz'],
        credentials: true
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
      }
    },
    database: {
      type: 'sqlite',
      database: './data/synaptic.db'
    },
    blockchain: {
      network: 'devnet',
      rpcUrl: 'https://api.devnet.solana.com',
      programId: 'SynapticProgram1111111111111111111111111',
      tokenMint: 'SynaToken1111111111111111111111111111111'
    },
    storage: {
      local: {
        path: './data/memories',
        maxSize: 1024 * 1024 * 1024 // 1GB
      },
      ipfs: {
        host: 'localhost',
        port: 5001,
        protocol: 'http'
      }
    },
    ai: {
      providers: {
        [AIPlatform.CLAUDE]: {
          platform: AIPlatform.CLAUDE,
          apiKey: process.env.CLAUDE_API_KEY || '',
          baseUrl: 'https://api.anthropic.com',
          model: 'claude-3-sonnet-20240229',
          maxTokens: 4000,
          temperature: 0.7
        },
        [AIPlatform.OPENAI]: {
          platform: AIPlatform.OPENAI,
          apiKey: process.env.OPENAI_API_KEY || '',
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4',
          maxTokens: 4000,
          temperature: 0.7
        },
        [AIPlatform.GEMINI]: {
          platform: AIPlatform.GEMINI,
          apiKey: process.env.GEMINI_API_KEY || '',
          baseUrl: 'https://generativelanguage.googleapis.com',
          model: 'gemini-pro',
          maxTokens: 4000,
          temperature: 0.7
        },
        [AIPlatform.CURSOR]: {
          platform: AIPlatform.CURSOR,
          apiKey: process.env.CURSOR_API_KEY || '',
          model: 'cursor-default',
          maxTokens: 4000,
          temperature: 0.7
        },
        [AIPlatform.WINDSURF]: {
          platform: AIPlatform.WINDSURF,
          apiKey: process.env.WINDSURF_API_KEY || '',
          model: 'windsurf-default',
          maxTokens: 4000,
          temperature: 0.7
        },
        [AIPlatform.CUSTOM]: {
          platform: AIPlatform.CUSTOM,
          apiKey: process.env.CUSTOM_API_KEY || '',
          model: 'custom-model',
          maxTokens: 4000,
          temperature: 0.7
        }
      },
      defaultProvider: AIPlatform.CLAUDE,
      embedding: {
        model: 'text-embedding-ada-002',
        dimensions: 384,
        batchSize: 100
      }
    },
    security: {
      encryption: {
        algorithm: 'AES-256-GCM',
        keyDerivation: 'PBKDF2',
        iterations: 100000,
        saltLength: 32
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'synaptic-secret-key',
        expiresIn: '7d'
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100
      }
    },
    features: {
      memoryMining: true,
      crossPlatformSync: true,
      advancedPrivacy: true,
      enterpriseFeatures: false,
      betaFeatures: true
    }
  };
} 