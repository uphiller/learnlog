import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "./api";
import { useAuth } from "./AuthContext";

function parseDisplayNameError(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  try {
    const data = JSON.parse(err.message) as Record<string, string[] | string>;
    const nameErrors = data.display_name;
    if (Array.isArray(nameErrors) && nameErrors[0]) return nameErrors[0];
    if (typeof data.detail === "string") return data.detail;
  } catch {
    if (err.message) return err.message;
  }
  return fallback;
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ProfileMenu({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { displayName, updateDisplayName } = useAuth();
  const [name, setName] = useState(displayName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(displayName);
      setError(null);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, displayName]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("profile.nameRequired"));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateDisplayName(trimmed);
      onClose();
    } catch (err) {
      setError(parseDisplayNameError(err, t("profile.saveFailed")));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="m-modal" role="presentation" onClick={onClose}>
      <div
        className="m-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-menu-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="m-modal__head">
          <h2 id="profile-menu-title" className="m-modal__title">
            {t("profile.title")}
          </h2>
          <button type="button" className="m-modal__close" onClick={onClose} aria-label={t("profile.close")}>
            ×
          </button>
        </header>
        <form className="m-modal__form" onSubmit={(e) => void onSubmit(e)}>
          {error && <p className="m-error">{error}</p>}
          <label className="m-group-create__label" htmlFor="profile-name">
            {t("profile.nameLabel")}
          </label>
          <input
            ref={inputRef}
            id="profile-name"
            className="m-group-create__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={255}
            required
            placeholder={t("profile.namePlaceholder")}
          />
          <div className="m-modal__actions">
            <button type="button" className="m-link-btn" onClick={onClose}>
              {t("profile.cancel")}
            </button>
            <button type="submit" className="m-btn m-btn--write m-btn--sm" disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
