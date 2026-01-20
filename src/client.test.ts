import { Inference, inference, InferenceConfig } from './client';
import { RequirementsNotMetException } from './errors';

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

    it('should throw error when neither apiKey nor proxyUrl is provided', () => {
      expect(() => new Inference({ apiKey: '' })).toThrow('Either apiKey or proxyUrl is required');
      expect(() => new Inference({} as InferenceConfig)).toThrow('Either apiKey or proxyUrl is required');
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

      const responseData = { success: true, data: mockTask };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        json: () => Promise.resolve(responseData),
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
      const responseData = { success: false, error: { message: 'Invalid app' } };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        json: () => Promise.resolve(responseData),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      await expect(
        client.run({ app: 'invalid-app', input: { message: 'test!' } }, { wait: false })
      ).rejects.toThrow('Invalid app');
    });

    it('should throw RequirementsNotMetException on 412 with errors', async () => {
      const requirementErrors = [
        {
          type: 'secret',
          key: 'OPENAI_API_KEY',
          message: 'Missing secret: OPENAI_API_KEY',
          action: { type: 'add_secret', secret_key: 'OPENAI_API_KEY' },
        },
        {
          type: 'integration',
          key: 'google',
          message: 'Integration not connected: google',
          action: { type: 'connect', provider: 'google' },
        },
      ];
      const responseData = { errors: requirementErrors };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 412,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        json: () => Promise.resolve(responseData),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      try {
        await client.run({ app: 'test-app', input: { message: 'test!' } }, { wait: false });
        fail('Expected RequirementsNotMetException to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(RequirementsNotMetException);
        const exception = e as RequirementsNotMetException;
        expect(exception.errors).toHaveLength(2);
        expect(exception.errors[0].type).toBe('secret');
        expect(exception.errors[0].key).toBe('OPENAI_API_KEY');
        expect(exception.errors[1].type).toBe('integration');
        expect(exception.statusCode).toBe(412);
        expect(exception.message).toBe('Missing secret: OPENAI_API_KEY');
      }
    });

    it('should include action details in RequirementsNotMetException', async () => {
      const requirementErrors = [
        {
          type: 'scope',
          key: 'calendar.readonly',
          message: 'Missing scope: calendar.readonly',
          action: {
            type: 'add_scopes',
            provider: 'google',
            scopes: ['calendar.readonly', 'calendar.events'],
          },
        },
      ];
      const responseData = { errors: requirementErrors };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 412,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        json: () => Promise.resolve(responseData),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      try {
        await client.run({ app: 'test-app', input: {} }, { wait: false });
        fail('Expected RequirementsNotMetException to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(RequirementsNotMetException);
        const exception = e as RequirementsNotMetException;
        expect(exception.errors[0].action?.type).toBe('add_scopes');
        expect(exception.errors[0].action?.scopes).toEqual(['calendar.readonly', 'calendar.events']);
      }
    });
  });

  describe('cancel', () => {
    it('should make a POST request to cancel endpoint', async () => {
      const responseData = { success: true, data: null };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        json: () => Promise.resolve(responseData),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      await client.cancel('task-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/task-123/cancel'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('lowercase factory', () => {
    it('should export lowercase inference factory', () => {
      expect(typeof inference).toBe('function');
    });

    it('should work with lowercase inference factory', () => {
      const client = inference({ apiKey: 'test-api-key' });
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

    const responseData = { success: true, data: [mockFile] };
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        json: () => Promise.resolve(responseData),
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

    const responseData = { success: true, data: [mockFile] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(responseData)),
      json: () => Promise.resolve(responseData),
    });

    const client = new Inference({ apiKey: 'test-api-key' });
    await expect(
      client.uploadFile('SGVsbG8gV29ybGQh', { filename: 'test.txt' })
    ).rejects.toThrow('No upload URL provided by the server');
  });
});
