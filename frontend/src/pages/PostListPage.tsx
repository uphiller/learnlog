import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { LoadingState } from "../LoadingState";
import { api, type PostListItem } from "../api";

export function PostListPage() {
  const { authenticated } = useAuth();
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authenticated) {
      setLoading(false);
      setPosts([]);
      return;
    }
    setLoading(true);
    api
      .listPosts(page)
      .then((data) => {
        setPosts(data.results);
        setTotal(data.count);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, authenticated]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section>
      <div className="toolbar">
        <h1>게시글</h1>
        <Link to="/posts/new" className="button">
          글쓰기
        </Link>
      </div>
      {!authenticated && !loading && (
        <p>로그인하면 게시글을 볼 수 있습니다.</p>
      )}
      {authenticated && loading && <LoadingState />}
      {error && <p className="error">{error}</p>}
      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.id}>
            <Link to={`/posts/${post.id}`}>{post.title}</Link>
            <span className="meta">
              {post.author.display_name} · {new Date(post.created_at).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
      {!loading && posts.length === 0 && <p>게시글이 없습니다.</p>}
      <div className="pager">
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          이전
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          다음
        </button>
      </div>
    </section>
  );
}
