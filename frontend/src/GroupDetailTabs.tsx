import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

type Props = {
  slug: string;
};

export function GroupDetailTabs({ slug }: Props) {
  const { t } = useTranslation();
  const base = `/book/groups/${slug}`;

  return (
    <nav className="m-booklog-tabs" aria-label={t("bookGroupDetail.tabsLabel")}>
      <div className="m-booklog-tabs__inner">
        <NavLink to={`${base}/books`} className="m-booklog-tabs__link">
          {t("bookGroupDetail.booksTab")}
        </NavLink>
        <NavLink to={`${base}/members`} className="m-booklog-tabs__link">
          {t("bookGroupDetail.membersTab")}
        </NavLink>
        <NavLink to={`${base}/board`} className="m-booklog-tabs__link">
          {t("bookGroupDetail.boardTab")}
        </NavLink>
      </div>
    </nav>
  );
}
