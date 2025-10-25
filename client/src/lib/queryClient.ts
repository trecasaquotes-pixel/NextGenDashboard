import { QueryClient, QueryFunction } from "@tanstack/react-query";

type QueryKeySegment = string | number | boolean;

function appendSearchParam(search: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((entry) => appendSearchParam(search, key, entry));
    return;
  }

  search.append(key, String(value));
}

function buildUrlFromQueryKey(queryKey: readonly unknown[]): string {
  if (queryKey.length === 0) {
    throw new Error("Query key must contain at least one entry");
  }

  if (queryKey.length === 1 && typeof queryKey[0] === "string") {
    return queryKey[0];
  }

  const [base, ...rest] = queryKey;

  if (typeof base !== "string") {
    throw new Error("Query key must start with a string URL");
  }

  let url = base;
  const search = new URLSearchParams();

  for (const segment of rest) {
    if (segment === undefined || segment === null) continue;

    if (typeof segment === "object" && !Array.isArray(segment)) {
      for (const [key, value] of Object.entries(segment)) {
        appendSearchParam(search, key, value);
      }
      continue;
    }

    const value = segment as QueryKeySegment | QueryKeySegment[];
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        url += `/${encodeURIComponent(String(entry))}`;
      });
    } else {
      url += `/${encodeURIComponent(String(value))}`;
    }
  }

  const queryString = search.toString();
  if (queryString) {
    url += url.includes("?") ? "&" : "?";
    url += queryString;
  }

  return url;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper to append render token if in render mode
function addRenderToken(url: string): string {
  if (typeof window !== "undefined" && (window as any).__RENDER_TOKEN__) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}renderToken=${encodeURIComponent((window as any).__RENDER_TOKEN__)}`;
  }
  return url;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const finalUrl = addRenderToken(url);
  const res = await fetch(finalUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const normalizedKey = Array.isArray(queryKey) ? queryKey : [queryKey];
    const url = buildUrlFromQueryKey(normalizedKey);
    const finalUrl = addRenderToken(url);

    const res = await fetch(finalUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
