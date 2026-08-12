import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type PostDetail } from "../api";
import { LoadingState } from "../LoadingState";
import keycloak from "../keycloak";

export function PostDetailPage() {
  const { id } = useParams();
  const postId = Number(id);
  const navigate = useNavigate();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    api
      .getPost(postId)
      .then(setPost)
      .catch((e: Error) => setError(e.message));
  }, [postId]);

  const myEmail = keycloak.tokenParsed?.email as string | undefined;
  const canEdit = Boolean(post && myEmail && post.author.email === myEmail);

  async function onDelete() {
    if (!post || !window.confirm("삭제할까요?")) return;
    await api.deletePost(post.id);
    navigate("/");
  }

  if (error) return <p className="error">{error}</p>;
  if (!post) return <LoadingState />;

  return (
    <article className="post-detail">
      <h1>{post.title}</h1>
      <p className="meta">
        {post.author.display_name} · {new Date(post.created_at).toLocaleString()}
      </p>
      <div className="body">{post.body}</div>
      <div className="actions">
        <Link to="/">목록</Link>
        {canEdit && (
          <>
            <Link to={`/posts/${post.id}/edit`}>수정</Link>
            <button type="button" className="danger" onClick={onDelete}>
              삭제
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export function PostFormPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const postId = mode === "edit" ? Number(id) : null;
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !postId) return;
    api
      .getPost(postId)
      .then((p) => {
        setTitle(p.title);
        setBody(p.body);
      })
      .catch((e: Error) => setError(e.message));
  }, [mode, postId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "create") {
        const created = await api.createPost({ title, body });
        navigate(`/posts/${created.id}`);
      } else if (postId) {
        await api.updatePost(postId, { title, body });
        navigate(`/posts/${postId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    }
  }

  return (
    <section>
      <h1>{mode === "create" ? "글쓰기" : "글 수정"}</h1>
      {error && <p className="error">{error}</p>}
      <form className="post-form" onSubmit={onSubmit}>
        <label>
          제목
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
        </label>
        <label>
          내용
          <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={12} />
        </label>
        <div className="actions">
          <button type="submit">저장</button>
          <Link to="/">취소</Link>
        </div>
      </form>
    </section>
  );
}
