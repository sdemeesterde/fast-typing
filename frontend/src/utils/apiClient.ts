import { API_BASE, ApiError, type ApiErrorCode } from "../types/api";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errBody: any;

    try {
      errBody = await response.json();
    } catch {
      errBody = { error: await response.text() };
    }

    const code = (errBody?.code as ApiErrorCode) ?? "UNKOWN_ERROR";

    const message = errBody?.error ?? "Unknown error";

    throw new ApiError(response.status, message, code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T,>(path: string, options?: Omit<RequestOptions, "body">) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T,>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),

  delete: <T,>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
