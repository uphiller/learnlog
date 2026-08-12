import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AppLanguage } from "./index";
import { FlagIcon } from "./Flags";

const LANGUAGE_OPTIONS: { code: AppLanguage; ariaLabelKey: "ko" | "en" }[] = [
  { code: "ko", ariaLabelKey: "ko" },
  { code: "en", ariaLabelKey: "en" },
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const current: AppLanguage = i18n.language === "en" ? "en" : "ko";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function selectLanguage(code: AppLanguage) {
    void i18n.changeLanguage(code);
    setOpen(false);
  }

  return (
    <div className="m-lang-select-wrap" ref={rootRef}>
      <button
        type="button"
        className="m-lang-select"
        aria-label={t("language.label")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((value) => !value)}
      >
        <FlagIcon code={current} className="m-lang-select__flag" />
      </button>

      {open && (
        <ul className="m-lang-select__menu" id={listboxId} role="listbox" aria-label={t("language.label")}>
          {LANGUAGE_OPTIONS.map(({ code, ariaLabelKey }) => (
            <li key={code} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={current === code}
                aria-label={t(`language.${ariaLabelKey}`)}
                className={[
                  "m-lang-select__option",
                  current === code ? "m-lang-select__option--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => selectLanguage(code)}
              >
                <FlagIcon code={code} className="m-lang-select__flag" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
