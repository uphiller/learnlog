import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../AuthContext";

const APPS = [{ id: "book", to: "/book", available: true }] as const;

export function OfMeHomePage() {
  const { t } = useTranslation();
  const { authenticated, loginWithGoogle, loginWithKakao } = useAuth();

  return (
    <div className="m-page">
      <header className="m-hero">
        <h1 className="m-hero__title">{t("common.brand")}</h1>
        <p className="m-hero__lead">{t("home.lead")}</p>
        {!authenticated && (
          <div className="m-login-actions">
            <button type="button" className="m-btn m-btn--write" onClick={loginWithGoogle}>
              {t("home.startGoogle")}
            </button>
            <button type="button" className="m-btn m-btn--kakao" onClick={loginWithKakao}>
              {t("home.startKakao")}
            </button>
          </div>
        )}
      </header>

      <ul className="m-hub">
        {APPS.map((app) => (
          <li key={app.id}>
            {app.available ? (
              <Link to={app.to} className="m-hub-card">
                <h2 className="m-hub-card__title m-serif">{t("home.booklogTitle")}</h2>
                <p className="m-hub-card__desc">{t("home.booklogDesc")}</p>
                <span className="m-hub-card__cta">{t("common.open")}</span>
              </Link>
            ) : (
              <div className="m-hub-card m-hub-card--soon" aria-disabled>
                <h2 className="m-hub-card__title m-serif">{t("home.booklogTitle")}</h2>
                <p className="m-hub-card__desc">{t("home.booklogDesc")}</p>
                <span className="m-hub-card__badge">{t("common.comingSoon")}</span>
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className="m-hub-note">{t("home.hubNote")}</p>
    </div>
  );
}
