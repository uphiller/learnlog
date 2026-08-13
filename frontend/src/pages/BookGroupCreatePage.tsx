import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function BookGroupCreatePage() {
  const { t } = useTranslation();

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
      <div className="m-empty">
        <p className="m-empty__text">{t("common.comingSoon")}</p>
        <Link to="/book/groups" className="m-link-btn">
          {t("bookGroups.backToGroups")}
        </Link>
      </div>
    </div>
  );
}
