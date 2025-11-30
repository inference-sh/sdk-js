import { Inference, inference, InferenceConfig } from './client';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Inference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance with valid config', () => {
      const client = new Inference({ apiKey: 'test-api-key' });
      expect(client).toBeInstanceOf(Inference);
    });

    it('should throw error when apiKey is missing', () => {
      expect(() => new Inference({ apiKey: '' })).toThrow('API key is required');
      expect(() => new Inference({} as InferenceConfig)).toThrow('API key is required');
    });

    it('should use default baseUrl when not provided', () => {
      const client = new Inference({ apiKey: 'test-api-key' });
      expect(client).toBeDefined();
    });

    it('should accept custom baseUrl', () => {
      const client = new Inference({
        apiKey: 'test-api-key',
        baseUrl: 'https://custom-api.example.com',
      });
      expect(client).toBeDefined();
    });
  });

  describe('run', () => {
    it('should make a POST request to /run', async () => {
      const mockTask = {
        id: 'task-123',
        status: 9, // TaskStatusCompleted
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        input: { message: 'hello world' },
        output: { result: 'success' },
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockTask }),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      // Use input that won't trigger base64 detection (contains spaces/special chars)
      const result = await client.run(
        { app: 'test-app', input: { message: 'hello world!' } },
        { wait: false }
      );

      expect(result.id).toBe('task-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/run'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: { message: 'Invalid app' } }),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      await expect(
        client.run({ app: 'invalid-app', input: { message: 'test!' } }, { wait: false })
      ).rejects.toThrow('Invalid app');
    });
  });

  describe('cancel', () => {
    it('should make a POST request to cancel endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: null }),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      await client.cancel('task-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/task-123/cancel'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('backward compatibility', () => {
    it('should export lowercase inference as alias', () => {
      expect(inference).toBe(Inference);
    });

    it('should work with lowercase inference', () => {
      const client = new inference({ apiKey: 'test-api-key' });
      expect(client).toBeInstanceOf(Inference);
    });
  });
});

describe('uploadFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should upload a base64 string', async () => {
    const mockFile = {
      id: 'file-123',
      uri: 'https://example.com/file.png',
      upload_url: 'https://upload.example.com/signed-url',
    };

    mockFetch
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: [mockFile] }),
      })
      .mockResolvedValueOnce({ ok: true });

    const client = new Inference({ apiKey: 'test-api-key' });
    // Use valid base64 that won't be mistaken for regular text
    const result = await client.uploadFile('SGVsbG8gV29ybGQh', {
      filename: 'test.txt',
      contentType: 'text/plain',
    });

    expect(result.uri).toBe('https://example.com/file.png');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should throw error when no upload URL provided', async () => {
    const mockFile = {
      id: 'file-123',
      uri: 'https://example.com/file.png',
      // Missing upload_url
    };

    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, data: [mockFile] }),
    });

    const client = new Inference({ apiKey: 'test-api-key' });
    await expect(
      client.uploadFile('SGVsbG8gV29ybGQh', { filename: 'test.txt' })
    ).rejects.toThrow('No upload URL provided by the server');
  });
});
