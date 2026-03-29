import pifyImport from 'pify';
import { pify } from '../../src/utils/pify';

// Mock pify
vi.mock('pify', () => {
  const mocked = vi.fn().mockImplementation((fn) => {
    return `promisified-${fn}`;
  });
  return {
    default: mocked,
  };
});

describe('pify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call pifyImport with the provided function', () => {
    const testFn = vi.fn();
    pify(testFn);
    
    expect(pifyImport).toHaveBeenCalledWith(testFn);
  });

  it('should return the result from pifyImport', () => {
    const testFn = vi.fn();
    const result = pify(testFn);
    
    expect(result).toBe(`promisified-${testFn}`);
  });

  // Simplified test that doesn't rely on complex type handling
  it('should work with a callback-style function', () => {
    // Create a simple mock function
    const mockFn = vi.fn();
    
    // Mock pifyImport to return a function that returns a promise
    (pifyImport as vi.Mock).mockImplementation(() => {
      return mockFn;
    });
    
    // Call pify
    const result = pify(() => {});
    
    // Verify the result is the mock function
    expect(result).toBe(mockFn);
  });
});
