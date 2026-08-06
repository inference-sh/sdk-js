import { HttpClient } from '../http/client';
import type { Response } from '../http/response';
import { PartialFile, FileDTO as File, CursorListRequest, CursorListResponse } from '../types';

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

const extMimeTypes: Record<string, string> = {
  jfif: 'image/jpeg', jpe: 'image/jpeg', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
  heic: 'image/heif', heif: 'image/heif', tif: 'image/tiff', tiff: 'image/tiff',
  bmp: 'image/bmp', svg: 'image/svg+xml',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac',
  aac: 'audio/aac', m4a: 'audio/mp4',
  pdf: 'application/pdf',
};

function mimeFromFilename(name: string): string | undefined {
  const ext = name.split('.').pop()?.toLowerCase();
  return ext ? extMimeTypes[ext] : undefined;
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
/**
 * Everything about a presigned upload except which endpoint mints the record.
 *
 * js/app's platform-media API posts to /admin/media/upload with a category
 * instead of /files, and had re-derived all of this — content type, filename,
 * the PUT, the ok check — losing the data-URI and base64 handling in the
 * process. Splitting the transfer from the create call lets both share one
 * implementation of the part that talks to S3.
 */
export interface ResolvedUpload {
  contentType: string;
  filename?: string;
  size?: number;
  /** The bytes to PUT, normalised from a Blob, a data URI or bare base64. */
  body: Blob;
}

export function resolveUpload(data: string | Blob, options: UploadFileOptions = {}): ResolvedUpload {
  let filename = options.filename;
  if (!filename && data instanceof globalThis.File) {
    filename = data.name;
  }

  const contentType =
    options.contentType ||
    (data instanceof Blob ? data.type : data.match(/^data:([^;,]*)[;,]/)?.[1]) ||
    (filename ? mimeFromFilename(filename) : undefined) ||
    'application/octet-stream';

  let body: Blob;
  if (data instanceof Blob) {
    body = data;
  } else if (data.startsWith('data:')) {
    const parsed = parseDataUri(data);
    body = new Blob([parsed.data.buffer as ArrayBuffer], { type: parsed.mediaType });
  } else {
    const binaryStr = atob(data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    body = new Blob([bytes.buffer as ArrayBuffer], { type: contentType });
  }

  return {
    contentType,
    filename,
    size: data instanceof Blob ? data.size : undefined,
    body,
  };
}

/** PUTs the bytes to a presigned URL and throws on a non-2xx response. */
export async function putToSignedUrl(uploadUrl: string, body: Blob): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body,
    headers: { 'Content-Type': body.type || 'application/octet-stream' },
  });
  if (!response.ok) {
    throw new Error(`Failed to upload file content: ${response.statusText}`);
  }
}

export class FilesAPI {
  constructor(private readonly http: HttpClient) {}

  /**
   * List files with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<File>>> {
    return this.http.request<CursorListResponse<File>>('post', '/files/list', { data: params });
  }

  /**
   * Get a file by ID
   */
  async get(fileId: string): Promise<Response<File>> {
    return this.http.request<File>('get', `/files/${fileId}`);
  }

  /**
   * Delete a file
   */
  async delete(fileId: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/files/${fileId}`);
  }

  /**
   * Upload a file (Blob or base64 string)
   */
  async upload(data: string | Blob, options: UploadFileOptions = {}): Promise<File> {
    const resolved = resolveUpload(data, options);

    // Step 1: Create the file record
    const fileRequest: PartialFile = {
      uri: '', // Empty URI as it will be set by the server
      filename: resolved.filename,
      content_type: resolved.contentType,
      path: options.path,
      size: resolved.size,
    };

    const resp = await this.http.request<File[]>('post', '/files', {
      data: { files: [fileRequest] },
    });

    const file = resp.data[0];

    // Step 2: Upload the file content to the provided upload_url
    if (!file.upload_url) {
      throw new Error('No upload URL provided by the server');
    }
    await putToSignedUrl(file.upload_url, resolved.body);

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
