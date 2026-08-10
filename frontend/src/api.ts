import keycloak from "./keycloak";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://board.bettercodelab.com/api";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function authHeaders(): Promise<HeadersInit> {
  if (!keycloak.token) {
    throw new ApiError(401, "Not authenticated");
  }
  if (keycloak.refreshToken) {
    await keycloak.updateToken(30);
  }
  const token = keycloak.token;
  if (!token) {
    throw new ApiError(401, "Not authenticated");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  if (res.status === 401) {
    if (keycloak.authenticated && !retried) {
      try {
        await keycloak.updateToken(-1);
      } catch {
        /* refresh failed */
      }
      return request<T>(path, init, true);
    }
    if (!keycloak.authenticated) {
      await keycloak.login({ redirectUri: `${window.location.origin}/` });
    }
    throw new ApiError(
      401,
      "API 인증에 실패했습니다. 로그아웃 후 다시 로그인해 주세요.",
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text || res.statusText);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export type Author = {
  id: number;
  display_name: string;
  email: string;
};

export type PostListItem = {
  id: number;
  title: string;
  author: Author;
  created_at: string;
  updated_at: string;
};

export type PostDetail = PostListItem & {
  body: string;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export const api = {
  listPosts: (page = 1) => request<Paginated<PostListItem>>(`/posts/?page=${page}`),
  getPost: (id: number) => request<PostDetail>(`/posts/${id}/`),
  createPost: (data: { title: string; body: string }) =>
    request<PostDetail>("/posts/", { method: "POST", body: JSON.stringify(data) }),
  updatePost: (id: number, data: { title: string; body: string }) =>
    request<PostDetail>(`/posts/${id}/`, { method: "PUT", body: JSON.stringify(data) }),
  deletePost: (id: number) => request<void>(`/posts/${id}/`, { method: "DELETE" }),
};
