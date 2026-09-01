import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ProfileNameEditModal } from "./ProfileNameEditModal";

type ProfileMenuContextValue = {
  menuOpen: boolean;
  toggleProfileMenu: () => void;
  closeProfileMenu: () => void;
  openProfileNameEdit: () => void;
};

const ProfileMenuContext = createContext<ProfileMenuContextValue | null>(null);

export function ProfileMenuProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const closeProfileMenu = useCallback(() => setMenuOpen(false), []);

  const toggleProfileMenu = useCallback(() => {
    setMenuOpen((open) => !open);
  }, []);

  const openProfileNameEdit = useCallback(() => {
    setMenuOpen(false);
    setEditOpen(true);
  }, []);

  const closeProfileNameEdit = useCallback(() => setEditOpen(false), []);

  const value = useMemo(
    () => ({
      menuOpen,
      toggleProfileMenu,
      closeProfileMenu,
      openProfileNameEdit,
    }),
    [menuOpen, toggleProfileMenu, closeProfileMenu, openProfileNameEdit],
  );

  return (
    <ProfileMenuContext.Provider value={value}>
      {children}
      <ProfileNameEditModal open={editOpen} onClose={closeProfileNameEdit} />
    </ProfileMenuContext.Provider>
  );
}

export function useProfileMenu() {
  const ctx = useContext(ProfileMenuContext);
  if (!ctx) {
    throw new Error("useProfileMenu must be used within ProfileMenuProvider");
  }
  return ctx;
}
