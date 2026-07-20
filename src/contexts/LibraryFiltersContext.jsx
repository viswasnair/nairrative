import { createContext, useContext } from "react";

export const LibraryFiltersContext = createContext(null);

export function useLibraryFiltersContext() {
  const ctx = useContext(LibraryFiltersContext);
  if (!ctx) throw new Error("useLibraryFiltersContext must be used within a LibraryFiltersContext.Provider");
  return ctx;
}
