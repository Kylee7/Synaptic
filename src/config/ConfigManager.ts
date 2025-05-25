import { Logger } from '../utils/Logger';
import { SynapticConfig } from '../types/index';
import { createDefaultConfig } from './defaultConfig';

export interface ConfigSource {
  name: string;
  priority: number;
  load(): Promise<Partial<SynapticConfig>>;
}

export interface ConfigValidationRule {
  path: string;
  validator: (value: any) => boolean;
  message: string;
}

export class ConfigManager {
  private static instance: ConfigManager;
  private logger: Logger;
  private config: SynapticConfig;
  private sources: ConfigSource[] = [];
  private validationRules: ConfigValidationRule[] = [];
  private watchers: Array<(config: SynapticConfig) => void> = [];

  private constructor() {
    this.logger = new Logger('ConfigManager');
    this.config = createDefaultConfig();
    this.setupValidationRules();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Add a configuration source
   */
  addSource(source: ConfigSource): void {
    this.sources.push(source);
    this.sources.sort((a, b) => b.priority - a.priority); // Higher priority first
    this.logger.info(`Added config source: ${source.name} (priority: ${source.priority})`);
  }

  /**
   * Load configuration from all sources
   */
  async loadConfig(): Promise<SynapticConfig> {
    let mergedConfig = createDefaultConfig();

    // Load from sources in priority order
    for (const source of this.sources) {
      try {
        const sourceConfig = await source.load();
        mergedConfig = this.deepMerge(mergedConfig, sourceConfig);
        this.logger.debug(`Loaded config from source: ${source.name}`);
      } catch (error) {
        this.logger.error(`Failed to load config from source: ${source.name}`, error);
      }
    }

    // Validate configuration
    const validationErrors = this.validateConfig(mergedConfig);
    if (validationErrors.length > 0) {
      this.logger.error('Configuration validation failed', { errors: validationErrors });
      throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
    }

    this.config = mergedConfig;
    this.notifyWatchers();
    this.logger.info('Configuration loaded successfully');
    
    return this.config;
  }

  /**
   * Get current configuration
   */
  getConfig(): SynapticConfig {
    return this.config;
  }

  /**
   * Get configuration value by path
   */
  get<T>(path: string, defaultValue?: T): T {
    const value = this.getValueByPath(this.config, path);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Set configuration value by path
   */
  set(path: string, value: any): void {
    this.setValueByPath(this.config, path, value);
    this.notifyWatchers();
    this.logger.debug(`Config value set: ${path}`, { value });
  }

  /**
   * Watch for configuration changes
   */
  watch(callback: (config: SynapticConfig) => void): () => void {
    this.watchers.push(callback);
    
    // Return unwatch function
    return () => {
      const index = this.watchers.indexOf(callback);
      if (index > -1) {
        this.watchers.splice(index, 1);
      }
    };
  }

  /**
   * Reload configuration from sources
   */
  async reload(): Promise<void> {
    await this.loadConfig();
    this.logger.info('Configuration reloaded');
  }

  /**
   * Export configuration to JSON
   */
  export(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  import(configJson: string): void {
    try {
      const importedConfig = JSON.parse(configJson);
      const validationErrors = this.validateConfig(importedConfig);
      
      if (validationErrors.length > 0) {
        throw new Error(`Invalid configuration: ${validationErrors.join(', ')}`);
      }

      this.config = importedConfig;
      this.notifyWatchers();
      this.logger.info('Configuration imported successfully');
    } catch (error) {
      this.logger.error('Failed to import configuration', error);
      throw error;
    }
  }

  /**
   * Get configuration schema
   */
  getSchema(): Record<string, any> {
    return {
      server: {
        host: { type: 'string', default: 'localhost' },
        port: { type: 'number', default: 3000, min: 1, max: 65535 },
        cors: {
          origin: { type: 'string', default: '*' },
          credentials: { type: 'boolean', default: true }
        }
      },
      storage: {
        type: { type: 'string', enum: ['sqlite', 'postgresql', 'memory'], default: 'sqlite' },
        path: { type: 'string', default: './data/synaptic.db' },
        maxConnections: { type: 'number', default: 10, min: 1, max: 100 }
      },
      ai: {
        defaultProvider: { type: 'string', enum: ['openai', 'anthropic', 'google'], default: 'openai' },
        timeout: { type: 'number', default: 30000, min: 1000, max: 300000 },
        maxRetries: { type: 'number', default: 3, min: 0, max: 10 }
      },
      blockchain: {
        network: { type: 'string', enum: ['mainnet', 'devnet', 'testnet'], default: 'devnet' },
        rpcUrl: { type: 'string' },
        programId: { type: 'string' }
      },
      privacy: {
        encryptionAlgorithm: { type: 'string', default: 'aes-256-gcm' },
        keyDerivationIterations: { type: 'number', default: 100000, min: 10000, max: 1000000 },
        saltLength: { type: 'number', default: 32, min: 16, max: 64 }
      }
    };
  }

  private setupValidationRules(): void {
    this.validationRules = [
      {
        path: 'server.port',
        validator: (value) => typeof value === 'number' && value > 0 && value <= 65535,
        message: 'Server port must be a number between 1 and 65535'
      },
      {
        path: 'storage.type',
        validator: (value) => ['sqlite', 'postgresql', 'memory'].includes(value),
        message: 'Storage type must be sqlite, postgresql, or memory'
      },
      {
        path: 'ai.timeout',
        validator: (value) => typeof value === 'number' && value >= 1000 && value <= 300000,
        message: 'AI timeout must be between 1000 and 300000 milliseconds'
      },
      {
        path: 'blockchain.network',
        validator: (value) => ['mainnet', 'devnet', 'testnet'].includes(value),
        message: 'Blockchain network must be mainnet, devnet, or testnet'
      },
      {
        path: 'privacy.keyDerivationIterations',
        validator: (value) => typeof value === 'number' && value >= 10000 && value <= 1000000,
        message: 'Key derivation iterations must be between 10000 and 1000000'
      }
    ];
  }

  private validateConfig(config: any): string[] {
    const errors: string[] = [];

    for (const rule of this.validationRules) {
      const value = this.getValueByPath(config, rule.path);
      if (value !== undefined && !rule.validator(value)) {
        errors.push(rule.message);
      }
    }

    return errors;
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  private notifyWatchers(): void {
    for (const watcher of this.watchers) {
      try {
        watcher(this.config);
      } catch (error) {
        this.logger.error('Error in config watcher', error);
      }
    }
  }
}

// Configuration sources
export class EnvironmentConfigSource implements ConfigSource {
  name = 'environment';
  priority = 100;

  async load(): Promise<Partial<SynapticConfig>> {
    const config: any = {};

    // Map environment variables to config paths
    const envMappings = {
      'SYNAPTIC_HOST': 'server.host',
      'SYNAPTIC_PORT': 'server.port',
      'SYNAPTIC_DB_PATH': 'storage.path',
      'SYNAPTIC_DB_TYPE': 'storage.type',
      'SYNAPTIC_AI_PROVIDER': 'ai.defaultProvider',
      'SYNAPTIC_BLOCKCHAIN_NETWORK': 'blockchain.network',
      'SYNAPTIC_BLOCKCHAIN_RPC_URL': 'blockchain.rpcUrl',
      'SYNAPTIC_PROGRAM_ID': 'blockchain.programId',
      'OPENAI_API_KEY': 'ai.providers.openai.apiKey',
      'ANTHROPIC_API_KEY': 'ai.providers.anthropic.apiKey',
      'GOOGLE_API_KEY': 'ai.providers.google.apiKey'
    };

    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        this.setValueByPath(config, configPath, this.parseValue(value));
      }
    }

    return config;
  }

  private setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private parseValue(value: string): any {
    // Try to parse as number
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }

    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Return as string
    return value;
  }
}

export class FileConfigSource implements ConfigSource {
  name = 'file';
  priority = 50;

  constructor(private filePath: string) {}

  async load(): Promise<Partial<SynapticConfig>> {
    try {
      // In a real implementation, this would read from the file system
      // For now, return empty config since we don't have fs access
      return {};
    } catch (error) {
      throw new Error(`Failed to load config file: ${this.filePath}`);
    }
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance(); 