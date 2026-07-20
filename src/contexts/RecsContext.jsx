import { createContext, useContext } from "react";

export const RecsContext = createContext(null);

export function useRecsContext() {
  const ctx = useContext(RecsContext);
  if (!ctx) throw new Error("useRecsContext must be used within a RecsContext.Provider");
  return ctx;
}
