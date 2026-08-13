import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";
import { BooklogTabs } from "./BooklogTabs";
import { useGroupDetail } from "./GroupDetailContext";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { ProfileMenu } from "./ProfileMenu";

function userInitial(name: string | undefined): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { displayName, loginWithGoogle, loginWithKakao, logout, authenticated } = useAuth();
  const { group: groupDetail } = useGroupDetail();
  const { pathname } = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const showBooklogTabs = pathname === "/book" || pathname === "/book/groups";
  const inLibraryFlow =
    pathname === "/book" || pathname === "/book/search" || /^\/book\/\d+$/.test(pathname);
  const inGroupsListFlow = pathname === "/book/groups" || pathname === "/book/groups/new";
  const inGroupsJoinFlow = pathname === "/book/groups" || pathname === "/book/groups/join";
  const canManageGroupBooks =
    groupDetail &&
    (groupDetail.my_role === "owner" || groupDetail.my_role === "admin");
  const inGroupBooksFlow =
    canManageGroupBooks && /^\/book\/groups\/[^/]+\/books\/?$/.test(pathname);
  const groupBoardListMatch = pathname.match(/^\/book\/groups\/([^/]+)\/board\/?$/);
  const groupBoardSlug = groupBoardListMatch?.[1];

  return (
    <div className="layout">
      <header className="m-header">
        <div className="m-header__inner">
          <Link to="/" className="m-logo">
            {t("common.brand")}
          </Link>
          <div className="m-header__actions">
            <LanguageSwitcher />
            {authenticated ? (
              <>
                {inLibraryFlow && (
                  <Link to="/book/search" className="m-btn m-btn--write">
                    {t("layout.addBook")}
                  </Link>
                )}
                {inGroupsListFlow && (
                  <Link to="/book/groups/new" className="m-btn m-btn--write">
                    {t("layout.createGroup")}
                  </Link>
                )}
                {inGroupsJoinFlow && (
                  <Link to="/book/groups/join" className="m-btn m-btn--outline">
                    {t("layout.joinGroup")}
                  </Link>
                )}
                {inGroupBooksFlow && groupDetail && (
                  <Link
                    to={`/book/groups/${groupDetail.slug}/books/add`}
                    className="m-btn m-btn--write"
                  >
                    {t("layout.addGroupBook")}
                  </Link>
                )}
                {groupBoardSlug && (
                  <Link
                    to={`/book/groups/${groupBoardSlug}/board/new`}
                    className="m-btn m-btn--write"
                  >
                    {t("layout.writePost")}
                  </Link>
                )}
                <button
                  type="button"
                  className="m-avatar m-avatar--button"
                  title={displayName || undefined}
                  aria-label={t("profile.openMenu")}
                  onClick={() => setProfileOpen(true)}
                >
                  {userInitial(displayName)}
                </button>
                <ProfileMenu open={profileOpen} onClose={() => setProfileOpen(false)} />
                <Link
                  to="/history"
                  className="m-link-btn m-icon-link"
                  aria-label={t("layout.activityLog")}
                  title={t("layout.activityLog")}
                >
                  <svg
                    className="m-icon-link__svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M8 6h13" />
                    <path d="M8 12h13" />
                    <path d="M8 18h9" />
                    <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                </Link>
                <button
                  type="button"
                  className="m-link-btn m-link-btn--hide-sm"
                  onClick={() => void logout()}
                >
                  {t("layout.logout")}
                </button>
              </>
            ) : (
              <div className="m-login-actions m-login-actions--header">
                <button
                  type="button"
                  className="m-btn m-btn--outline m-btn--sm"
                  onClick={loginWithGoogle}
                >
                  {t("layout.loginGoogle")}
                </button>
                <button
                  type="button"
                  className="m-btn m-btn--kakao m-btn--sm"
                  onClick={loginWithKakao}
                >
                  {t("layout.loginKakao")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {showBooklogTabs && <BooklogTabs />}
      <main className="m-main">{children}</main>
    </div>
  );
}
