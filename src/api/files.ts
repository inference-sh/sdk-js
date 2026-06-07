import { HttpClient } from '../http/client';
import { PartialFile, File, CursorListRequest, CursorListResponse } from '../types';

/**
 * Parse a data URI and return the media type and decoded data.
 *
 * Supports formats:
 * - data:image/jpeg;base64,/9j/4AAQ...
 * - data:text/plain,Hello%20World
 * - data:;base64,SGVsbG8= (defaults to text/plain)
 */
function parseDataUri(uri: string): { mediaType: string; data: Uint8Array } {
  // Match: data:[<mediatype>][;base64],<data>
  const match = uri.match(/^data:([^;,]*)?(?:;(base64))?,(.*)$/s);
  if (!match) {
    throw new Error('Invalid data URI format');
  }

  const mediaType = match[1] || 'text/plain';
  const isBase64 = match[2] === 'base64';
  let dataStr = match[3];

  if (isBase64) {
    // Handle URL-safe base64 (- and _ instead of + and /)
    dataStr = dataStr.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padding = 4 - (dataStr.length % 4);
    if (padding !== 4) {
      dataStr += '='.repeat(padding);
    }
    const binaryStr = atob(dataStr);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return { mediaType, data: bytes };
  } else {
    // URL-encoded data
    const decoded = decodeURIComponent(dataStr);
    const encoder = new TextEncoder();
    return { mediaType, data: encoder.encode(decoded) };
  }
}

export interface UploadFileOptions {
  filename?: string;
  contentType?: string;
  path?: string;
  public?: boolean;
}

/**
 * Files API
 */
export class FilesAPI {
  constructor(private readonly http: HttpClient) {}

  /**
   * List files with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<CursorListResponse<File>> {
    return this.http.request<CursorListResponse<File>>('post', '/files/list', { data: params });
  }

  /**
   * Get a file by ID
   */
  async get(fileId: string): Promise<File> {
    return this.http.request<File>('get', `/files/${fileId}`);
  }

  /**
   * Delete a file
   */
  async delete(fileId: string): Promise<void> {
    return this.http.request<void>('delete', `/files/${fileId}`);
  }

  /**
   * Upload a file (Blob or base64 string)
   */
  async upload(data: string | Blob, options: UploadFileOptions = {}): Promise<File> {
    // Determine content type
    let contentType = options.contentType;
    if (!contentType) {
      if (data instanceof Blob) {
        contentType = data.type;
      } else if (typeof data === 'string' && data.startsWith('data:')) {
        // Extract media type from data URI
        const match = data.match(/^data:([^;,]*)?/);
        contentType = match?.[1] || 'application/octet-stream';
      } else {
        contentType = 'application/octet-stream';
      }
    }

    // Extract filename from File object if not provided in options
    let filename = options.filename;
    if (!filename && data instanceof globalThis.File) {
      filename = data.name;
    }

    // Step 1: Create the file record
    const fileRequest: PartialFile = {
      uri: '', // Empty URI as it will be set by the server
      filename,
      content_type: contentType,
      path: options.path,
      size: data instanceof Blob ? data.size : undefined,
    };

    const response = await this.http.request<File[]>('post', '/files', {
      data: { files: [fileRequest] },
    });

    const file = response[0];

    // Step 2: Upload the file content to the provided upload_url
    if (!file.upload_url) {
      throw new Error('No upload URL provided by the server');
    }

    let contentToUpload: Blob;
    if (data instanceof Blob) {
      contentToUpload = data;
    } else {
      // If it's a base64 string, convert it to a Blob
      if (data.startsWith('data:')) {
        const parsed = parseDataUri(data);
        contentToUpload = new Blob([parsed.data.buffer as ArrayBuffer], { type: parsed.mediaType });
      } else {
        // Assume it's a clean base64 string
        const binaryStr = atob(data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        contentToUpload = new Blob([bytes.buffer as ArrayBuffer], { type: options.contentType || 'application/octet-stream' });
      }
    }

    // Upload to S3 using the signed URL
    const uploadResponse = await fetch(file.upload_url, {
      method: 'PUT',
      body: contentToUpload,
      headers: {
        'Content-Type': contentToUpload.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file content: ${uploadResponse.statusText}`);
    }

    return file;
  }

  /**
   * Process input data and upload any files (Blobs, base64 strings)
   * Returns the processed input with file URIs replacing file data
   */
  async processInput(input: unknown, path: string = 'root'): Promise<unknown> {
    if (!input) {
      return input;
    }

    // Handle arrays
    if (Array.isArray(input)) {
      return Promise.all(input.map((item, idx) => this.processInput(item, `${path}[${idx}]`)));
    }

    // Handle objects
    if (typeof input === 'object') {
      // Handle Blob
      if (typeof Blob !== 'undefined' && input instanceof Blob) {
        const file = await this.upload(input);
        return file.uri;
      }

      // Recursively process object properties
      const processed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input)) {
        processed[key] = await this.processInput(value, `${path}.${key}`);
      }
      return processed;
    }

    // Handle base64 strings or data URIs
    // Only treat as base64 if it's a data URI OR if it looks like base64 AND is reasonably long
    // Short strings like "key1" or "test" shouldn't be treated as base64
    if (typeof input === 'string') {
      if (input.startsWith('data:')) {
        // Data URIs are always treated as files
        const file = await this.upload(input);
        return file.uri;
      }

      // For raw base64, require minimum length (64 chars ~= 48 bytes of data)
      // and must match base64 pattern with proper padding
      if (
        input.length >= 64 &&
        /^[A-Za-z0-9+/]+={0,2}$/.test(input) &&
        input.length % 4 === 0
      ) {
        const file = await this.upload(input);
        return file.uri;
      }
    }

    return input;
  }
}

export function createFilesAPI(http: HttpClient): FilesAPI {
  return new FilesAPI(http);
}
