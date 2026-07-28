// Re-export the shared calculator. The backend uses the SAME formulas and
// catalog gates as the frontend so the browser cannot invent numbers.
//
// Note: relative path (not "@shared/...") because the backend has its own
// tsconfig and does not resolve the Vite alias.
export * from "../../../shared/calc.js";