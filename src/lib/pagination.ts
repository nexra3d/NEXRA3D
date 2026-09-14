import { Response } from 'express';

export interface CursorPayload {
  id: string;
  createdAt?: string | Date;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
}

/**
 * Base64url encode a cursor containing item ID and optional createdAt timestamp
 */
export function encodeCursor(payload: CursorPayload): string {
  const normalized = {
    id: payload.id,
    createdAt: payload.createdAt instanceof Date ? payload.createdAt.toISOString() : payload.createdAt
  };
  return Buffer.from(JSON.stringify(normalized)).toString('base64url');
}

/**
 * Decode a base64url cursor string
 */
export function decodeCursor(cursorStr?: string | null): CursorPayload | null {
  if (!cursorStr || typeof cursorStr !== 'string') return null;
  try {
    const raw = Buffer.from(cursorStr.trim(), 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.id) {
      return parsed;
    }
    return null;
  } catch {
    // Fallback: If caller passed raw ID as cursor
    if (cursorStr.trim().length > 0 && !cursorStr.includes('{')) {
      return { id: cursorStr.trim() };
    }
    return null;
  }
}

/**
 * Parse offset-based pagination query parameters (?page=1&limit=20)
 */
export function parseOffsetPagination(query: any, defaultLimit = 20, maxLimit = 100) {
  const rawPage = query?.page ?? query?.p;
  const rawLimit = query?.limit ?? query?.pageSize ?? query?.perPage;

  const page = Math.max(parseInt(String(rawPage || 1), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(String(rawLimit || defaultLimit), 10) || defaultLimit, 1), maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Parse cursor-based pagination query parameters (?cursor=...&limit=20)
 */
export function parseCursorPagination(query: any, defaultLimit = 20, maxLimit = 100) {
  const rawLimit = query?.limit ?? query?.pageSize ?? query?.perPage;
  const limit = Math.min(Math.max(parseInt(String(rawLimit || defaultLimit), 10) || defaultLimit, 1), maxLimit);
  const cursor = query?.cursor ? String(query.cursor) : undefined;
  const decoded = decodeCursor(cursor);

  // If offset page is also provided, calculate fallback page
  const page = Math.max(parseInt(String(query?.page || 1), 10) || 1, 1);

  return {
    limit,
    cursor,
    decoded,
    page
  };
}

/**
 * Construct unified pagination metadata
 */
export function buildPaginationMeta({
  total,
  page,
  limit,
  hasMore,
  nextCursor = null,
  prevCursor = null
}: {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string | null;
  prevCursor?: string | null;
}): PaginationMeta {
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  return {
    total,
    page,
    limit,
    totalPages,
    hasMore,
    nextCursor: nextCursor || null,
    prevCursor: prevCursor || null
  };
}

/**
 * Set standard HTTP pagination headers on the response
 */
export function setPaginationHeaders(res: Response, meta: PaginationMeta): void {
  res.setHeader('X-Total-Count', String(meta.total));
  res.setHeader('X-Page', String(meta.page));
  res.setHeader('X-Limit', String(meta.limit));
  res.setHeader('X-Total-Pages', String(meta.totalPages));
  res.setHeader('X-Has-More', String(meta.hasMore));
  if (meta.nextCursor) {
    res.setHeader('X-Next-Cursor', meta.nextCursor);
  }
}
