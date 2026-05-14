import { createContext, useContext } from "react";

export const AnalysisContext = createContext(null);

export function useAnalysisContext() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysisContext must be used within an AnalysisContext.Provider");
  return ctx;
}
