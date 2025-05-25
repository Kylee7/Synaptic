import SynapticMCP, { MemoryType, MemoryCategory, PrivacyLevel } from '../src/index';

describe('SynapticMCP', () => {
  let synaptic: SynapticMCP;

  beforeEach(() => {
    synaptic = new SynapticMCP();
  });

  afterEach(async () => {
    if (synaptic) {
      await synaptic.stop();
    }
  });

  test('should initialize successfully', async () => {
    await expect(synaptic.start()).resolves.not.toThrow();
  });

  test('should create and retrieve memories', async () => {
    await synaptic.start();
    const protocol = synaptic.getProtocol();

    // Create a memory
    const memory = await protocol.createMemory(
      'Test memory content',
      MemoryType.KNOWLEDGE,
      MemoryCategory.TECHNICAL,
      {
        tags: ['test', 'demo'],
        privacyLevel: PrivacyLevel.SHARED
      }
    );

    expect(memory).toBeDefined();
    expect(memory.content).toBe('Test memory content');
    expect(memory.type).toBe(MemoryType.KNOWLEDGE);
    expect(memory.category).toBe(MemoryCategory.TECHNICAL);
    expect(memory.tags).toContain('test');
    expect(memory.tags).toContain('demo');
  });

  test('should search memories', async () => {
    await synaptic.start();
    const protocol = synaptic.getProtocol();

    // Create a memory
    await protocol.createMemory(
      'TypeScript is a programming language',
      MemoryType.KNOWLEDGE,
      MemoryCategory.TECHNICAL,
      {
        tags: ['typescript', 'programming'],
        privacyLevel: PrivacyLevel.SHARED
      }
    );

    // Search for memories
    const results = await protocol.searchMemories('TypeScript programming', {
      limit: 5
    });

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  test('should get memory statistics', async () => {
    await synaptic.start();
    const protocol = synaptic.getProtocol();

    // Create some memories
    await protocol.createMemory(
      'First memory',
      MemoryType.KNOWLEDGE,
      MemoryCategory.TECHNICAL
    );

    await protocol.createMemory(
      'Second memory',
      MemoryType.PREFERENCE,
      MemoryCategory.PERSONAL
    );

    // Get statistics
    const stats = await protocol.getMemoryStats();

    expect(stats).toBeDefined();
    expect(stats.totalMemories).toBeGreaterThan(0);
    expect(stats.memoriesByType).toBeDefined();
    expect(stats.memoriesByCategory).toBeDefined();
    expect(typeof stats.averageQuality).toBe('number');
    expect(typeof stats.totalRewards).toBe('bigint');
  });

  test('should handle memory updates', async () => {
    await synaptic.start();
    const protocol = synaptic.getProtocol();

    // Create a memory
    const memory = await protocol.createMemory(
      'Original content',
      MemoryType.KNOWLEDGE,
      MemoryCategory.TECHNICAL
    );

    // Update the memory
    const updatedMemory = await protocol.updateMemory(memory.id, {
      content: 'Updated content',
      tags: ['updated', 'test']
    });

    expect(updatedMemory.content).toBe('Updated content');
    expect(updatedMemory.tags).toContain('updated');
    expect(updatedMemory.tags).toContain('test');
    expect(updatedMemory.metadata.version).toBe(2);
  });

  test('should handle memory deletion', async () => {
    await synaptic.start();
    const protocol = synaptic.getProtocol();

    // Create a memory
    const memory = await protocol.createMemory(
      'Memory to delete',
      MemoryType.KNOWLEDGE,
      MemoryCategory.TECHNICAL
    );

    // Delete the memory
    await expect(protocol.deleteMemory(memory.id)).resolves.not.toThrow();
  });
}); 