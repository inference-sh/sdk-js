import { HttpClient } from '../http/client';
import { FilesAPI } from './files';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('FilesAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new FilesAPI(new HttpClient({ apiKey: 'test-key' }));

  describe('processInput', () => {
    it('should not treat short plain strings as base64 file uploads', async () => {
      const result = await api().processInput({ key: 'key1', note: 'hello' });
      expect(result).toEqual({ key: 'key1', note: 'hello' });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should upload data URIs embedded in nested objects', async () => {
      const fileRecord = {
        id: 'file-1',
        uri: 'inf://files/abc',
        upload_url: 'https://upload.example.com/put',
        content_type: 'image/png',
      };

      mockJsonResponse([fileRecord]);
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const input = {
        prompt: 'draw',
        image: 'data:image/png;base64,iVBORw0KGgo=',
      };

      const result = (await api().processInput(input)) as Record<string, unknown>;

      expect(result.prompt).toBe('draw');
      expect(result.image).toBe('inf://files/abc');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('upload', () => {
    it('should reject invalid data URI format when uploading content', async () => {
      mockJsonResponse([{ id: 'file-x', uri: '', upload_url: 'https://upload.example.com/put' }]);

      await expect(api().upload('data:invalid')).rejects.toThrow('Invalid data URI format');
    });

    it('should decode URL-safe base64 in data URIs', async () => {
      const fileRecord = {
        id: 'file-2',
        uri: 'inf://files/def',
        upload_url: 'https://upload.example.com/put',
        content_type: 'text/plain',
      };

      mockJsonResponse([fileRecord]);
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      // "SGVsbG8" is "Hello" in standard base64; URL-safe variant uses '-' instead of '+'
      const dataUri = 'data:text/plain;base64,SGVsbG8';

      const result = await api().upload(dataUri);

      expect(result.uri).toBe('inf://files/def');
      const putCall = mockFetch.mock.calls[1];
      expect(putCall[0]).toBe('https://upload.example.com/put');
      expect(putCall[1]?.method).toBe('PUT');
    });
  });
});
