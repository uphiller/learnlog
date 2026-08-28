import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, api, formatApiError } from "../api";
import { useAuth } from "../AuthContext";
import { bookPath } from "../routes";
import { useToast } from "../ToastContext";

function isAlreadyMemberError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  return err.message === "이미 참여 중인 독서모임입니다.";
}

export function BookGroupJoinPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { inviteSlug } = useParams<{ inviteSlug?: string }>();
  const { authenticated, loginWithGoogle, loginWithKakao, ready } = useAuth();
  const slugFromUrl = inviteSlug ? decodeURIComponent(inviteSlug) : "";
  const isInviteLink = Boolean(slugFromUrl);
  const autoJoinStarted = useRef(false);
  const [slug, setSlug] = useState(slugFromUrl);
  const [submitting, setSubmitting] = useState(false);
  const [inviteFailed, setInviteFailed] = useState(false);

  useEffect(() => {
    if (slugFromUrl) {
      setSlug(slugFromUrl);
    }
  }, [slugFromUrl]);

  async function submitJoin(slugValue: string) {
    const trimmed = slugValue.trim();
    if (!trimmed) {
      showToast(t("bookGroups.joinSlugRequired"), "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.requestJoinGroup(trimmed);
      navigate(bookPath("/groups"));
    } catch (err) {
      if (isAlreadyMemberError(err)) {
        navigate(bookPath(`/groups/${trimmed}/books`));
        return;
      }
      if (isInviteLink) setInviteFailed(true);
      showToast(formatApiError(err, t("bookGroups.joinFailed")), "error");
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

  if (isInviteLink && submitting && !inviteFailed) {
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
        {isInviteLink && inviteFailed && (
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
