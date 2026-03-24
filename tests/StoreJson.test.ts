import fs from 'fs';
import path from 'path';
import { createJsonStore, StoreJson } from '../src/StoreJson';
import { Logger } from '../src/Logger';
import { atomicWriteFile } from '../src/utils/atomic';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../src/utils/atomic', () => ({
  atomicWriteFile: jest.fn().mockResolvedValue(undefined),
}));

// Mock Logger
jest.mock('../src/Logger', () => {
  return {
    Logger: jest.fn().mockImplementation(() => {
      return {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        silly: jest.fn(),
        log: jest.fn()
      };
    })
  };
});

describe('StoreJson', () => {
  const mockFilePath = path.resolve(process.cwd(), '.store.json');
  let store: ReturnType<typeof createJsonStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createJsonStore({ filePath: mockFilePath, logger: new Logger() as any });
    store._store = {};
  });

  describe('initialization', () => {
    it('should initialize with empty store when file does not exist', () => {
      // Mock file doesn't exist
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Reinitialize the store to use our mocks
      store._init?.();

      // We're testing that the store is empty by checking a non-existent key
      expect(store.get('anyKey')).toBeUndefined();
      expect(fs.existsSync).toHaveBeenCalledWith(store._filePath);
    });

    it('should load data from file when it exists', () => {
      // Mock file exists and contains data
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ testKey: 'testValue' }));

      // Reinitialize the store to use our mocks
      store._init?.();

      // Verify the file was read
      expect(fs.existsSync).toHaveBeenCalledWith(store._filePath);
      expect(fs.readFileSync).toHaveBeenCalledWith(store._filePath, 'utf-8');

      // Verify the data was loaded
      expect(store.get('testKey')).toBe('testValue');
    });

    it('should handle JSON parse errors during initialization', () => {
      // Mock file exists but contains invalid JSON
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

      // Reinitialize the store to use our mocks
      store._init?.();

      // Verify the file was read
      expect(fs.existsSync).toHaveBeenCalledWith(store._filePath);
      expect(fs.readFileSync).toHaveBeenCalledWith(store._filePath, 'utf-8');

      // Verify the store is empty despite the file existing
      expect(store.get('anyKey')).toBeUndefined();

      // Verify that the logger was called with a warning
      expect(store._logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[StoreJson] Failed to read or parse'),
        expect.any(Error)
      );
    });
  });

  describe('set and get', () => {
    it('should store and retrieve string values', () => {
      store.set('testKey', 'testValue');
      expect(store.get('testKey')).toBe('testValue');
    });

    it('should store and retrieve number values', () => {
      store.set('testKey', 123);
      expect(store.get('testKey')).toBe(123);
    });

    it('should store and retrieve boolean values', () => {
      store.set('testKey', true);
      expect(store.get('testKey')).toBe(true);
    });

    it('should store and retrieve object values', () => {
      const testObject = { name: 'test', value: 42 };
      store.set('testKey', testObject);
      expect(store.get('testKey')).toEqual(testObject);
    });

    it('should store and retrieve array values', () => {
      const testArray = [1, 2, 3, 'test'];
      store.set('testKey', testArray);
      expect(store.get('testKey')).toEqual(testArray);
    });

    it('should return undefined for non-existent keys', () => {
      expect(store.get('nonExistentKey')).toBeUndefined();
    });

    it('should overwrite existing values', () => {
      store.set('testKey', 'initialValue');
      store.set('testKey', 'updatedValue');
      expect(store.get('testKey')).toBe('updatedValue');
    });

    it('should handle file write errors', async () => {
      (atomicWriteFile as jest.Mock).mockRejectedValue(new Error('Write error'));

      expect(() => store.set('testKey', 'testValue')).not.toThrow();
      await store._flush();
      expect(atomicWriteFile).toHaveBeenCalled();

      // Verify that the logger was called with a warning
      expect(store._logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[StoreJson] Failed to save'),
        expect.any(Error)
      );

      // Verify that the value was still set in memory
      expect(store.get('testKey')).toBe('testValue');
    });
  });

  describe('remove', () => {
    it('should remove a key-value pair', () => {
      store.set('testKey', 'testValue');
      store.remove('testKey');
      expect(store.get('testKey')).toBeUndefined();
    });

    it('should do nothing when removing a non-existent key', () => {
      store.remove('nonExistentKey');
      expect(store.get('nonExistentKey')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should remove all key-value pairs', () => {
      store.set('key1', 'value1');
      store.set('key2', 'value2');
      store.clear();
      expect(store.get('key1')).toBeUndefined();
      expect(store.get('key2')).toBeUndefined();
      expect(store.keys()).toHaveLength(0);
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      store.set('testKey', 'testValue');
      expect(store.has('testKey')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(store.has('nonExistentKey')).toBe(false);
    });
  });

  describe('keys', () => {
    it('should return all keys in the store', () => {
      store.set('key1', 'value1');
      store.set('key2', 'value2');
      const keys = store.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });

    it('should return an empty array when store is empty', () => {
      store.clear();
      expect(store.keys()).toEqual([]);
    });
  });

  describe('persistence', () => {
    it('should write to file when setting a value', async () => {
      store.set('testKey', 'testValue');
      await store._flush();
      expect(fs.promises.mkdir).toHaveBeenCalledWith(path.dirname(mockFilePath), { recursive: true });
      expect(atomicWriteFile).toHaveBeenCalledWith(
        mockFilePath,
        expect.any(String),
        { encoding: 'utf-8' }
      );
    });

    it('should write to file when removing a value', async () => {
      store.set('testKey', 'testValue');
      await store._flush();
      jest.clearAllMocks();

      store.remove('testKey');
      await store._flush();
      expect(atomicWriteFile).toHaveBeenCalledWith(
        mockFilePath,
        expect.any(String),
        { encoding: 'utf-8' }
      );
    });

    it('should write to file when clearing the store', async () => {
      store.set('testKey', 'testValue');
      await store._flush();
      jest.clearAllMocks();

      store.clear();
      await store._flush();
      expect(atomicWriteFile).toHaveBeenCalledWith(
        mockFilePath,
        expect.any(String),
        { encoding: 'utf-8' }
      );
    });

    it('should format JSON with indentation when writing to file', async () => {
      store.set('testKey', 'testValue');
      await store._flush();
      expect(atomicWriteFile).toHaveBeenCalledWith(
        mockFilePath,
        JSON.stringify({ testKey: 'testValue' }, null, 2),
        { encoding: 'utf-8' }
      );
    });
  });

  it('should back up corrupted JSON content and reset store', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('{bad json');

    store._init();

    await Promise.resolve();

    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('.store.json.corrupt-'),
      '{bad json',
      'utf-8'
    );
    expect(store.keys()).toEqual([]);
  });

  it('should keep legacy StoreJson export available for direct imports', () => {
    expect(StoreJson).toBeDefined();
    expect(typeof StoreJson.get).toBe('function');
  });
});
