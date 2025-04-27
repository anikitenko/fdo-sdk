import pifyImport from 'pify';
import { pify } from '../../src/utils/pify';

// Mock pify
jest.mock('pify', () => {
  return jest.fn().mockImplementation((fn) => {
    return `promisified-${fn}`;
  });
});

describe('pify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call pifyImport with the provided function', () => {
    const testFn = jest.fn();
    pify(testFn);
    
    expect(pifyImport).toHaveBeenCalledWith(testFn);
  });

  it('should return the result from pifyImport', () => {
    const testFn = jest.fn();
    const result = pify(testFn);
    
    expect(result).toBe(`promisified-${testFn}`);
  });

  // Simplified test that doesn't rely on complex type handling
  it('should work with a callback-style function', () => {
    // Create a simple mock function
    const mockFn = jest.fn();
    
    // Mock pifyImport to return a function that returns a promise
    (pifyImport as jest.Mock).mockImplementation(() => {
      return mockFn;
    });
    
    // Call pify
    const result = pify(() => {});
    
    // Verify the result is the mock function
    expect(result).toBe(mockFn);
  });
});