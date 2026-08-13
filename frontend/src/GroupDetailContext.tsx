import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ReadingGroup } from "./api";

type GroupDetailContextValue = {
  group: ReadingGroup | null;
  setGroup: (group: ReadingGroup | null) => void;
};

const GroupDetailContext = createContext<GroupDetailContextValue | null>(null);

export function GroupDetailProvider({ children }: { children: ReactNode }) {
  const [group, setGroup] = useState<ReadingGroup | null>(null);
  const value = useMemo(() => ({ group, setGroup }), [group]);
  return <GroupDetailContext.Provider value={value}>{children}</GroupDetailContext.Provider>;
}

export function useGroupDetail() {
  const ctx = useContext(GroupDetailContext);
  if (!ctx) {
    throw new Error("useGroupDetail must be used within GroupDetailProvider");
  }
  return ctx;
}
