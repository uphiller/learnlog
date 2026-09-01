import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LoadingState } from "../LoadingState";
import {
  api,
  formatApiError,
  isProfanityError,
  type FeatureRequestComment,
  type FeatureRequestDetail,
  type FeatureRequestStatus,
} from "../api";
import { useToast } from "../ToastContext";

const STATUS_KEYS: Record<FeatureRequestStatus, string> = {
  open: "feedback.statusOpen",
  planned: "feedback.statusPlanned",
  in_progress: "feedback.statusInProgress",
  done: "feedback.statusDone",
  declined: "feedback.statusDeclined",
};

export function FeedbackDetailPage() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<FeatureRequestDetail | null>(null);
  const [comments, setComments] = useState<FeatureRequestComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [voting, setVoting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dateLocale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";
  const parsedId = Number(id);

  useEffect(() => {
    if (!id || Number.isNaN(parsedId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api.getFeatureRequest(parsedId),
      api.listFeatureRequestComments(parsedId),
    ])
      .then(([detail, commentData]) => {
        setItem(detail);
        setComments(commentData.results);
        setLoadError(null);
      })
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [id, parsedId]);

  async function onVote() {
    if (Number.isNaN(parsedId) || voting) return;
    setVoting(true);
    try {
      const updated = await api.voteFeatureRequest(parsedId);
      setItem(updated);
    } catch (err) {
      showToast(formatApiError(err, t("feedback.voteFailed")), "error");
    } finally {
      setVoting(false);
    }
  }

  async function onDelete() {
    if (!item || Number.isNaN(parsedId) || deleting) return;
    if (!window.confirm(t("feedback.confirmDelete", { title: item.title }))) return;

    setDeleting(true);
    try {
      await api.deleteFeatureRequest(parsedId);
      navigate("/feedback");
    } catch (err) {
      showToast(formatApiError(err, t("feedback.deleteFailed")), "error");
      setDeleting(false);
    }
  }

  async function onCommentSubmit(e: FormEvent) {
    e.preventDefault();
    if (Number.isNaN(parsedId)) return;
    const trimmed = commentBody.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const comment = await api.createFeatureRequestComment(parsedId, trimmed);
      setComments((prev) => [...prev, comment]);
      setCommentBody("");
    } catch (err) {
      if (isProfanityError(err)) {
        setCommentBody("");
      }
      showToast(formatApiError(err, t("feedback.commentCreateFailed")), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  if (loadError && !item) {
    return (
      <div className="m-page">
        <p className="m-error">{loadError}</p>
        <Link to="/feedback" className="m-link-btn">
          {t("feedback.backToList")}
        </Link>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  return (
    <div className="m-page">
      <p className="m-breadcrumb m-breadcrumb--compact">
        <Link to="/feedback">{t("feedback.backToList")}</Link>
      </p>

      <article className="m-board-post">
        <div className="m-feed-row__title-row">
          <h2 className="m-board-post__title">{item.title}</h2>
          <span className={`m-feedback-status m-feedback-status--${item.status}`}>
            {t(STATUS_KEYS[item.status])}
          </span>
        </div>
        <p className="m-board-post__meta">
          {item.author_name} · {new Date(item.created_at).toLocaleString(dateLocale)}
        </p>
        <div className="m-board-post__body">{item.body}</div>
        <div className="m-feedback-vote">
          <button
            type="button"
            className={`m-btn m-btn--sm ${item.voted ? "m-btn--write" : "m-btn--outline"}`}
            onClick={() => void onVote()}
            disabled={voting}
          >
            {item.voted ? t("feedback.unvote") : t("feedback.vote")}
            {` · ${item.vote_count}`}
          </button>
          {item.is_author && (
            <button
              type="button"
              className="m-link-btn m-link-btn--danger"
              onClick={() => void onDelete()}
              disabled={deleting}
            >
              {t("common.delete")}
            </button>
          )}
        </div>
      </article>

      <hr className="m-rule" />

      <section className="m-board-comments">
        <h3 className="m-compose__label">
          {t("feedback.commentsTitle", { count: comments.length })}
        </h3>
        {comments.length === 0 ? (
          <p className="m-muted">{t("feedback.commentsEmpty")}</p>
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
            placeholder={t("feedback.commentPlaceholder")}
          />
          <button type="submit" className="m-btn m-btn--write m-btn--sm" disabled={submitting}>
            {submitting ? t("common.saving") : t("feedback.commentSubmit")}
          </button>
        </form>
      </section>
    </div>
  );
}
