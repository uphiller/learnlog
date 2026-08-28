import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { bookPath, isBookHost } from "./routes";

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
        {isBookHost() && (
          <NavLink to="/feedback" className="m-booklog-tabs__link">
            {t("layout.feedbackTab")}
          </NavLink>
        )}
      </div>
    </nav>
  );
}
