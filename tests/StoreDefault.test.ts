import { StoreDefault } from '../src/StoreDefault';

describe('StoreDefault', () => {
  // Create a spy on Object.keys to ensure it's called
  const originalObjectKeys = Object.keys;

  beforeAll(() => {
    // Replace Object.keys with a spy
    Object.keys = jest.fn().mockImplementation(originalObjectKeys);
  });

  afterAll(() => {
    // Restore original Object.keys
    Object.keys = originalObjectKeys;
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Clear the store before each test
    StoreDefault.clear()
  });

  describe('set and get', () => {
    it('should store and retrieve string values', () => {
      StoreDefault.set('testKey', 'testValue');
      expect(StoreDefault.get('testKey')).toBe('testValue');
    });

    it('should store and retrieve number values', () => {
      StoreDefault.set('testKey', 123);
      expect(StoreDefault.get('testKey')).toBe(123);
    });

    it('should store and retrieve boolean values', () => {
      StoreDefault.set('testKey', true);
      expect(StoreDefault.get('testKey')).toBe(true);
    });

    it('should store and retrieve object values', () => {
      const testObject = { name: 'test', value: 42 };
      StoreDefault.set('testKey', testObject);
      expect(StoreDefault.get('testKey')).toEqual(testObject);
    });

    it('should store and retrieve array values', () => {
      const testArray = [1, 2, 3, 'test'];
      StoreDefault.set('testKey', testArray);
      expect(StoreDefault.get('testKey')).toEqual(testArray);
    });

    it('should return undefined for non-existent keys', () => {
      expect(StoreDefault.get('nonExistentKey')).toBeUndefined();
    });

    it('should use hasOwnProperty to check for key existence', () => {
      // Create an object with a property in its prototype chain
      const proto = { inheritedKey: 'inheritedValue' };
      const obj = Object.create(proto);
      obj.ownKey = 'ownValue';

      // Mock the internal memory object to be our test object
      const storeDefaultAny = StoreDefault as any;
      const originalMemory = storeDefaultAny.memory;
      storeDefaultAny.memory = obj;

      // Should only return values for own properties, not inherited ones
      expect(StoreDefault.get('ownKey')).toBe('ownValue');
      expect(StoreDefault.get('inheritedKey')).toBeUndefined();

      // Restore original memory
      storeDefaultAny.memory = originalMemory;
    });

    it('should overwrite existing values', () => {
      StoreDefault.set('testKey', 'initialValue');
      StoreDefault.set('testKey', 'updatedValue');
      expect(StoreDefault.get('testKey')).toBe('updatedValue');
    });
  });

  describe('remove', () => {
    it('should remove a key-value pair', () => {
      StoreDefault.set('testKey', 'testValue');
      StoreDefault.remove('testKey');
      expect(StoreDefault.get('testKey')).toBeUndefined();
    });

    it('should do nothing when removing a non-existent key', () => {
      StoreDefault.remove('nonExistentKey');
      expect(StoreDefault.get('nonExistentKey')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should remove all key-value pairs', () => {
      StoreDefault.set('key1', 'value1');
      StoreDefault.set('key2', 'value2');
      StoreDefault.clear();
      expect(StoreDefault.get('key1')).toBeUndefined();
      expect(StoreDefault.get('key2')).toBeUndefined();
      expect(StoreDefault.keys()).toHaveLength(0);
    });

    it('should use for...in loop to clear all properties', () => {
      // Create an object with multiple properties
      const storeDefaultAny = StoreDefault as any;
      const originalMemory = storeDefaultAny.memory;

      // Create a new memory object with a spy on delete
      const memory = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      };

      // Create a spy to track property deletions
      const deletePropertySpy = jest.fn();
      const handler = {
        deleteProperty: (target: any, prop: string) => {
          deletePropertySpy(prop);
          delete target[prop];
          return true;
        }
      };

      // Use a Proxy to intercept delete operations
      storeDefaultAny.memory = new Proxy(memory, handler);

      // Call clear
      StoreDefault.clear();

      // Verify that delete was called for each property
      expect(deletePropertySpy).toHaveBeenCalledTimes(3);
      expect(deletePropertySpy).toHaveBeenCalledWith('key1');
      expect(deletePropertySpy).toHaveBeenCalledWith('key2');
      expect(deletePropertySpy).toHaveBeenCalledWith('key3');

      // Verify that all properties were deleted
      expect(Object.keys(memory)).toHaveLength(0);

      // Restore original memory
      storeDefaultAny.memory = originalMemory;
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      StoreDefault.set('testKey', 'testValue');
      expect(StoreDefault.has('testKey')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(StoreDefault.has('nonExistentKey')).toBe(false);
    });

    it('should use the "in" operator to check for key existence', () => {
      // Create an object with a property in its prototype chain
      const proto = { inheritedKey: 'inheritedValue' };
      const obj = Object.create(proto);
      obj.ownKey = 'ownValue';

      // Mock the internal memory object to be our test object
      const storeDefaultAny = StoreDefault as any;
      const originalMemory = storeDefaultAny.memory;
      storeDefaultAny.memory = obj;

      // The "in" operator should return true for both own and inherited properties
      expect(StoreDefault.has('ownKey')).toBe(true);
      expect(StoreDefault.has('inheritedKey')).toBe(true);
      expect(StoreDefault.has('nonExistentKey')).toBe(false);

      // Restore original memory
      storeDefaultAny.memory = originalMemory;
    });
  });

  describe('keys', () => {
    it('should return all keys in the store', () => {
      StoreDefault.set('key1', 'value1');
      StoreDefault.set('key2', 'value2');
      const keys = StoreDefault.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);

      // Verify that Object.keys was called
      expect(Object.keys).toHaveBeenCalled();
    });

    it('should return an empty array when store is empty', () => {
      StoreDefault.clear();
      expect(StoreDefault.keys()).toEqual([]);

      // Verify that Object.keys was called
      expect(Object.keys).toHaveBeenCalled();
    });

    it('should only return own enumerable properties', () => {
      // Create an object with a property in its prototype chain
      const proto = { inheritedKey: 'inheritedValue' };
      const obj = Object.create(proto);
      obj.ownKey = 'ownValue';

      // Add a non-enumerable property
      Object.defineProperty(obj, 'nonEnumerableKey', {
        value: 'nonEnumerableValue',
        enumerable: false
      });

      // Mock the internal memory object to be our test object
      const storeDefaultAny = StoreDefault as any;
      const originalMemory = storeDefaultAny.memory;
      storeDefaultAny.memory = obj;

      // Object.keys should only return own enumerable properties
      const keys = StoreDefault.keys();
      expect(keys).toContain('ownKey');
      expect(keys).not.toContain('inheritedKey');
      expect(keys).not.toContain('nonEnumerableKey');

      // Restore original memory
      storeDefaultAny.memory = originalMemory;
    });
  });
});
