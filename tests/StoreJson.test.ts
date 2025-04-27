import fs from 'fs';
import path from 'path';
import { StoreJson } from '../src/StoreJson';
import { Logger } from '../src/Logger';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
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

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset the store directly without calling save
    StoreJson._store = {};
  });

  describe('initialization', () => {
    it('should initialize with empty store when file does not exist', () => {
      // Mock file doesn't exist
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Reinitialize the store to use our mocks
      StoreJson._init?.();

      // We're testing that the store is empty by checking a non-existent key
      expect(StoreJson.get('anyKey')).toBeUndefined();
      expect(fs.existsSync).toHaveBeenCalledWith(StoreJson._filePath);
    });

    it('should load data from file when it exists', () => {
      // Mock file exists and contains data
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ testKey: 'testValue' }));

      // Reinitialize the store to use our mocks
      StoreJson._init?.();

      // Verify the file was read
      expect(fs.existsSync).toHaveBeenCalledWith(StoreJson._filePath);
      expect(fs.readFileSync).toHaveBeenCalledWith(StoreJson._filePath, 'utf-8');

      // Verify the data was loaded
      expect(StoreJson.get('testKey')).toBe('testValue');
    });

    it('should handle JSON parse errors during initialization', () => {
      // Mock file exists but contains invalid JSON
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

      // Reinitialize the store to use our mocks
      StoreJson._init?.();

      // Verify the file was read
      expect(fs.existsSync).toHaveBeenCalledWith(StoreJson._filePath);
      expect(fs.readFileSync).toHaveBeenCalledWith(StoreJson._filePath, 'utf-8');

      // Verify the store is empty despite the file existing
      expect(StoreJson.get('anyKey')).toBeUndefined();

      // Verify that the logger was called with a warning
      expect(StoreJson._logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[StoreJson] Failed to read or parse'),
        expect.any(Error)
      );
    });
  });

  describe('set and get', () => {
    it('should store and retrieve string values', () => {
      StoreJson.set('testKey', 'testValue');
      expect(StoreJson.get('testKey')).toBe('testValue');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should store and retrieve number values', () => {
      StoreJson.set('testKey', 123);
      expect(StoreJson.get('testKey')).toBe(123);
    });

    it('should store and retrieve boolean values', () => {
      StoreJson.set('testKey', true);
      expect(StoreJson.get('testKey')).toBe(true);
    });

    it('should store and retrieve object values', () => {
      const testObject = { name: 'test', value: 42 };
      StoreJson.set('testKey', testObject);
      expect(StoreJson.get('testKey')).toEqual(testObject);
    });

    it('should store and retrieve array values', () => {
      const testArray = [1, 2, 3, 'test'];
      StoreJson.set('testKey', testArray);
      expect(StoreJson.get('testKey')).toEqual(testArray);
    });

    it('should return undefined for non-existent keys', () => {
      expect(StoreJson.get('nonExistentKey')).toBeUndefined();
    });

    it('should overwrite existing values', () => {
      StoreJson.set('testKey', 'initialValue');
      StoreJson.set('testKey', 'updatedValue');
      expect(StoreJson.get('testKey')).toBe('updatedValue');
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    it('should handle file write errors', () => {
      // Mock writeFileSync to throw an error
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write error');
      });

      // The set should not throw, but the error should be handled internally
      expect(() => StoreJson.set('testKey', 'testValue')).not.toThrow();
      expect(fs.writeFileSync).toHaveBeenCalled();

      // Verify that the logger was called with a warning
      expect(StoreJson._logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[StoreJson] Failed to save'),
        expect.any(Error)
      );

      // Verify that the value was still set in memory
      expect(StoreJson.get('testKey')).toBe('testValue');
    });
  });

  describe('remove', () => {
    it('should remove a key-value pair', () => {
      StoreJson.set('testKey', 'testValue');
      StoreJson.remove('testKey');
      expect(StoreJson.get('testKey')).toBeUndefined();
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    it('should do nothing when removing a non-existent key', () => {
      StoreJson.remove('nonExistentKey');
      expect(StoreJson.get('nonExistentKey')).toBeUndefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should remove all key-value pairs', () => {
      StoreJson.set('key1', 'value1');
      StoreJson.set('key2', 'value2');
      StoreJson.clear();
      expect(StoreJson.get('key1')).toBeUndefined();
      expect(StoreJson.get('key2')).toBeUndefined();
      expect(StoreJson.keys()).toHaveLength(0);
      expect(fs.writeFileSync).toHaveBeenCalledTimes(3);
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      StoreJson.set('testKey', 'testValue');
      expect(StoreJson.has('testKey')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(StoreJson.has('nonExistentKey')).toBe(false);
    });
  });

  describe('keys', () => {
    it('should return all keys in the store', () => {
      StoreJson.set('key1', 'value1');
      StoreJson.set('key2', 'value2');
      const keys = StoreJson.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });

    it('should return an empty array when store is empty', () => {
      StoreJson.clear();
      expect(StoreJson.keys()).toEqual([]);
    });
  });

  describe('persistence', () => {
    it('should write to file when setting a value', () => {
      StoreJson.set('testKey', 'testValue');
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockFilePath,
        expect.any(String),
        'utf-8'
      );
    });

    it('should write to file when removing a value', () => {
      StoreJson.set('testKey', 'testValue');
      jest.clearAllMocks(); // Clear previous writeFileSync calls

      StoreJson.remove('testKey');
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockFilePath,
        expect.any(String),
        'utf-8'
      );
    });

    it('should write to file when clearing the store', () => {
      StoreJson.set('testKey', 'testValue');
      jest.clearAllMocks(); // Clear previous writeFileSync calls

      StoreJson.clear();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockFilePath,
        expect.any(String),
        'utf-8'
      );
    });

    it('should format JSON with indentation when writing to file', () => {
      StoreJson.set('testKey', 'testValue');
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockFilePath,
        JSON.stringify({ testKey: 'testValue' }, null, 2),
        'utf-8'
      );
    });
  });
});
