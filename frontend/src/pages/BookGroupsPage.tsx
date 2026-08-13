import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../AuthContext";
import { LoadingState } from "../LoadingState";
import { api, type ReadingGroup } from "../api";

function roleLabel(role: ReadingGroup["my_role"], t: (key: string) => string): string | null {
  if (role === "owner") return t("bookGroups.roleOwner");
  if (role === "admin") return t("bookGroups.roleAdmin");
  return null;
}

export function BookGroupsPage() {
  const { t } = useTranslation();
  const { authenticated } = useAuth();
  const [groups, setGroups] = useState<ReadingGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authenticated) {
      setLoading(false);
      setGroups([]);
      return;
    }
    setLoading(true);
    api
      .listReadingGroups()
      .then((data) => {
        setGroups(data.results);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authenticated]);

  return (
    <div className="m-page">
      {!authenticated && !loading && (
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
          <p className="m-page-head__sub">
            {t("bookGroups.groupCount", { count: groups.length })}
          </p>
        </header>
      )}

      {authenticated && loading && <LoadingState />}
      {error && <p className="m-error">{error}</p>}

      {authenticated && !loading && groups.length > 0 && (
        <ul className="m-feed">
          {groups.map((group) => {
            const badge = roleLabel(group.my_role, t);
            return (
              <li key={group.id} className="m-feed__item">
                <Link to={`/book/groups/${group.slug}/books`} className="m-feed-row">
                  <div className="m-feed-row__body">
                    <div className="m-feed-row__title-row">
                      <h2 className="m-feed-row__title">{group.name}</h2>
                      {badge && <span className="m-book-badge">{badge}</span>}
                    </div>
                    <p className="m-feed-row__meta">
                      {t("bookGroups.memberCount", { count: group.member_count })}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && authenticated && groups.length === 0 && !error && (
        <div className="m-empty">
          <p className="m-empty__text">{t("bookGroups.empty")}</p>
          <Link to="/book/groups/new" className="m-btn m-btn--write">
            {t("layout.createGroup")}
          </Link>
        </div>
      )}
    </div>
  );
}
