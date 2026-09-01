import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { formatApiError, isProfanityError } from "./api";
import { useAuth } from "./AuthContext";
import { markOnboardingProfileDone } from "./onboarding";
import { useToast } from "./ToastContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ProfileNameEditModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { displayName, updateDisplayName } = useAuth();
  const [name, setName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(displayName);
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
      showToast(t("profile.nameRequired"), "error");
      return;
    }

    setSaving(true);
    try {
      await updateDisplayName(trimmed);
      markOnboardingProfileDone();
      onClose();
    } catch (err) {
      if (isProfanityError(err)) {
        setName("");
      }
      showToast(formatApiError(err, t("profile.saveFailed")), "error");
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
        aria-labelledby="profile-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="m-modal__head">
          <h2 id="profile-edit-title" className="m-modal__title">
            {t("profile.editName")}
          </h2>
          <button type="button" className="m-modal__close" onClick={onClose} aria-label={t("profile.close")}>
            ×
          </button>
        </header>
        <form className="m-modal__form" onSubmit={(e) => void onSubmit(e)}>
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
