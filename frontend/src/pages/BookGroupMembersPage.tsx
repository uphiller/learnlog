import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LoadingState } from "../LoadingState";
import { api, type GroupMember } from "../api";

function userInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function roleLabel(role: GroupMember["role"], t: (key: string) => string): string | null {
  if (role === "owner") return t("bookGroups.roleOwner");
  if (role === "admin") return t("bookGroups.roleAdmin");
  return null;
}

export function BookGroupMembersPage() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const dateLocale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .listGroupMembers(slug)
      .then((data) => {
        setMembers(data);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <section className="m-group-panel">
      <h2 className="m-visually-hidden">{t("bookGroupDetail.membersTab")}</h2>
      {loading && <LoadingState />}
      {error && <p className="m-error">{error}</p>}
      {!loading && members.length > 0 && (
        <ul className="m-member-list">
          {members.map((member) => {
            const badge = roleLabel(member.role, t);
            return (
              <li key={member.user_id} className="m-member-list__item">
                <span className="m-avatar" aria-hidden>
                  {userInitial(member.display_name)}
                </span>
                <div className="m-member-list__body">
                  <div className="m-member-list__name-row">
                    <span className="m-member-list__name">{member.display_name}</span>
                    {badge && <span className="m-book-badge m-book-badge--sm">{badge}</span>}
                  </div>
                  <span className="m-member-list__meta">
                    {new Date(member.joined_at).toLocaleDateString(dateLocale)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!loading && members.length === 0 && !error && (
        <div className="m-empty">
          <p className="m-empty__text">{t("bookGroupDetail.membersEmpty")}</p>
        </div>
      )}
    </section>
  );
}
