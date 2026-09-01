import { useEffect, useId, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProfileMenu } from "./ProfileMenuContext";

function userInitial(name: string | undefined): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

type Props = {
  displayName?: string;
};

export function ProfileMenuAnchor({ displayName }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const { menuOpen, toggleProfileMenu, closeProfileMenu, openProfileNameEdit } = useProfileMenu();

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) closeProfileMenu();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeProfileMenu();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, closeProfileMenu]);

  function onOpenActivityLog() {
    closeProfileMenu();
    navigate("/history");
  }

  return (
    <div className="m-profile-anchor" ref={rootRef}>
      <button
        type="button"
        className="m-avatar m-avatar--button"
        title={displayName || undefined}
        aria-label={t("profile.openMenu")}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={toggleProfileMenu}
      >
        {userInitial(displayName)}
      </button>

      {menuOpen && (
        <div className="m-profile-dropdown" id={menuId} role="menu" aria-label={t("profile.title")}>
          <button
            type="button"
            role="menuitem"
            className="m-profile-dropdown__item"
            onClick={openProfileNameEdit}
          >
            {t("profile.editName")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="m-profile-dropdown__item"
            onClick={onOpenActivityLog}
          >
            {t("profile.activityLog")}
          </button>
        </div>
      )}
    </div>
  );
}
