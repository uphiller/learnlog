export function isBookHost(): boolean {
  return window.location.hostname.startsWith("book.");
}

export function bookPath(subpath = ""): string {
  const normalized = subpath.startsWith("/") ? subpath : subpath ? `/${subpath}` : "";
  if (isBookHost()) {
    return normalized || "/";
  }
  return `/book${normalized}`;
}

export function bookOrigin(): string {
  if (isBookHost()) return window.location.origin;
  const host = window.location.hostname;
  const dot = host.indexOf(".");
  if (dot !== -1) {
    return `${window.location.protocol}//book${host.slice(dot)}`;
  }
  return window.location.origin;
}

export function sharePath(token: string): string {
  return `${bookOrigin()}/share/${encodeURIComponent(token)}`;
}

export function isSharePath(pathname: string): boolean {
  if (isBookHost()) {
    return /^\/share\/[^/]+\/?$/.test(pathname);
  }
  return /^\/book\/share\/[^/]+\/?$/.test(pathname);
}

export function showBooklogTabs(pathname: string): boolean {
  if (isBookHost()) {
    return pathname === "/" || pathname === "/groups" || pathname.startsWith("/feedback");
  }
  return pathname === "/book" || pathname === "/book/groups";
}

export function isLibraryPath(pathname: string): boolean {
  if (isBookHost()) {
    return pathname === "/" || pathname === "/search" || /^\/\d+$/.test(pathname);
  }
  return pathname === "/book" || pathname === "/book/search" || /^\/book\/\d+$/.test(pathname);
}

export function isGroupsListPath(pathname: string): boolean {
  if (isBookHost()) {
    return pathname === "/groups" || pathname === "/groups/new";
  }
  return pathname === "/book/groups" || pathname === "/book/groups/new";
}

export function isGroupsJoinPath(pathname: string): boolean {
  if (isBookHost()) {
    return pathname === "/groups" || pathname === "/groups/join";
  }
  return pathname === "/book/groups" || pathname === "/book/groups/join";
}

export function isGroupBooksPath(pathname: string): boolean {
  if (isBookHost()) {
    return /^\/groups\/[^/]+\/books\/?$/.test(pathname);
  }
  return /^\/book\/groups\/[^/]+\/books\/?$/.test(pathname);
}

export function matchGroupBoardList(pathname: string): string | undefined {
  const match = isBookHost()
    ? pathname.match(/^\/groups\/([^/]+)\/board\/?$/)
    : pathname.match(/^\/book\/groups\/([^/]+)\/board\/?$/);
  return match?.[1];
}

export function groupBasePath(slug: string): string {
  return bookPath(`/groups/${slug}`);
}

export function isFeedbackListPath(pathname: string): boolean {
  return pathname === "/feedback";
}
