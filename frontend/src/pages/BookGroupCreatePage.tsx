import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, formatApiError, isProfanityError } from "../api";
import { bookPath } from "../routes";
import { useToast } from "../ToastContext";

export function BookGroupCreatePage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      showToast(t("bookGroups.nameRequired"), "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.createReadingGroup(trimmed);
      navigate(bookPath("/groups"));
    } catch (err) {
      if (isProfanityError(err)) {
        setName("");
      }
      showToast(formatApiError(err, t("bookGroups.createFailed")), "error");
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
        </p>
        <h1 className="m-page-head__title">{t("bookGroups.createTitle")}</h1>
        <p className="m-page-head__sub">{t("bookGroups.createSubtitle")}</p>
      </header>

      <section className="m-group-create">
        <form className="m-group-create__form" onSubmit={(e) => void onSubmit(e)}>
          <label className="m-group-create__label" htmlFor="group-name">
            {t("bookGroups.nameLabel")}
          </label>
          <input
            id="group-name"
            className="m-group-create__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            placeholder={t("bookGroups.namePlaceholder")}
          />
          <div className="m-group-create__actions">
            <Link to={bookPath("/groups")} className="m-link-btn">
              {t("bookGroups.backToGroups")}
            </Link>
            <button type="submit" className="m-btn m-btn--write" disabled={submitting}>
              {submitting ? t("bookGroups.creating") : t("bookGroups.createSubmit")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
