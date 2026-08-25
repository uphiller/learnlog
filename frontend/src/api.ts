import keycloak from "./keycloak";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" ? `${window.location.origin}/api` : "/api");

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

export type BookSearchHit = {
  aladin_item_id: string;
  title: string;
  author: string;
  cover_url: string;
  isbn13: string;
  publisher: string;
  pub_date: string;
  total_pages: number | null;
};

export type Book = {
  id: number;
  aladin_item_id: string;
  title: string;
  author: string;
  cover_url: string;
  isbn13: string;
  publisher: string;
  pub_date: string;
  total_pages: number | null;
  read_page: number | null;
  completion_sentence: string;
  created_at: string;
};

export type BookQuote = {
  id: number;
  book: number;
  quote: string;
  memo: string;
  page: string;
  created_at: string;
  updated_at: string;
};

export type PeerQuote = {
  quote: string;
  memo: string;
  page: string;
};

export type PeerQuotesResponse = {
  unlocked: boolean;
  results: PeerQuote[];
};

export type PeerBook = {
  aladin_item_id: string;
  title: string;
  author: string;
  cover_url: string;
  isbn13: string;
  publisher: string;
  pub_date: string;
  total_pages: number | null;
  reader_count: number;
};

export type PeerBooksResponse = {
  unlocked: boolean;
  results: PeerBook[];
};

export type HistoryEvent = {
  kind: "book" | "quote";
  id: number;
  book_id: number;
  title: string;
  subtitle?: string;
  preview?: string;
  occurred_at: string;
};

export type HistoryCalendarResponse = {
  year: number;
  month: number;
  events_by_date: Record<string, HistoryEvent[]>;
};

export type ReadingGroup = {
  id: number;
  name: string;
  slug: string;
  my_role: "owner" | "admin" | "member" | null;
  my_status: "active" | "pending" | null;
  member_count: number;
  created_at: string;
};

export type GroupMember = {
  keycloak_sub: string;
  display_name: string;
  role: "owner" | "admin" | "member";
  status: "active" | "pending" | "banned";
  joined_at: string;
};

export type GroupReading = {
  id: number;
  aladin_item_id: string;
  title: string;
  author: string;
  cover_url: string;
  isbn13: string;
  publisher: string;
  pub_date: string;
  total_pages: number | null;
  set_by_name: string;
  created_at: string;
};

export type GroupMemberBookQuote = {
  quote: string;
  memo: string;
  page: string;
  created_at: string;
};

export type GroupMemberWriting = {
  keycloak_sub: string;
  display_name: string;
  completion_sentence: string;
  quotes: GroupMemberBookQuote[];
};

export type GroupReadingDetail = {
  book: GroupReading;
  writings: GroupMemberWriting[];
};

export type GroupPost = {
  id: number;
  title: string;
  body: string;
  author_name: string;
  comment_count: number;
  created_at: string;
};

export type GroupPostDetail = {
  id: number;
  title: string;
  body: string;
  author_name: string;
  created_at: string;
  updated_at: string;
};

export type GroupComment = {
  id: number;
  body: string;
  author_name: string;
  created_at: string;
};

export type UserProfile = {
  display_name: string;
  email: string;
};

export const api = {
  listPosts: (page = 1) => request<Paginated<PostListItem>>(`/posts/?page=${page}`),
  getPost: (id: number) => request<PostDetail>(`/posts/${id}/`),
  createPost: (data: { title: string; body: string }) =>
    request<PostDetail>("/posts/", { method: "POST", body: JSON.stringify(data) }),
  updatePost: (id: number, data: { title: string; body: string }) =>
    request<PostDetail>(`/posts/${id}/`, { method: "PUT", body: JSON.stringify(data) }),
  deletePost: (id: number) => request<void>(`/posts/${id}/`, { method: "DELETE" }),

  searchBooks: (q: string, start = 1) =>
    request<{ results: BookSearchHit[] }>(
      `/books/search/?q=${encodeURIComponent(q)}&start=${start}`,
    ),
  listBooks: (page = 1) => request<Paginated<Book>>(`/books/?page=${page}`),
  createBook: (data: BookSearchHit) =>
    request<Book>("/books/", { method: "POST", body: JSON.stringify(data) }),
  deleteBook: (id: number) => request<void>(`/books/${id}/`, { method: "DELETE" }),
  getBook: (id: number) => request<Book>(`/books/${id}/`),
  completeBook: (id: number, completion_sentence: string) =>
    request<Book>(`/books/${id}/complete/`, {
      method: "POST",
      body: JSON.stringify({ completion_sentence }),
    }),
  getPeerQuotes: (bookId: number) =>
    request<PeerQuotesResponse>(`/books/${bookId}/peer-quotes/`),
  getPeerBooks: (bookId: number) =>
    request<PeerBooksResponse>(`/books/${bookId}/peer-books/`),
  listQuotes: (bookId: number, page = 1) =>
    request<Paginated<BookQuote>>(`/quotes/?book=${bookId}&page=${page}`),
  createQuote: (data: { book: number; quote: string; memo?: string; page?: string }) =>
    request<BookQuote>("/quotes/", { method: "POST", body: JSON.stringify(data) }),
  deleteQuote: (id: number) => request<void>(`/quotes/${id}/`, { method: "DELETE" }),
  getHistoryCalendar: (year: number, month: number) =>
    request<HistoryCalendarResponse>(`/history/calendar/?year=${year}&month=${month}`),

  getProfile: () => request<UserProfile>("/users/me/"),
  updateProfile: (display_name: string) =>
    request<UserProfile>("/users/me/", {
      method: "PATCH",
      body: JSON.stringify({ display_name }),
    }),

  listReadingGroups: (page = 1) =>
    request<Paginated<ReadingGroup>>(`/groups/?domain=book&page=${page}`),
  createReadingGroup: (name: string) =>
    request<ReadingGroup>("/groups/?domain=book", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  requestJoinGroup: (slug: string) =>
    request<ReadingGroup>("/groups/join/?domain=book", {
      method: "POST",
      body: JSON.stringify({ slug }),
    }),
  getReadingGroup: (slug: string) => request<ReadingGroup>(`/groups/${slug}/`),
  listGroupMembers: (slug: string) => request<GroupMember[]>(`/groups/${slug}/members/`),
  approveGroupMember: (slug: string, keycloakSub: string) =>
    request<GroupMember>(`/groups/${slug}/members/${encodeURIComponent(keycloakSub)}/approve/`, {
      method: "POST",
    }),
  listGroupBooks: (slug: string) =>
    request<{ results: GroupReading[] }>(`/groups/${slug}/books/`),
  getGroupBookDetail: (slug: string, readingId: number) =>
    request<GroupReadingDetail>(`/groups/${slug}/books/${readingId}/`),
  addGroupBook: (slug: string, data: BookSearchHit) =>
    request<GroupReading>(`/groups/${slug}/books/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listGroupPosts: (slug: string) =>
    request<{ results: GroupPost[] }>(`/groups/${slug}/posts/`),
  createGroupPost: (slug: string, data: { title: string; body: string }) =>
    request<GroupPostDetail>(`/groups/${slug}/posts/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getGroupPost: (slug: string, postId: number) =>
    request<GroupPostDetail>(`/groups/${slug}/posts/${postId}/`),
  listGroupPostComments: (slug: string, postId: number) =>
    request<{ results: GroupComment[] }>(`/groups/${slug}/posts/${postId}/comments/`),
  createGroupPostComment: (slug: string, postId: number, body: string) =>
    request<GroupComment>(`/groups/${slug}/posts/${postId}/comments/`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
};
