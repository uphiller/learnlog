import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function BooklogTabs() {
  const { t } = useTranslation();

  return (
    <nav className="m-booklog-tabs" aria-label={t("layout.booklogNav")}>
      <div className="m-booklog-tabs__inner">
        <NavLink to="/book" end className="m-booklog-tabs__link">
          {t("layout.libraryTab")}
        </NavLink>
        <NavLink to="/book/groups" className="m-booklog-tabs__link">
          {t("layout.readingGroupsTab")}
        </NavLink>
      </div>
    </nav>
  );
}
