import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LoadingState } from "../LoadingState";
import { api, formatApiError, isProfanityError, type GroupComment, type GroupPostDetail } from "../api";
import { bookPath } from "../routes";
import { useToast } from "../ToastContext";

export function BookGroupPostPage() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { slug, postId } = useParams<{ slug: string; postId: string }>();
  const [post, setPost] = useState<GroupPostDetail | null>(null);
  const [comments, setComments] = useState<GroupComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const dateLocale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";
  const parsedPostId = Number(postId);

  useEffect(() => {
    if (!slug || !postId || Number.isNaN(parsedPostId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([api.getGroupPost(slug, parsedPostId), api.listGroupPostComments(slug, parsedPostId)])
      .then(([postData, commentData]) => {
        setPost(postData);
        setComments(commentData.results);
        setLoadError(null);
      })
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [slug, postId, parsedPostId]);

  async function onCommentSubmit(e: FormEvent) {
    e.preventDefault();
    if (!slug || Number.isNaN(parsedPostId)) return;
    const trimmed = commentBody.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const comment = await api.createGroupPostComment(slug, parsedPostId, trimmed);
      setComments((prev) => [...prev, comment]);
      setCommentBody("");
    } catch (err) {
      if (isProfanityError(err)) {
        setCommentBody("");
      }
      showToast(formatApiError(err, t("bookGroupDetail.commentCreateFailed")), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  if (loadError && !post) {
    return (
      <section className="m-group-panel">
        <p className="m-error">{loadError}</p>
        <Link to={bookPath(`/groups/${slug}/board`)} className="m-link-btn">
          {t("bookGroupDetail.backToBoard")}
        </Link>
      </section>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <section className="m-group-panel">
      <p className="m-breadcrumb m-breadcrumb--compact">
        <Link to={bookPath(`/groups/${slug}/board`)}>{t("bookGroupDetail.backToBoard")}</Link>
      </p>

      <article className="m-board-post">
        <h2 className="m-board-post__title">{post.title}</h2>
        <p className="m-board-post__meta">
          {post.author_name} · {new Date(post.created_at).toLocaleString(dateLocale)}
        </p>
        <div className="m-board-post__body">{post.body}</div>
      </article>

      <hr className="m-rule" />

      <section className="m-board-comments">
        <h3 className="m-compose__label">
          {t("bookGroupDetail.commentsTitle", { count: comments.length })}
        </h3>
        {comments.length === 0 ? (
          <p className="m-muted">{t("bookGroupDetail.commentsEmpty")}</p>
        ) : (
          <ul className="m-board-comments__list">
            {comments.map((comment) => (
              <li key={comment.id} className="m-board-comment">
                <p className="m-board-comment__meta">
                  {comment.author_name} ·{" "}
                  {new Date(comment.created_at).toLocaleString(dateLocale)}
                </p>
                <p className="m-board-comment__body">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}

        <form className="m-board-comment-form" onSubmit={(e) => void onCommentSubmit(e)}>
          <textarea
            className="m-compose__memo"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            required
            rows={3}
            placeholder={t("bookGroupDetail.commentPlaceholder")}
          />
          <button type="submit" className="m-btn m-btn--write m-btn--sm" disabled={submitting}>
            {submitting ? t("common.saving") : t("bookGroupDetail.commentSubmit")}
          </button>
        </form>
      </section>
    </section>
  );
}
