export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, '');

// Build a full API URL, honoring NEXT_PUBLIC_API_BASE if provided
export function apiPath(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

// Convenience fetch wrapper that prefixes API base
export function apiFetch(input: string, init?: RequestInit) {
  return fetch(apiPath(input), init);
}

