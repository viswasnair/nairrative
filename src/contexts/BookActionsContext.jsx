import { createContext, useContext } from "react";

export const BookActionsContext = createContext(null);

export function useBookActions() {
  const ctx = useContext(BookActionsContext);
  if (!ctx) throw new Error("useBookActions must be used within a BookActionsContext.Provider");
  return ctx;
}
