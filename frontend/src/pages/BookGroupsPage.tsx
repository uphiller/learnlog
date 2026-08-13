import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../AuthContext";

export function BookGroupsPage() {
  const { t } = useTranslation();
  const { authenticated } = useAuth();

  return (
    <div className="m-page">
      {!authenticated && (
        <div className="m-hero">
          <h1 className="m-hero__title">{t("bookGroups.guestTitle")}</h1>
          <p className="m-hero__lead">{t("bookGroups.guestLead")}</p>
          <p className="m-muted">{t("common.loginToStart")}</p>
        </div>
      )}

      {authenticated && (
        <header className="m-page-head">
          <p className="m-breadcrumb">
            <Link to="/">{t("common.brand")}</Link>
            <span aria-hidden> › </span>
            <span>{t("bookList.breadcrumb")}</span>
          </p>
          <h1 className="m-page-head__title">{t("bookGroups.title")}</h1>
          <p className="m-page-head__sub">{t("bookGroups.subtitle")}</p>
        </header>
      )}

      {authenticated && (
        <div className="m-empty">
          <p className="m-empty__text">{t("bookGroups.empty")}</p>
        </div>
      )}
    </div>
  );
}
