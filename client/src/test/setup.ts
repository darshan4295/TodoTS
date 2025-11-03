import '@testing-library/jest-dom';

// Mock axios more comprehensively
import { vi } from 'vitest';

const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

// Export the mock instance for use in tests
export { mockAxiosInstance };
