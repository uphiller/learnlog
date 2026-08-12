import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher";

function userInitial(name: string | undefined): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { username, login, logout, authenticated } = useAuth();
  const { pathname } = useLocation();
  const inBooklog = pathname === "/book" || pathname.startsWith("/book/");

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
                {inBooklog && (
                  <nav className="m-nav" aria-label={t("layout.booklogNav")}>
                    <NavLink to="/book" end className="m-nav__link">
                      {t("layout.library")}
                    </NavLink>
                  </nav>
                )}
                {inBooklog && (
                  <Link to="/book/search" className="m-btn m-btn--write">
                    {t("layout.addBook")}
                  </Link>
                )}
                <span className="m-avatar" title={username ?? undefined}>
                  {userInitial(username)}
                </span>
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
              <button type="button" className="m-btn m-btn--outline" onClick={login}>
                {t("layout.login")}
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="m-main">{children}</main>
    </div>
  );
}
