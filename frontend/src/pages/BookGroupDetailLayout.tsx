import { useEffect, useState } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GroupDetailTabs } from "../GroupDetailTabs";
import { LoadingState } from "../LoadingState";
import { api, type ReadingGroup } from "../api";

function roleLabel(role: ReadingGroup["my_role"], t: (key: string) => string): string | null {
  if (role === "owner") return t("bookGroups.roleOwner");
  if (role === "admin") return t("bookGroups.roleAdmin");
  return null;
}

export function BookGroupDetailLayout() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [group, setGroup] = useState<ReadingGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .getReadingGroup(slug)
      .then((data) => {
        setGroup(data);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (!slug) {
    return <p className="m-error">{t("bookGroupDetail.notFound")}</p>;
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error || !group) {
    return (
      <div className="m-page">
        <p className="m-error">{error ?? t("bookGroupDetail.notFound")}</p>
        <Link to="/book/groups" className="m-link-btn">
          {t("bookGroups.backToGroups")}
        </Link>
      </div>
    );
  }

  const badge = roleLabel(group.my_role, t);

  return (
    <div className="m-page">
      <header className="m-page-head">
        <p className="m-breadcrumb">
          <Link to="/">{t("common.brand")}</Link>
          <span aria-hidden> › </span>
          <Link to="/book/groups">{t("bookGroups.title")}</Link>
        </p>
        <div className="m-page-head__title-row">
          <h1 className="m-page-head__title">{group.name}</h1>
          {badge && <span className="m-book-badge">{badge}</span>}
        </div>
        <p className="m-page-head__sub">
          {t("bookGroups.memberCount", { count: group.member_count })}
        </p>
      </header>
      <GroupDetailTabs slug={slug} />
      <Outlet context={{ group }} />
    </div>
  );
}
