// Core Memory Types
export interface Memory {
  id: string;
  userId: string;
  content: string;
  type: MemoryType;
  category: MemoryCategory;
  metadata: MemoryMetadata;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
  accessCount: number;
  quality: number;
  tags: string[];
  isEncrypted: boolean;
  encryptionKey?: string;
}

export enum MemoryType {
  CONVERSATION = 'conversation',
  PREFERENCE = 'preference',
  KNOWLEDGE = 'knowledge',
  PROJECT = 'project',
  CONTEXT = 'context',
  SKILL = 'skill',
  TEMPLATE = 'template'
}

export enum MemoryCategory {
  PERSONAL = 'personal',
  PROFESSIONAL = 'professional',
  EDUCATIONAL = 'educational',
  CREATIVE = 'creative',
  TECHNICAL = 'technical',
  SOCIAL = 'social'
}

export interface MemoryMetadata {
  source: string;
  aiPlatform?: string;
  sessionId?: string;
  location?: GeolocationCoordinates;
  deviceInfo?: DeviceInfo;
  privacyLevel: PrivacyLevel;
  sharePermissions: SharePermission[];
  version: number;
  parentMemoryId?: string;
  childMemoryIds: string[];
}

export enum PrivacyLevel {
  PRIVATE = 0,
  ANONYMIZED = 1,
  SHARED = 2,
  PUBLIC = 3
}

export interface SharePermission {
  entityId: string;
  entityType: 'user' | 'ai' | 'app';
  permissions: Permission[];
  expiresAt?: Date;
}

export enum Permission {
  READ = 'read',
  WRITE = 'write',
  SHARE = 'share',
  DELETE = 'delete'
}

// AI Platform Integration Types
export interface AIAdapter {
  platform: AIPlatform;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export enum AIPlatform {
  CLAUDE = 'claude',
  OPENAI = 'openai',
  GEMINI = 'gemini',
  CURSOR = 'cursor',
  WINDSURF = 'windsurf',
  CUSTOM = 'custom'
}

export interface AIResponse {
  content: string;
  usage: TokenUsage;
  model: string;
  timestamp: Date;
  memoryContext: string[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Blockchain and Token Types
export interface SynaToken {
  address: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  circulatingSupply: bigint;
}

export interface WalletConnection {
  address: string;
  network: 'mainnet' | 'devnet' | 'testnet';
  balance: bigint;
  isConnected: boolean;
}

export interface MiningReward {
  userId: string;
  memoryId: string;
  amount: bigint;
  reason: RewardReason;
  timestamp: Date;
  transactionHash: string;
}

export enum RewardReason {
  QUALITY_CONTRIBUTION = 'quality_contribution',
  QUALITY_VALIDATION = 'quality_validation',
  PATTERN_DISCOVERY = 'pattern_discovery',
  GOVERNANCE_PARTICIPATION = 'governance_participation',
  DAILY_USAGE = 'daily_usage'
}

// Storage and Encryption Types
export interface EncryptionConfig {
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  keyDerivation: 'PBKDF2' | 'Argon2';
  iterations: number;
  saltLength: number;
}

export interface StorageProvider {
  type: 'local' | 'ipfs' | 'cloud';
  config: Record<string, any>;
  isAvailable: boolean;
  priority: number;
}

export interface BackupConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  retention: number;
  encryption: boolean;
  destinations: StorageProvider[];
}

// Privacy and Security Types
export interface ZKProof {
  proof: string;
  publicSignals: string[];
  verificationKey: string;
}

export interface DifferentialPrivacyConfig {
  epsilon: number;
  delta: number;
  sensitivity: number;
  mechanism: 'laplace' | 'gaussian' | 'exponential';
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details?: Record<string, any>;
}

// API and Communication Types
export interface APIRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: Date;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  timestamp: Date;
  requestId: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface WebSocketMessage {
  type: MessageType;
  payload: any;
  timestamp: Date;
  senderId: string;
  recipientId?: string;
}

export enum MessageType {
  MEMORY_SYNC = 'memory_sync',
  AI_REQUEST = 'ai_request',
  AI_RESPONSE = 'ai_response',
  MINING_UPDATE = 'mining_update',
  SYSTEM_NOTIFICATION = 'system_notification',
  ERROR = 'error'
}

// User and Device Types
export interface User {
  id: string;
  walletAddress: string;
  email?: string;
  username?: string;
  preferences: UserPreferences;
  subscription: SubscriptionTier;
  createdAt: Date;
  lastActiveAt: Date;
  totalMemories: number;
  totalRewards: bigint;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  ai: AISettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  mining: boolean;
  security: boolean;
  updates: boolean;
}

export interface PrivacySettings {
  defaultPrivacyLevel: PrivacyLevel;
  allowDataMining: boolean;
  allowAnalytics: boolean;
  shareUsageStats: boolean;
}

export interface AISettings {
  defaultModel: string;
  maxContextLength: number;
  autoSuggestMemories: boolean;
  enableLearning: boolean;
}

export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'browser';
  os: string;
  version: string;
  lastSyncAt: Date;
}

// Configuration Types
export interface SynapticConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  blockchain: BlockchainConfig;
  storage: StorageConfig;
  ai: AIConfig;
  security: SecurityConfig;
  features: FeatureFlags;
}

export interface ServerConfig {
  port: number;
  host: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql' | 'mysql';
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
}

export interface BlockchainConfig {
  network: 'mainnet' | 'devnet' | 'testnet';
  rpcUrl: string;
  programId: string;
  tokenMint: string;
}

export interface StorageConfig {
  local: {
    path: string;
    maxSize: number;
  };
  ipfs: {
    host: string;
    port: number;
    protocol: 'http' | 'https';
  };
  cloud?: {
    provider: 'aws' | 'gcp' | 'azure';
    bucket: string;
    region: string;
  };
}

export interface AIConfig {
  providers: Record<AIPlatform, AIAdapter>;
  defaultProvider: AIPlatform;
  embedding: {
    model: string;
    dimensions: number;
    batchSize: number;
  };
}

export interface SecurityConfig {
  encryption: EncryptionConfig;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

export interface FeatureFlags {
  memoryMining: boolean;
  crossPlatformSync: boolean;
  advancedPrivacy: boolean;
  enterpriseFeatures: boolean;
  betaFeatures: boolean;
}

// Event Types
export interface SynapticEvent {
  type: string;
  payload: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

export interface MemoryEvent extends SynapticEvent {
  type: 'memory_created' | 'memory_updated' | 'memory_deleted' | 'memory_accessed';
  payload: {
    memoryId: string;
    changes?: Partial<Memory>;
  };
}

export interface MiningEvent extends SynapticEvent {
  type: 'reward_earned' | 'quality_assessed' | 'validation_completed';
  payload: {
    memoryId: string;
    reward?: MiningReward;
    quality?: number;
  };
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>; 