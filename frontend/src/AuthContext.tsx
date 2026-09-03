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
import { api } from "./api";
import { isSharePath } from "./routes";

type AuthContextValue = {
  ready: boolean;
  authenticated: boolean;
  displayName: string;
  refreshProfile: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  loginWithGoogle: () => void;
  loginWithKakao: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Mobile WebViews often hang on silent SSO; never block the UI forever. */
const KEYCLOAK_INIT_TIMEOUT_MS = 4000;

const redirectUri = () =>
  `${window.location.origin}${window.location.pathname}${window.location.search}`;

function fallbackDisplayName(): string {
  return (
    keycloak.tokenParsed?.name ||
    keycloak.tokenParsed?.preferred_username ||
    keycloak.tokenParsed?.email ||
    "user"
  );
}

function loginWithIdp(idpHint: string) {
  void keycloak
    .login({ redirectUri: redirectUri(), idpHint })
    .catch(async (err) => {
      console.error("Keycloak login failed", err);
      try {
        window.location.assign(
          await keycloak.createLoginUrl({
            redirectUri: redirectUri(),
            idpHint,
          }),
        );
      } catch (urlErr) {
        console.error("Keycloak login URL failed", urlErr);
      }
    });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const initStarted = useRef(false);
  const publicShareEntry = useRef(isSharePath(window.location.pathname));

  const refreshProfile = useCallback(async () => {
    if (!keycloak.authenticated) {
      setDisplayName("");
      return;
    }
    try {
      const profile = await api.getProfile();
      setDisplayName(profile.display_name || fallbackDisplayName());
    } catch {
      setDisplayName(fallbackDisplayName());
    }
  }, []);

  useEffect(() => {
    keycloak.onAuthSuccess = () => {
      setAuthenticated(true);
      void refreshProfile();
      setReady(true);
    };
    keycloak.onAuthLogout = () => {
      setAuthenticated(false);
      setDisplayName("");
    };
    keycloak.onAuthError = () => {
      setAuthenticated(false);
      setDisplayName("");
    };
    keycloak.onAuthRefreshError = () => {
      setAuthenticated(false);
      setDisplayName("");
    };

    if (initStarted.current) {
      const auth = Boolean(keycloak.authenticated);
      setAuthenticated(auth);
      if (auth) {
        void refreshProfile();
      } else {
        setDisplayName("");
      }
      setReady(true);
      return;
    }
    initStarted.current = true;

    let cancelled = false;

    const finish = (auth: boolean) => {
      if (cancelled) return;
      setAuthenticated(auth);
      if (auth) {
        void refreshProfile();
      } else {
        setDisplayName("");
      }
      setReady(true);
    };

    const initPromise = keycloak.init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      checkLoginIframe: false,
      messageReceiveTimeout: KEYCLOAK_INIT_TIMEOUT_MS,
    });

    const timer = window.setTimeout(() => {
      finish(Boolean(keycloak.authenticated));
    }, KEYCLOAK_INIT_TIMEOUT_MS);

    void initPromise
      .then((auth) => {
        window.clearTimeout(timer);
        finish(Boolean(auth));
      })
      .catch((err) => {
        window.clearTimeout(timer);
        console.error("Keycloak init failed", err);
        finish(Boolean(keycloak.authenticated));
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [refreshProfile]);

  const loginWithGoogle = useCallback(() => loginWithIdp("google"), []);
  const loginWithKakao = useCallback(() => loginWithIdp("kakao"), []);

  const logout = useCallback(() => {
    setAuthenticated(false);
    setDisplayName("");
    void keycloak
      .logout({ redirectUri: redirectUri() })
      .catch(() => loginWithGoogle());
  }, [loginWithGoogle]);

  const updateDisplayName = useCallback(async (name: string) => {
    const profile = await api.updateProfile(name);
    setDisplayName(profile.display_name);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      authenticated,
      displayName,
      refreshProfile,
      updateDisplayName,
      loginWithGoogle,
      loginWithKakao,
      logout,
    }),
    [
      ready,
      authenticated,
      displayName,
      refreshProfile,
      updateDisplayName,
      loginWithGoogle,
      loginWithKakao,
      logout,
    ],
  );

  // Public share links must render immediately (Kakao / mobile WebViews).
  if (!ready && !publicShareEntry.current) {
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
