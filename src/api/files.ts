import { HttpClient } from '../http/client';
import { PartialFile, File, CursorListRequest, CursorListResponse } from '../types';

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
    // Step 1: Create the file record
    const fileRequest: PartialFile = {
      uri: '', // Empty URI as it will be set by the server
      filename: options.filename,
      content_type: options.contentType || (data instanceof Blob ? data.type : 'application/octet-stream'),
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
        const matches = data.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          throw new Error('Invalid base64 data URI format');
        }
        const binaryStr = atob(matches[2]);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        contentToUpload = new Blob([bytes], { type: matches[1] });
      } else {
        // Assume it's a clean base64 string
        const binaryStr = atob(data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        contentToUpload = new Blob([bytes], { type: options.contentType || 'application/octet-stream' });
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
    if (
      typeof input === 'string' &&
      (input.startsWith('data:') ||
        /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(input))
    ) {
      const file = await this.upload(input);
      return file.uri;
    }

    return input;
  }
}

export function createFilesAPI(http: HttpClient): FilesAPI {
  return new FilesAPI(http);
}
