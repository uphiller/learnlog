import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LoadingState } from "../LoadingState";
import { api, type GroupPost } from "../api";

function bodyPreview(body: string, max = 120): string {
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export function BookGroupBoardPage() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const dateLocale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";

  function loadPosts() {
    if (!slug) return;
    setLoading(true);
    api
      .listGroupPosts(slug)
      .then((data) => {
        setPosts(data.results);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPosts();
  }, [slug]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setSubmitting(true);
    setError(null);
    try {
      const post = await api.createGroupPost(slug, { title: title.trim(), body: body.trim() });
      setTitle("");
      setBody("");
      navigate(`/book/groups/${slug}/board/${post.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("bookGroupDetail.postCreateFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="m-group-panel">
      <h2 className="m-visually-hidden">{t("bookGroupDetail.boardTab")}</h2>

      <section className="m-compose">
        <h3 className="m-compose__label">{t("bookGroupDetail.newPost")}</h3>
        {error && <p className="m-error">{error}</p>}
        <form className="m-board-compose" onSubmit={(e) => void onSubmit(e)}>
          <input
            className="m-group-create__input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            placeholder={t("bookGroupDetail.postTitlePlaceholder")}
          />
          <textarea
            className="m-compose__quote"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={4}
            placeholder={t("bookGroupDetail.postBodyPlaceholder")}
          />
          <div className="m-board-compose__actions">
            <button type="submit" className="m-btn m-btn--write m-btn--sm" disabled={submitting}>
              {submitting ? t("common.saving") : t("bookGroupDetail.postSubmit")}
            </button>
          </div>
        </form>
      </section>

      <hr className="m-rule" />

      {loading && <LoadingState />}
      {!loading && posts.length > 0 && (
        <ul className="m-feed">
          {posts.map((post) => (
            <li key={post.id} className="m-feed__item">
              <Link to={`/book/groups/${slug}/board/${post.id}`} className="m-feed-row m-board-row">
                <div className="m-feed-row__body">
                  <h3 className="m-feed-row__title">{post.title}</h3>
                  <p className="m-board-row__preview">{bodyPreview(post.body)}</p>
                  <p className="m-feed-row__sub">
                    {post.author_name} · {new Date(post.created_at).toLocaleDateString(dateLocale)}
                    {post.comment_count > 0 &&
                      ` · ${t("bookGroupDetail.commentCount", { count: post.comment_count })}`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!loading && posts.length === 0 && !error && (
        <div className="m-empty">
          <p className="m-empty__text">{t("bookGroupDetail.boardEmpty")}</p>
        </div>
      )}
    </section>
  );
}
