// src/lib/nocodb.ts
export const nocodb = {
  baseUrl: import.meta.env.VITE_NOCODB_BASE_URL,
  token: import.meta.env.VITE_NOCODB_API_TOKEN,
  projectId: import.meta.env.VITE_NOCODB_PROJECT_ID,
};

export async function ncFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${nocodb.baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "xc-token": nocodb.token,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NocoDB error: ${res.status} - ${text}`);
  }

  return res.json();
}
