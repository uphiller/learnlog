import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import keycloak from "./keycloak";
import { LoadingSpinner } from "./LoadingSpinner";

type AuthContextValue = {
  ready: boolean;
  authenticated: boolean;
  username: string;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const redirectUri = () => `${window.location.origin}/`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const initStarted = useRef(false);

  useEffect(() => {
    keycloak.onAuthSuccess = () => setAuthenticated(true);
    keycloak.onAuthLogout = () => setAuthenticated(false);
    keycloak.onAuthError = () => setAuthenticated(false);
    keycloak.onAuthRefreshError = () => setAuthenticated(false);

    if (initStarted.current) {
      setAuthenticated(Boolean(keycloak.authenticated));
      setReady(true);
      return;
    }
    initStarted.current = true;

    keycloak
      .init({ onLoad: "check-sso", pkceMethod: "S256", checkLoginIframe: false })
      .then((auth) => {
        setAuthenticated(auth);
        setReady(true);
      })
      .catch((err) => {
        console.error("Keycloak init failed", err);
        setAuthenticated(Boolean(keycloak.authenticated));
        setReady(true);
      });
  }, []);

  const login = useCallback(() => {
    void keycloak
      .login({ redirectUri: redirectUri(), idpHint: "google" })
      .catch(async (err) => {
        console.error("Keycloak login failed", err);
        try {
          window.location.assign(
            await keycloak.createLoginUrl({
              redirectUri: redirectUri(),
              idpHint: "google",
            }),
          );
        } catch (urlErr) {
          console.error("Keycloak login URL failed", urlErr);
        }
      });
  }, []);

  const logout = useCallback(() => {
    setAuthenticated(false);
    void keycloak
      .logout({ redirectUri: redirectUri() })
      .catch(() => login());
  }, [login]);

  const username = authenticated
    ? keycloak.tokenParsed?.preferred_username ||
      keycloak.tokenParsed?.email ||
      "user"
    : "";

  const value = useMemo(
    () => ({ ready, authenticated, username, login, logout }),
    [ready, authenticated, username, login, logout],
  );

  if (!ready) {
    return (
      <div
        className="m-auth-loading"
        role="status"
        aria-live="polite"
        aria-label="Keycloak 로그인 준비 중"
      >
        <LoadingSpinner />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
