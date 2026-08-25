import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, type Book } from "./api";
import { useAuth } from "./AuthContext";
import { isOnboardingDismissed, isOnboardingProfileDone, dismissOnboarding, ONBOARDING_UPDATED_EVENT } from "./onboarding";
import { useProfileMenu } from "./ProfileMenuContext";
import { bookPath } from "./routes";

type Props = {
  books: Book[];
};

type StepId = "profile" | "book" | "quote" | "group";

async function detectHasQuote(books: Book[]): Promise<boolean> {
  for (const book of books.slice(0, 10)) {
    const data = await api.listQuotes(book.id);
    if (data.count > 0) return true;
  }
  return false;
}

export function OnboardingChecklist({ books }: Props) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { authenticated } = useAuth();
  const { openProfileMenu } = useProfileMenu();
  const [profileDone, setProfileDone] = useState(isOnboardingProfileDone);
  const [dismissed, setDismissed] = useState(isOnboardingDismissed);
  const [hasQuote, setHasQuote] = useState(false);
  const [groupCount, setGroupCount] = useState(0);

  const syncOnboardingFromStorage = useCallback(() => {
    setProfileDone(isOnboardingProfileDone());
    setDismissed(isOnboardingDismissed());
  }, []);

  useEffect(() => {
    syncOnboardingFromStorage();
    window.addEventListener(ONBOARDING_UPDATED_EVENT, syncOnboardingFromStorage);
    return () => window.removeEventListener(ONBOARDING_UPDATED_EVENT, syncOnboardingFromStorage);
  }, [syncOnboardingFromStorage]);

  useEffect(() => {
    if (!authenticated) {
      setHasQuote(false);
      setGroupCount(0);
      return;
    }

    let cancelled = false;

    async function loadExtras() {
      try {
        const [quoteFound, groupsData] = await Promise.all([
          books.length > 0 ? detectHasQuote(books) : Promise.resolve(false),
          api.listReadingGroups(),
        ]);
        if (cancelled) return;
        setHasQuote(quoteFound);
        setGroupCount(groupsData.results.length);
      } catch {
        if (!cancelled) {
          setHasQuote(false);
          setGroupCount(0);
        }
      }
    }

    void loadExtras();
    return () => {
      cancelled = true;
    };
  }, [authenticated, books, pathname]);

  if (!authenticated || dismissed) {
    return null;
  }

  const bookDone = books.length > 0;
  const groupDone = groupCount > 0;
  const requiredDone = profileDone && bookDone && hasQuote;
  const completedCount =
    Number(profileDone) + Number(bookDone) + Number(hasQuote) + Number(groupDone);

  const steps: {
    id: StepId;
    done: boolean;
    optional?: boolean;
    action: ReactNode;
  }[] = [
    {
      id: "profile",
      done: profileDone,
      action: profileDone ? null : (
        <button type="button" className="m-onboarding__action" onClick={openProfileMenu}>
          {t("onboarding.profileAction")}
        </button>
      ),
    },
    {
      id: "book",
      done: bookDone,
      action: bookDone ? null : (
        <Link to={bookPath("/search")} className="m-onboarding__action">
          {t("onboarding.bookAction")}
        </Link>
      ),
    },
    {
      id: "quote",
      done: hasQuote,
      action: hasQuote ? null : bookDone ? (
        <Link to={bookPath(`/${books[0].id}`)} className="m-onboarding__action">
          {t("onboarding.quoteAction")}
        </Link>
      ) : (
        <span className="m-onboarding__hint">{t("onboarding.quoteHint")}</span>
      ),
    },
    {
      id: "group",
      done: groupDone,
      optional: true,
      action: groupDone ? null : (
        <Link to={bookPath("/groups")} className="m-onboarding__action">
          {t("onboarding.groupAction")}
        </Link>
      ),
    },
  ];

  return (
    <section className="m-onboarding" aria-labelledby="onboarding-title">
      <div className="m-onboarding__head">
        <div>
          <h2 id="onboarding-title" className="m-onboarding__title">
            {t("onboarding.title")}
          </h2>
          <p className="m-onboarding__lead">{t("onboarding.lead")}</p>
        </div>
        <button
          type="button"
          className="m-link-btn m-onboarding__dismiss"
          onClick={dismissOnboarding}
        >
          {t("onboarding.dismiss")}
        </button>
      </div>

      <p className="m-onboarding__progress" aria-live="polite">
        {t("onboarding.progress", { done: completedCount, total: steps.length })}
      </p>

      <ol className="m-onboarding__list">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`m-onboarding__item${step.done ? " m-onboarding__item--done" : ""}`}
          >
            <span className="m-onboarding__check" aria-hidden>
              {step.done ? "✓" : "○"}
            </span>
            <div className="m-onboarding__body">
              <p className="m-onboarding__label">
                {t(`onboarding.${step.id}`)}
                {step.optional && (
                  <span className="m-onboarding__optional">{t("onboarding.optional")}</span>
                )}
              </p>
              {step.action}
            </div>
          </li>
        ))}
      </ol>

      {requiredDone && (
        <p className="m-onboarding__complete">{t("onboarding.allRequiredDone")}</p>
      )}
    </section>
  );
}
