import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function Layout({ children }: { children: React.ReactNode }) {
  const { username, login, logout, authenticated } = useAuth();

  return (
    <div className="layout">
      <header>
        <Link to="/" className="brand">
          Board
        </Link>
        <div className="header-right">
          {authenticated ? (
            <>
              <span>{username}</span>
              <button type="button" onClick={() => void logout()}>
                로그아웃
              </button>
            </>
          ) : (
            <button type="button" onClick={login}>
              Google로 로그인
            </button>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
