import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { bookPath } from "./routes";

export function BooklogTabs() {
  const { t } = useTranslation();

  return (
    <nav className="m-booklog-tabs" aria-label={t("layout.booklogNav")}>
      <div className="m-booklog-tabs__inner">
        <NavLink to={bookPath()} end className="m-booklog-tabs__link">
          {t("layout.libraryTab")}
        </NavLink>
        <NavLink to={bookPath("/groups")} className="m-booklog-tabs__link">
          {t("layout.readingGroupsTab")}
        </NavLink>
      </div>
    </nav>
  );
}
