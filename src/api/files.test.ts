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

    it('should decode URL-encoded (non-base64) data URIs', async () => {
      const fileRecord = {
        id: 'file-3',
        uri: 'inf://files/url-encoded',
        upload_url: 'https://upload.example.com/put',
        content_type: 'text/plain',
      };

      mockJsonResponse([fileRecord]);
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await api().upload('data:text/plain,Hello%20World');

      expect(result.uri).toBe('inf://files/url-encoded');
      const putCall = mockFetch.mock.calls[1];
      expect(putCall[1]?.headers).toMatchObject({ 'Content-Type': 'text/plain' });
    });

    it('should default media type to text/plain for data URIs without explicit type', async () => {
      const fileRecord = {
        id: 'file-4',
        uri: 'inf://files/default-mt',
        upload_url: 'https://upload.example.com/put',
        content_type: 'text/plain',
      };

      mockJsonResponse([fileRecord]);
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      await api().upload('data:;base64,SGVsbG8=');

      const putCall = mockFetch.mock.calls[1];
      expect(putCall[1]?.headers).toMatchObject({ 'Content-Type': 'text/plain' });
    });

    it('should throw when server does not return upload_url', async () => {
      mockJsonResponse([{ id: 'file-x', uri: '', upload_url: undefined }]);

      await expect(api().upload('data:text/plain,hello')).rejects.toThrow(
        'No upload URL provided by the server'
      );
    });

    it('should throw when PUT to upload_url fails', async () => {
      const fileRecord = {
        id: 'file-5',
        uri: 'inf://files/fail-put',
        upload_url: 'https://upload.example.com/put',
        content_type: 'text/plain',
      };

      mockJsonResponse([fileRecord]);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(api().upload('data:text/plain,hello')).rejects.toThrow(
        'Failed to upload file content'
      );
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
