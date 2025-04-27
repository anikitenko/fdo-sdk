import { atomicWriteFile, atomicWriteFileSync } from '../../src/utils/atomic';

// Mock the write-file-atomic module
jest.mock('write-file-atomic', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation((...args: any[]) => {
      return Promise.resolve();
    }),
  };
});

// Import after mocking
import writeFileAtomicImport from 'write-file-atomic';

// Add sync method to the mock
(writeFileAtomicImport as any).sync = jest.fn();

describe('atomic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('atomicWriteFile', () => {
    it('should call writeFileAtomicImport with the correct parameters', async () => {
      const filePath = '/path/to/file.txt';
      const content = 'test content';
      const options = { mode: 0o644 };

      await atomicWriteFile(filePath, content, options);

      // Verify writeFileAtomicImport was called with the correct parameters
      expect(writeFileAtomicImport).toHaveBeenCalledWith(filePath, content, options);
    });

    it('should handle string content', async () => {
      const filePath = '/path/to/file.txt';
      const content = 'test content';

      await atomicWriteFile(filePath, content);

      // Verify writeFileAtomicImport was called with the correct parameters
      expect(writeFileAtomicImport).toHaveBeenCalledWith(filePath, content, undefined);
    });
  });

  describe('atomicWriteFileSync', () => {
    it('should call writeFileAtomicImport.sync with the correct parameters', () => {
      const filePath = '/path/to/file.txt';
      const content = 'test content';
      const options = { mode: 0o644 };

      atomicWriteFileSync(filePath, content, options);

      // Verify writeFileAtomicImport.sync was called with the correct parameters
      expect((writeFileAtomicImport as any).sync).toHaveBeenCalledWith(filePath, content, options);
    });

    it('should handle string content', () => {
      const filePath = '/path/to/file.txt';
      const content = 'test content';

      atomicWriteFileSync(filePath, content);

      // Verify writeFileAtomicImport.sync was called with the correct parameters
      expect((writeFileAtomicImport as any).sync).toHaveBeenCalledWith(filePath, content, undefined);
    });
  });
});