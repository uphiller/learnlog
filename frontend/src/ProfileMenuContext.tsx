import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ProfileMenu } from "./ProfileMenu";

type ProfileMenuContextValue = {
  openProfileMenu: () => void;
};

const ProfileMenuContext = createContext<ProfileMenuContextValue | null>(null);

export function ProfileMenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openProfileMenu = useCallback(() => setOpen(true), []);
  const closeProfileMenu = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ openProfileMenu }), [openProfileMenu]);

  return (
    <ProfileMenuContext.Provider value={value}>
      {children}
      <ProfileMenu open={open} onClose={closeProfileMenu} />
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
