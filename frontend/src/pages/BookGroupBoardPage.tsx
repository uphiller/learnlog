import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const dateLocale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";

  useEffect(() => {
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
  }, [slug]);

  return (
    <section className="m-group-panel">
      <h2 className="m-visually-hidden">{t("bookGroupDetail.boardTab")}</h2>

      {loading && <LoadingState />}
      {error && <p className="m-error">{error}</p>}

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
