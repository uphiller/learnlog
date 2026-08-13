import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGroupDetail } from "../GroupDetailContext";
import { LoadingState } from "../LoadingState";
import { api, type GroupMember, type ReadingGroup } from "../api";

function roleLabel(role: ReadingGroup["my_role"], t: (key: string) => string): string | null {
  if (role === "owner") return t("bookGroups.roleOwner");
  if (role === "admin") return t("bookGroups.roleAdmin");
  return null;
}

function userInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function canManageGroup(group: ReadingGroup | null): boolean {
  return group?.my_role === "owner" || group?.my_role === "admin";
}

export function BookGroupMembersPage() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { group } = useGroupDetail();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvingSub, setApprovingSub] = useState<string | null>(null);
  const dateLocale = i18n.language.startsWith("ko") ? "ko-KR" : "en-US";

  function loadMembers() {
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
  }

  useEffect(() => {
    loadMembers();
  }, [slug]);

  async function onApprove(keycloakSub: string) {
    if (!slug) return;
    setApprovingSub(keycloakSub);
    setError(null);
    try {
      await api.approveGroupMember(slug, keycloakSub);
      loadMembers();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("bookGroupDetail.approveFailed"));
    } finally {
      setApprovingSub(null);
    }
  }

  return (
    <section className="m-group-panel">
      <h2 className="m-visually-hidden">{t("bookGroupDetail.membersTab")}</h2>
      {loading && <LoadingState />}
      {error && <p className="m-error">{error}</p>}
      {!loading && members.length > 0 && (
        <ul className="m-member-list">
          {members.map((member) => {
            const badge = roleLabel(member.role, t);
            const isPending = member.status === "pending";
            return (
              <li key={member.keycloak_sub} className="m-member-list__item">
                <span className="m-avatar" aria-hidden>
                  {userInitial(member.display_name)}
                </span>
                <div className="m-member-list__body">
                  <div className="m-member-list__name-row">
                    <span className="m-member-list__name">{member.display_name}</span>
                    {isPending ? (
                      <span className="m-book-badge m-book-badge--sm m-book-badge--pending">
                        {t("bookGroups.pendingBadge")}
                      </span>
                    ) : (
                      badge && <span className="m-book-badge m-book-badge--sm">{badge}</span>
                    )}
                  </div>
                  <span className="m-member-list__meta">
                    {new Date(member.joined_at).toLocaleDateString(dateLocale)}
                  </span>
                </div>
                {isPending && canManageGroup(group) && (
                  <button
                    type="button"
                    className="m-btn m-btn--write m-btn--sm"
                    disabled={approvingSub === member.keycloak_sub}
                    onClick={() => void onApprove(member.keycloak_sub)}
                  >
                    {approvingSub === member.keycloak_sub
                      ? t("bookGroupDetail.approving")
                      : t("bookGroupDetail.approveMember")}
                  </button>
                )}
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
