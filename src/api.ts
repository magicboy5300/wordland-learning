export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export async function api<T>(url: string, data?: unknown, method = data === undefined ? 'GET' : 'POST'): Promise<T> {
  const response = await fetch(`/api${url}`, {
    method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Wordland-Request': '1' },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const result = await response.json().catch(() => ({ error: '服务暂时不可用，请稍后重试' }));
  if (!response.ok) { const error=result && typeof result==='object' && 'error' in result && typeof result.error==='string' ? result.error : '请求失败，请稍后重试'; throw new ApiError(error,response.status); }
  return result as T;
}
