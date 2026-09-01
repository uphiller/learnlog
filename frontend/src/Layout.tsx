import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";
import { BooklogTabs } from "./BooklogTabs";
import { useGroupDetail } from "./GroupDetailContext";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { ProfileMenuAnchor } from "./ProfileMenuAnchor";
import {
  bookPath,
  isFeedbackListPath,
  isGroupsJoinPath,
  isGroupsListPath,
  isGroupBooksPath,
  isLibraryPath,
  matchGroupBoardList,
  showBooklogTabs,
} from "./routes";

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { displayName, loginWithGoogle, loginWithKakao, logout, authenticated } = useAuth();
  const { group: groupDetail } = useGroupDetail();
  const { pathname } = useLocation();
  const canManageGroupBooks =
    groupDetail &&
    (groupDetail.my_role === "owner" || groupDetail.my_role === "admin");
  const groupBoardSlug = matchGroupBoardList(pathname);

  return (
    <div className="layout">
      <header className="m-header">
        <div className="m-header__inner">
          <Link to="/" className="m-logo">
            <span className="m-logo__brand">{t("common.brand")}</span>
            <span className="m-logo__tagline">{t("common.tagline")}</span>
          </Link>
          <div className="m-header__actions">
            <LanguageSwitcher />
            {authenticated ? (
              <>
                {isLibraryPath(pathname) && (
                  <Link to={bookPath("/search")} className="m-btn m-btn--write">
                    {t("layout.addBook")}
                  </Link>
                )}
                {isGroupsListPath(pathname) && (
                  <Link to={bookPath("/groups/new")} className="m-btn m-btn--write">
                    {t("layout.createGroup")}
                  </Link>
                )}
                {isGroupsJoinPath(pathname) && (
                  <Link to={bookPath("/groups/join")} className="m-btn m-btn--outline">
                    {t("layout.joinGroup")}
                  </Link>
                )}
                {canManageGroupBooks && isGroupBooksPath(pathname) && groupDetail && (
                  <Link
                    to={bookPath(`/groups/${groupDetail.slug}/books/add`)}
                    className="m-btn m-btn--write"
                  >
                    {t("layout.addGroupBook")}
                  </Link>
                )}
                {groupBoardSlug && (
                  <Link
                    to={bookPath(`/groups/${groupBoardSlug}/board/new`)}
                    className="m-btn m-btn--write"
                  >
                    {t("layout.writePost")}
                  </Link>
                )}
                {isFeedbackListPath(pathname) && (
                  <Link to="/feedback/new" className="m-btn m-btn--write">
                    {t("layout.writeFeedback")}
                  </Link>
                )}
                <ProfileMenuAnchor displayName={displayName} />
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
      {showBooklogTabs(pathname) && <BooklogTabs />}
      <main className="m-main">{children}</main>
    </div>
  );
}
