import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../AuthContext";
import { copyGroupInviteLink } from "../groupInvite";
import { LoadingState } from "../LoadingState";
import { api, type ReadingGroup } from "../api";
import { bookPath } from "../routes";

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
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

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

  async function onCopyInvite(slug: string) {
    try {
      await copyGroupInviteLink(slug);
      setCopiedSlug(slug);
      window.setTimeout(() => {
        setCopiedSlug((current) => (current === slug ? null : current));
      }, 2000);
    } catch {
      setError(t("bookGroups.copyInviteFailed"));
    }
  }

  const activeGroups = groups.filter((g) => g.my_status === "active");
  const pendingGroups = groups.filter((g) => g.my_status === "pending");

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
            {t("bookGroups.groupCount", { count: activeGroups.length })}
          </p>
        </header>
      )}

      {authenticated && loading && <LoadingState />}
      {error && <p className="m-error">{error}</p>}

      {authenticated && !loading && pendingGroups.length > 0 && (
        <section className="m-group-join-pending">
          <h2 className="m-compose__label">{t("bookGroups.pendingSection")}</h2>
          <ul className="m-feed">
            {pendingGroups.map((group) => (
              <li key={group.id} className="m-feed__item">
                <div className="m-feed-row m-feed-row--static">
                  <div className="m-feed-row__body">
                    <div className="m-feed-row__title-row">
                      <h3 className="m-feed-row__title">{group.name}</h3>
                      <span className="m-book-badge m-book-badge--pending">
                        {t("bookGroups.pendingBadge")}
                      </span>
                    </div>
                    <p className="m-feed-row__meta">{t("bookGroups.pendingHint")}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {authenticated && !loading && activeGroups.length > 0 && (
        <ul className="m-feed">
          {activeGroups.map((group) => {
            const badge = roleLabel(group.my_role, t);
            const isOwner = group.my_role === "owner";
            return (
              <li key={group.id} className="m-feed__item">
                <div className="m-feed-row">
                  <Link to={bookPath(`/groups/${group.slug}/books`)} className="m-feed-row__link">
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
                  {isOwner && (
                    <button
                      type="button"
                      className="m-btn m-btn--outline m-btn--sm m-feed-row__action"
                      onClick={() => void onCopyInvite(group.slug)}
                    >
                      {copiedSlug === group.slug
                        ? t("bookGroups.inviteLinkCopied")
                        : t("bookGroups.copyInviteLink")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && authenticated && activeGroups.length === 0 && pendingGroups.length === 0 && !error && (
        <div className="m-empty">
          <p className="m-empty__text">{t("bookGroups.empty")}</p>
          <Link to={bookPath("/groups/new")} className="m-btn m-btn--write">
            {t("layout.createGroup")}
          </Link>
        </div>
      )}
    </div>
  );
}
