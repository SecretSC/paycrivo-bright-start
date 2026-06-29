// Shared password policy used by signup, reset password, and change password.
export type PwRule = { key: string; label: string; test: (v: string) => boolean };

export const PASSWORD_RULES: PwRule[] = [
  { key: "len", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { key: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { key: "number", label: "One number", test: (v) => /[0-9]/.test(v) },
  { key: "symbol", label: "One symbol (@, !, #, $, %, …)", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export function passwordIssues(v: string): string[] {
  return PASSWORD_RULES.filter((r) => !r.test(v)).map((r) => r.label);
}

export function isPasswordValid(v: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(v));
}

export const PASSWORD_ERROR =
  "Password must be 8+ characters with an uppercase letter, lowercase letter, number, and symbol.";
