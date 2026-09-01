import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, formatApiError, isProfanityError } from "../api";
import { bookPath } from "../routes";
import { useToast } from "../ToastContext";

export function BookGroupPostCreatePage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setSubmitting(true);
    try {
      const post = await api.createGroupPost(slug, { title: title.trim(), body: body.trim() });
      navigate(bookPath(`/groups/${slug}/board/${post.id}`));
    } catch (err) {
      if (isProfanityError(err)) {
        setTitle("");
        setBody("");
      }
      showToast(formatApiError(err, t("bookGroupDetail.postCreateFailed")), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="m-page">
      <header className="m-page-head">
        <p className="m-breadcrumb">
          <Link to="/">{t("common.brand")}</Link>
          <span aria-hidden> › </span>
          <Link to={bookPath("/groups")}>{t("bookGroups.title")}</Link>
          <span aria-hidden> › </span>
          <Link to={bookPath(`/groups/${slug}/board`)}>{t("bookGroupDetail.boardTab")}</Link>
        </p>
        <h1 className="m-page-head__title">{t("bookGroupDetail.newPost")}</h1>
      </header>

      <section className="m-compose">
        <form className="m-board-compose" onSubmit={(e) => void onSubmit(e)}>
          <input
            className="m-group-create__input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            autoFocus
            placeholder={t("bookGroupDetail.postTitlePlaceholder")}
          />
          <textarea
            className="m-compose__quote"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={8}
            placeholder={t("bookGroupDetail.postBodyPlaceholder")}
          />
          <div className="m-board-compose__actions">
            <Link to={bookPath(`/groups/${slug}/board`)} className="m-btn m-btn--outline">
              {t("bookGroupDetail.boardTab")}
            </Link>
            <button type="submit" className="m-btn m-btn--write" disabled={submitting}>
              {submitting ? t("common.saving") : t("bookGroupDetail.postSubmit")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
