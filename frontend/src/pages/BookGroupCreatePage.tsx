import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, api } from "../api";

function parseApiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  try {
    const data = JSON.parse(err.message) as Record<string, string[] | string>;
    const nameErrors = data.name;
    if (Array.isArray(nameErrors) && nameErrors[0]) return nameErrors[0];
    if (typeof data.detail === "string") return data.detail;
  } catch {
    if (err.message) return err.message;
  }
  return fallback;
}

export function BookGroupCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("bookGroups.nameRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.createReadingGroup(trimmed);
      navigate("/book/groups");
    } catch (err) {
      setError(parseApiErrorMessage(err, t("bookGroups.createFailed")));
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
          <Link to="/book/groups">{t("bookGroups.title")}</Link>
        </p>
        <h1 className="m-page-head__title">{t("bookGroups.createTitle")}</h1>
        <p className="m-page-head__sub">{t("bookGroups.createSubtitle")}</p>
      </header>

      <section className="m-group-create">
        {error && <p className="m-error">{error}</p>}
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
            <Link to="/book/groups" className="m-link-btn">
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
