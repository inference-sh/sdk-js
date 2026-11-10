import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  ContentSafe,
  SandboxFileKindDir,
  SandboxFileKindFile,
  SandboxFileKindLink,
  SandboxFileKindOther,
  VisibilityPrivate,
  type FileDTO,
  type SandboxFileEntry,
  type SandboxFileExportRequest,
  type SandboxFileImportRequest,
  type SandboxFileTransferDTO,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');
const sandboxesClientSource = readFileSync(join(__dirname, '../api/sandboxes.ts'), 'utf8');

/**
 * Types regen 1830ffd: sandbox filesystem DTOs for list/import/export on a
 * running box (api#2317). Exec ?wait= is not in this regen; SDK wiring is
 * tracked in open PR #765.
 */
describe('SandboxFileKind (1830ffd)', () => {
  it('closes the directory-entry kind union', () => {
    const kinds = [
      SandboxFileKindFile,
      SandboxFileKindDir,
      SandboxFileKindLink,
      SandboxFileKindOther,
    ] as const;
    expect(kinds).toEqual(['file', 'dir', 'link', 'other']);
  });

  it('documents SandboxFileKind in types.ts', () => {
    expect(typesSource).toMatch(/export type SandboxFileKind = "file" \| "dir" \| "link" \| "other"/);
    expect(typesSource).toMatch(/SandboxFileKind is what a path on a sandbox is/);
  });
});

describe('SandboxFileEntry list rows (1830ffd)', () => {
  it('requires name, kind, size, and mode for GET /sandboxes/{id}/files entries', () => {
    const entry: SandboxFileEntry = {
      name: 'README.md',
      kind: SandboxFileKindFile,
      size: 42,
      mode: '0644',
      modified_at: '2026-11-10T10:00:00Z',
    };
    const dir: SandboxFileEntry = {
      name: 'src',
      kind: SandboxFileKindDir,
      size: 4096,
      mode: '0755',
    };
    expect(entry.kind).toBe('file');
    expect(dir.modified_at).toBeUndefined();
  });

  it('documents SandboxFileEntry and the list endpoint in types.ts', () => {
    expect(typesSource).toMatch(/export interface SandboxFileEntry \{/);
    expect(typesSource).toMatch(/\/sandboxes\/\{id\}\/files\?path=/);
    expect(typesSource).toMatch(/size: number \/\* int64 \*\//);
    expect(typesSource).toMatch(/modified_at\?: string \/\* RFC3339 \*\//);
  });
});

describe('Sandbox file import/export bodies (1830ffd)', () => {
  it('types import as path plus platform file_id', () => {
    const body: SandboxFileImportRequest = {
      path: '/workspace/data.bin',
      file_id: 'file-upload-1',
    };
    expect(body.file_id).toBe('file-upload-1');
  });

  it('types export as path only', () => {
    const body: SandboxFileExportRequest = { path: '/workspace/out.log' };
    expect(Object.keys(body)).toEqual(['path']);
  });

  it('documents import and export POST routes in types.ts', () => {
    expect(typesSource).toMatch(/POST \/sandboxes\/\{id\}\/files\/import/);
    expect(typesSource).toMatch(/POST \/sandboxes\/\{id\}\/files\/export/);
    expect(typesSource).toMatch(/uploaded first, POST \/files/);
    expect(typesSource).toMatch(/file_id: string;/);
  });
});

describe('SandboxFileTransferDTO responses (1830ffd)', () => {
  it('returns path with optional platform file and export download_url', () => {
    const platformFile: FileDTO = {
      id: 'file-1',
      short_id: 'f-1',
      created_at: '2026-11-10T10:00:00Z',
      updated_at: '2026-11-10T10:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: VisibilityPrivate,
      path: 'uploads/data.bin',
      remote_path: 's3://bucket/data.bin',
      upload_url: 'https://storage.example/upload',
      uri: 'https://cdn.example/data.bin',
      content_type: 'application/octet-stream',
      size: 1024,
      filename: 'data.bin',
      category: 'artifact',
      rating: ContentSafe,
    };
    const imported: SandboxFileTransferDTO = {
      path: '/workspace/data.bin',
      file: platformFile,
    };
    const exported: SandboxFileTransferDTO = {
      path: '/workspace/out.log',
      file: { ...platformFile, id: 'file-2', short_id: 'f-2' },
      download_url: 'https://storage.example/presigned',
    };
    expect(imported.download_url).toBeUndefined();
    expect(exported.download_url).toMatch(/presigned/);
  });

  it('documents transfer DTO fields in types.ts', () => {
    expect(typesSource).toMatch(/export interface SandboxFileTransferDTO \{/);
    expect(typesSource).toMatch(/download_url\?: string;/);
    expect(typesSource).toMatch(/short-lived URL that downloads it/);
  });
});

describe('sandbox file types export surface (1830ffd)', () => {
  it('exports sandbox file symbols from the main barrel', () => {
    expect(main.SandboxFileKindFile).toBe('file');
    expect(main.SandboxFileKindDir).toBe('dir');
    const transfer: main.SandboxFileTransferDTO = { path: '/tmp/x' };
    expect(transfer.path).toBe('/tmp/x');
  });

  it('SandboxesAPI has no file helpers until the client wires list/import/export', () => {
    expect(sandboxesClientSource).not.toMatch(/listFiles|importFile|exportFile|SandboxFileEntry/);
    expect(sandboxesClientSource).not.toMatch(/\/files/);
  });
});
