import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, api } from "../api";
import { useAuth } from "../AuthContext";
import { bookPath } from "../routes";

function parseApiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  try {
    const data = JSON.parse(err.message) as Record<string, string[] | string>;
    const slugErrors = data.slug;
    if (Array.isArray(slugErrors) && slugErrors[0]) return slugErrors[0];
    if (typeof data.detail === "string") return data.detail;
  } catch {
    if (err.message) return err.message;
  }
  return fallback;
}

function isAlreadyMemberError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  try {
    const data = JSON.parse(err.message) as { detail?: string };
    return data.detail === "이미 참여 중인 독서모임입니다.";
  } catch {
    return false;
  }
}

export function BookGroupJoinPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { inviteSlug } = useParams<{ inviteSlug?: string }>();
  const { authenticated, loginWithGoogle, loginWithKakao, ready } = useAuth();
  const slugFromUrl = inviteSlug ? decodeURIComponent(inviteSlug) : "";
  const isInviteLink = Boolean(slugFromUrl);
  const autoJoinStarted = useRef(false);
  const [slug, setSlug] = useState(slugFromUrl);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (slugFromUrl) {
      setSlug(slugFromUrl);
    }
  }, [slugFromUrl]);

  async function submitJoin(slugValue: string) {
    const trimmed = slugValue.trim();
    if (!trimmed) {
      setError(t("bookGroups.joinSlugRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.requestJoinGroup(trimmed);
      navigate(bookPath("/groups"));
    } catch (err) {
      if (isAlreadyMemberError(err)) {
        navigate(bookPath(`/groups/${trimmed}/books`));
        return;
      }
      setError(parseApiErrorMessage(err, t("bookGroups.joinFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!ready || !isInviteLink || !authenticated || autoJoinStarted.current) return;
    autoJoinStarted.current = true;
    void submitJoin(slugFromUrl);
  }, [ready, isInviteLink, authenticated, slugFromUrl]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await submitJoin(slug);
  }

  if (isInviteLink && ready && !authenticated) {
    return (
      <div className="m-page">
        <header className="m-page-head">
          <p className="m-breadcrumb">
            <Link to="/">{t("common.brand")}</Link>
            <span aria-hidden> › </span>
            <Link to={bookPath("/groups")}>{t("bookGroups.title")}</Link>
          </p>
          <h1 className="m-page-head__title">{t("bookGroups.joinInviteTitle")}</h1>
          <p className="m-page-head__sub">{t("bookGroups.joinInviteLogin")}</p>
        </header>
        <div className="m-login-actions">
          <button type="button" className="m-btn m-btn--write" onClick={loginWithGoogle}>
            {t("home.startGoogle")}
          </button>
          <button type="button" className="m-btn m-btn--kakao" onClick={loginWithKakao}>
            {t("home.startKakao")}
          </button>
        </div>
      </div>
    );
  }

  if (isInviteLink && submitting && !error) {
    return (
      <div className="m-page">
        <header className="m-page-head">
          <h1 className="m-page-head__title">{t("bookGroups.joinInviteTitle")}</h1>
          <p className="m-page-head__sub">{t("bookGroups.joinInviteProcessing")}</p>
        </header>
      </div>
    );
  }

  return (
    <div className="m-page">
      <header className="m-page-head">
        <p className="m-breadcrumb">
          <Link to="/">{t("common.brand")}</Link>
          <span aria-hidden> › </span>
          <Link to={bookPath("/groups")}>{t("bookGroups.title")}</Link>
        </p>
        <h1 className="m-page-head__title">
          {isInviteLink ? t("bookGroups.joinInviteTitle") : t("bookGroups.joinTitle")}
        </h1>
        <p className="m-page-head__sub">
          {isInviteLink ? t("bookGroups.joinInviteProcessing") : t("bookGroups.joinSubtitle")}
        </p>
      </header>

      <section className="m-group-create">
        {error && <p className="m-error">{error}</p>}
        {!isInviteLink && (
          <form className="m-group-create__form" onSubmit={(e) => void onSubmit(e)}>
            <label className="m-group-create__label" htmlFor="group-slug">
              {t("bookGroups.joinSlugLabel")}
            </label>
            <input
              id="group-slug"
              className="m-group-create__input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              autoFocus
              placeholder={t("bookGroups.joinSlugPlaceholder")}
            />
            <div className="m-group-create__actions">
              <Link to={bookPath("/groups")} className="m-link-btn">
                {t("bookGroups.backToGroups")}
              </Link>
              <button type="submit" className="m-btn m-btn--write" disabled={submitting}>
                {submitting ? t("bookGroups.joining") : t("bookGroups.joinSubmit")}
              </button>
            </div>
          </form>
        )}
        {isInviteLink && error && (
          <div className="m-group-create__actions">
            <Link to={bookPath("/groups")} className="m-link-btn">
              {t("bookGroups.backToGroups")}
            </Link>
            <button
              type="button"
              className="m-btn m-btn--write"
              disabled={submitting}
              onClick={() => void submitJoin(slugFromUrl)}
            >
              {submitting ? t("bookGroups.joining") : t("bookGroups.joinSubmit")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
