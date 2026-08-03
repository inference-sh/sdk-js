import { HttpClient } from '../http/client';
import { FilesAPI, resolveUpload } from './files';

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
    mockFetch.mockReset();
  });

  const api = () => new FilesAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST /files/list for list()', async () => {
    const page = { items: [{ id: 'file-1' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().list({ limit: 10 });

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/files/list');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ limit: 10 });
  });

  it('should GET /files/{id} for get()', async () => {
    const file = { id: 'file-1', uri: 'inf://files/abc' };
    mockJsonResponse(file);

    const result = await api().get('file-1');

    expect(result).toEqual(file);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/files/file-1');
    expect(init.method).toBe('GET');
  });

  it('should DELETE /files/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('file-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/files/file-1');
    expect(init.method).toBe('DELETE');
  });

  describe('processInput', () => {
    it('should return falsy inputs unchanged without uploading', async () => {
      await expect(api().processInput(null)).resolves.toBeNull();
      await expect(api().processInput(undefined)).resolves.toBeUndefined();
      await expect(api().processInput(0)).resolves.toBe(0);
      await expect(api().processInput(false)).resolves.toBe(false);
      await expect(api().processInput('')).resolves.toBe('');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not treat short plain strings as base64 file uploads', async () => {
      const result = await api().processInput({ key: 'key1', note: 'hello' });
      expect(result).toEqual({ key: 'key1', note: 'hello' });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should reject invalid nested data URIs before any network call', async () => {
      await expect(
        api().processInput({ image: 'data:invalid' })
      ).rejects.toThrow('Invalid data URI format');
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

    it('should upload top-level Blob values', async () => {
      const fileRecord = {
        id: 'file-blob',
        uri: 'inf://files/blob',
        upload_url: 'https://upload.example.com/put',
        content_type: 'image/png',
      };

      mockJsonResponse([fileRecord]);
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const blob = new Blob(['png-bytes'], { type: 'image/png' });
      const result = await api().processInput(blob);

      expect(result).toBe('inf://files/blob');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should process arrays recursively', async () => {
      const fileRecord = {
        id: 'file-arr',
        uri: 'inf://files/arr',
        upload_url: 'https://upload.example.com/put',
        content_type: 'image/png',
      };

      mockJsonResponse([fileRecord]);
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const input = ['plain', 'data:image/png;base64,iVBORw0KGgo='];
      const result = (await api().processInput(input)) as string[];

      expect(result[0]).toBe('plain');
      expect(result[1]).toBe('inf://files/arr');
    });

    it('should upload long raw base64 strings', async () => {
      const fileRecord = {
        id: 'file-b64',
        uri: 'inf://files/b64',
        upload_url: 'https://upload.example.com/put',
        content_type: 'application/octet-stream',
      };

      mockJsonResponse([fileRecord]);
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const rawBase64 = 'A'.repeat(64);
      const result = await api().processInput(rawBase64);

      expect(result).toBe('inf://files/b64');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('resolveUpload data URI validation', () => {
    it('should throw synchronously for malformed data URIs without a comma separator', () => {
      expect(() => resolveUpload('data:invalid')).toThrow('Invalid data URI format');
    });

    it('should throw synchronously for invalid base64 payload in data URIs', () => {
      expect(() => resolveUpload('data:text/plain;base64,!!!')).toThrow();
    });
  });

  describe('resolveUpload content type inference', () => {
    it('should infer content type from filename extension when Blob.type is empty', () => {
      const blob = new Blob(['jpeg-bytes']);
      const resolved = resolveUpload(blob, { filename: 'photo.jpg' });

      expect(resolved.contentType).toBe('image/jpeg');
      expect(resolved.filename).toBe('photo.jpg');
      expect(resolved.body).toBe(blob);
    });

    it('should infer content type from File name when type is empty', () => {
      const file = new File(['pdf-bytes'], 'report.pdf');
      const resolved = resolveUpload(file);

      expect(resolved.contentType).toBe('application/pdf');
      expect(resolved.filename).toBe('report.pdf');
    });

    it('should prefer explicit Blob.type over filename extension', () => {
      const blob = new Blob(['png-bytes'], { type: 'image/png' });
      const resolved = resolveUpload(blob, { filename: 'photo.jpg' });

      expect(resolved.contentType).toBe('image/png');
    });
  });

  describe('upload', () => {
    it('should reject invalid data URI format before any network call', async () => {
      await expect(api().upload('data:invalid')).rejects.toThrow('Invalid data URI format');
      expect(mockFetch).not.toHaveBeenCalled();
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

    it('should upload Blob content with inferred content type and size', async () => {
      const fileRecord = {
        id: 'file-blob',
        uri: 'inf://files/blob-direct',
        upload_url: 'https://upload.example.com/put',
        content_type: 'image/jpeg',
      };

      mockJsonResponse([fileRecord]);
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const blob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
      const result = await api().upload(blob, { filename: 'photo.jpg' });

      expect(result.uri).toBe('inf://files/blob-direct');

      const [, createInit] = mockFetch.mock.calls[0] as [string, RequestInit];
      const createBody = JSON.parse(createInit.body as string);
      expect(createBody.files[0]).toMatchObject({
        filename: 'photo.jpg',
        content_type: 'image/jpeg',
        size: blob.size,
      });

      const [, putInit] = mockFetch.mock.calls[1] as [string, RequestInit];
      expect(putInit.method).toBe('PUT');
      expect(putInit.body).toBe(blob);
      expect(putInit.headers).toMatchObject({ 'Content-Type': 'image/jpeg' });
    });

    it('should extract filename from File objects when options.filename is omitted', async () => {
      const fileRecord = {
        id: 'file-named',
        uri: 'inf://files/named',
        upload_url: 'https://upload.example.com/put',
        content_type: 'application/pdf',
      };

      mockJsonResponse([fileRecord]);
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const file = new File(['pdf-bytes'], 'report.pdf', { type: 'application/pdf' });
      await api().upload(file);

      const [, createInit] = mockFetch.mock.calls[0] as [string, RequestInit];
      const createBody = JSON.parse(createInit.body as string);
      expect(createBody.files[0].filename).toBe('report.pdf');
      expect(createBody.files[0].content_type).toBe('application/pdf');
    });

    it('should use explicit contentType when Blob type is empty', async () => {
      const fileRecord = {
        id: 'file-octet',
        uri: 'inf://files/octet',
        upload_url: 'https://upload.example.com/put',
        content_type: 'application/octet-stream',
      };

      mockJsonResponse([fileRecord]);
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const blob = new Blob(['raw']);
      await api().upload(blob, { contentType: 'application/octet-stream' });

      const [, createInit] = mockFetch.mock.calls[0] as [string, RequestInit];
      const createBody = JSON.parse(createInit.body as string);
      expect(createBody.files[0].content_type).toBe('application/octet-stream');
    });

    it('should infer content type from filename when Blob.type is empty', async () => {
      const fileRecord = {
        id: 'file-jpg',
        uri: 'inf://files/jpg',
        upload_url: 'https://upload.example.com/put',
        content_type: 'image/jpeg',
      };

      mockJsonResponse([fileRecord]);
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const blob = new Blob(['jpeg-bytes']);
      await api().upload(blob, { filename: 'snapshot.jpg' });

      const [, createInit] = mockFetch.mock.calls[0] as [string, RequestInit];
      const createBody = JSON.parse(createInit.body as string);
      expect(createBody.files[0]).toMatchObject({
        filename: 'snapshot.jpg',
        content_type: 'image/jpeg',
      });
    });

    it('should upload clean base64 strings without a data URI prefix', async () => {
      const fileRecord = {
        id: 'file-b64-direct',
        uri: 'inf://files/b64-direct',
        upload_url: 'https://upload.example.com/put',
        content_type: 'text/plain',
      };

      mockJsonResponse([fileRecord]);
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await api().upload('SGVsbG8=', { contentType: 'text/plain' });

      expect(result.uri).toBe('inf://files/b64-direct');
      const [, putInit] = mockFetch.mock.calls[1] as [string, RequestInit];
      expect(putInit.headers).toMatchObject({ 'Content-Type': 'text/plain' });
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
