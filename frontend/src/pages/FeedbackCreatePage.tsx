import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatApiError, api, isProfanityError } from "../api";
import { useToast } from "../ToastContext";

export function FeedbackCreatePage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const item = await api.createFeatureRequest({
        title: title.trim(),
        body: body.trim(),
      });
      navigate(`/feedback/${item.id}`);
    } catch (err) {
      if (isProfanityError(err)) {
        setTitle("");
        setBody("");
      }
      showToast(formatApiError(err, t("feedback.createFailed")), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="m-page">
      <header className="m-page-head">
        <p className="m-breadcrumb">
          <Link to="/">{t("layout.booklogNav")}</Link>
          <span aria-hidden> › </span>
          <Link to="/feedback">{t("feedback.title")}</Link>
        </p>
        <h1 className="m-page-head__title">{t("feedback.newRequest")}</h1>
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
            placeholder={t("feedback.titlePlaceholder")}
          />
          <textarea
            className="m-compose__quote"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={8}
            placeholder={t("feedback.bodyPlaceholder")}
          />
          <div className="m-board-compose__actions">
            <Link to="/feedback" className="m-btn m-btn--outline">
              {t("feedback.listButton")}
            </Link>
            <button type="submit" className="m-btn m-btn--write" disabled={submitting}>
              {submitting ? t("common.saving") : t("feedback.submit")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
