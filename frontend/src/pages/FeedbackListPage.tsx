import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LoadingState } from "../LoadingState";
import { api, type FeatureRequest, type FeatureRequestStatus } from "../api";
import { useAuth } from "../AuthContext";

function bodyPreview(body: string, max = 120): string {
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

const STATUS_KEYS: Record<FeatureRequestStatus, string> = {
  open: "feedback.statusOpen",
  planned: "feedback.statusPlanned",
  in_progress: "feedback.statusInProgress",
  done: "feedback.statusDone",
  declined: "feedback.statusDeclined",
};

export function FeedbackListPage() {
  const { t, i18n } = useTranslation();
  const { authenticated, loginWithGoogle, loginWithKakao } = useAuth();
  const [items, setItems] = useState<FeatureRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const dateLocale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";

  useEffect(() => {
    if (!authenticated) {
      setLoading(false);
      setItems([]);
      return;
    }
    setLoading(true);
    api
      .listFeatureRequests(statusFilter ? { status: statusFilter } : undefined)
      .then((data) => {
        setItems(data.results);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authenticated, statusFilter]);

  return (
    <div className="m-page">
      <header className="m-page-head">
        <p className="m-breadcrumb">
          <Link to="/">{t("layout.booklogNav")}</Link>
          <span aria-hidden> › </span>
          <span>{t("feedback.title")}</span>
        </p>
        <h1 className="m-page-head__title">{t("feedback.title")}</h1>
        <p className="m-page-head__sub">{t("feedback.lead")}</p>
      </header>

      {!authenticated && (
        <section className="m-empty">
          <p className="m-empty__text">{t("common.loginToStart")}</p>
          <div className="m-login-actions">
            <button type="button" className="m-btn m-btn--write" onClick={loginWithGoogle}>
              {t("home.startGoogle")}
            </button>
            <button type="button" className="m-btn m-btn--kakao" onClick={loginWithKakao}>
              {t("home.startKakao")}
            </button>
          </div>
        </section>
      )}

      {authenticated && (
        <>
          <div className="m-feedback-filters">
            <label className="m-visually-hidden" htmlFor="feedback-status">
              {t("feedback.filterStatus")}
            </label>
            <select
              id="feedback-status"
              className="m-feedback-filters__select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{t("feedback.filterAll")}</option>
              {(Object.keys(STATUS_KEYS) as FeatureRequestStatus[]).map((key) => (
                <option key={key} value={key}>
                  {t(STATUS_KEYS[key])}
                </option>
              ))}
            </select>
          </div>

          {loading && <LoadingState />}
          {error && <p className="m-error">{error}</p>}

          {!loading && items.length > 0 && (
            <ul className="m-feed">
              {items.map((item) => (
                <li key={item.id} className="m-feed__item">
                  <Link to={`/feedback/${item.id}`} className="m-feed-row m-board-row">
                    <div className="m-feed-row__body">
                      <div className="m-feed-row__title-row">
                        <h3 className="m-feed-row__title">{item.title}</h3>
                        <span className={`m-feedback-status m-feedback-status--${item.status}`}>
                          {t(STATUS_KEYS[item.status])}
                        </span>
                      </div>
                      <p className="m-board-row__preview">{bodyPreview(item.body)}</p>
                      <p className="m-feed-row__sub">
                        {item.author_name} · {new Date(item.created_at).toLocaleDateString(dateLocale)}
                        {` · ${t("feedback.voteCount", { count: item.vote_count })}`}
                        {item.comment_count > 0 &&
                          ` · ${t("feedback.commentCount", { count: item.comment_count })}`}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {!loading && items.length === 0 && !error && (
            <div className="m-empty">
              <p className="m-empty__text">{t("feedback.empty")}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
