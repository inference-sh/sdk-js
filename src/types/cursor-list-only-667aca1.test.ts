import { readFileSync } from 'fs';
import { join } from 'path';
import type { CursorListRequest, CursorListResponse } from '../types.js';

/**
 * types regen 667aca1: cursor list endpoints use CursorListRequest /
 * CursorListResponse only — no offset `page` on requests or `total_items` on
 * responses (API 473d9639b).
 */
describe('CursorList cursor-only pagination (667aca1)', () => {
  it('types list requests with cursor, not offset page numbers', () => {
    const request: CursorListRequest = {
      cursor: 'cursor-abc',
      limit: 25,
      direction: 'next',
      filters: [],
      preloads: [],
      sort: [{ field: 'created_at', dir: 'desc' }],
      fields: [],
      permissions: [],
      include_others: false,
    };

    expect(request.cursor).toBe('cursor-abc');
    expect(request.limit).toBe(25);
    expect(request).not.toHaveProperty('page');
  });

  it('types list responses with cursors and has_* flags, not total_items', () => {
    const response: CursorListResponse<{ id: string }> = {
      items: [{ id: 'row-1' }],
      next_cursor: 'next-b64',
      prev_cursor: 'prev-b64',
      has_next: true,
      has_previous: false,
      items_per_page: 25,
    };

    expect(response.items).toHaveLength(1);
    expect(response.has_next).toBe(true);
    expect(response).not.toHaveProperty('total_items');
  });

  it('allows empty cursor for the first page while still cursor-based', () => {
    const firstPage: Partial<CursorListRequest> = {
      cursor: '',
      limit: 10,
    };
    expect(firstPage).toEqual({ cursor: '', limit: 10 });
    expect(firstPage).not.toHaveProperty('page');
  });
});

describe('types.ts regen guards (667aca1)', () => {
  const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  function interfaceBlock(name: string): string {
    const start = typesSource.indexOf(`export interface ${name}`);
    expect(start).toBeGreaterThanOrEqual(0);
    const slice = typesSource.slice(start);
    const end = slice.indexOf('\nexport ');
    return end === -1 ? slice : slice.slice(0, end);
  }

  it('documents cursor-based list request/response types', () => {
    expect(typesSource).toMatch(/CursorListRequest represents a cursor-based list request/);
    expect(typesSource).toMatch(/CursorListResponse represents a cursor-based paginated response/);
  });

  it('does not add offset page on CursorListRequest', () => {
    const block = interfaceBlock('CursorListRequest');
    expect(block).not.toMatch(/\bpage\?:/);
    expect(block).not.toMatch(/offset-based pagination/);
  });

  it('does not add total_items on CursorListResponse', () => {
    const block = interfaceBlock('CursorListResponse');
    expect(block).not.toMatch(/\btotal_items\b/);
  });

  it('keeps CountResponse as the separate total-count shape', () => {
    expect(typesSource).toMatch(/export interface CountResponse[\s\S]*count: number/);
    const cursorBlock = interfaceBlock('CursorListResponse');
    expect(cursorBlock).not.toMatch(/\bcount:/);
  });
});
