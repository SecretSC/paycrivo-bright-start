import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Prototype account store backed by localStorage. No secrets, no SMTP here.
export type Account = {
  email: string;
  password: string; // prototype only — stored locally on the visitor's device
  firstName: string;
  lastName: string;
  country: string;
  phone: string;
  verified: boolean;
  preferredFiat: string;
  language: string;
  createdAt: string;
};

export type PublicUser = Omit<Account, "password">;

const USERS_KEY = "paycrivo_users";
const SESSION_KEY = "paycrivo_session";

function readUsers(): Account[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as Account[];
  } catch {
    return [];
  }
}
function writeUsers(users: Account[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function toPublic(a: Account): PublicUser {
  const { password: _pw, ...rest } = a;
  return rest;
}

type SignupInput = Omit<Account, "verified" | "createdAt" | "preferredFiat" | "language"> &
  Partial<Pick<Account, "preferredFiat" | "language">>;

type AuthContextValue = {
  user: PublicUser | null;
  ready: boolean;
  isAuthenticated: boolean;
  registerAccount: (input: SignupInput) => { ok: boolean; error?: string };
  markVerified: (email: string) => void;
  login: (email: string, password: string) => { ok: boolean; error?: string; needsVerify?: boolean };
  logout: () => void;
  updateProfile: (patch: Partial<PublicUser>) => void;
  changePassword: (current: string, next: string) => { ok: boolean; error?: string };
  resetPassword: (email: string, next: string) => { ok: boolean; error?: string };
  accountExists: (email: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const email = localStorage.getItem(SESSION_KEY);
      if (email) {
        const found = readUsers().find((u) => u.email === email);
        if (found) setUser(toPublic(found));
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const registerAccount = useCallback((input: SignupInput) => {
    const email = input.email.trim().toLowerCase();
    const users = readUsers();
    if (users.some((u) => u.email === email)) {
      return { ok: false, error: "An account with this email already exists." };
    }
    const account: Account = {
      ...input,
      email,
      verified: false,
      preferredFiat: input.preferredFiat ?? "USD",
      language: input.language ?? "English",
      createdAt: new Date().toISOString(),
    };
    writeUsers([...users, account]);
    return { ok: true };
  }, []);

  const markVerified = useCallback((email: string) => {
    const e = email.trim().toLowerCase();
    const users = readUsers().map((u) => (u.email === e ? { ...u, verified: true } : u));
    writeUsers(users);
    localStorage.setItem(SESSION_KEY, e);
    const found = users.find((u) => u.email === e);
    if (found) setUser(toPublic(found));
  }, []);

  const login = useCallback((email: string, password: string) => {
    const e = email.trim().toLowerCase();
    const found = readUsers().find((u) => u.email === e);
    if (!found || found.password !== password) {
      return { ok: false, error: "Incorrect email or password." };
    }
    if (!found.verified) return { ok: false, error: "Email not verified.", needsVerify: true };
    localStorage.setItem(SESSION_KEY, e);
    setUser(toPublic(found));
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const updateProfile = useCallback((patch: Partial<PublicUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const users = readUsers().map((u) => (u.email === prev.email ? { ...u, ...patch } : u));
      writeUsers(users);
      return { ...prev, ...patch };
    });
  }, []);

  const changePassword = useCallback(
    (current: string, next: string) => {
      if (!user) return { ok: false, error: "Not signed in." };
      const users = readUsers();
      const found = users.find((u) => u.email === user.email);
      if (!found || found.password !== current) return { ok: false, error: "Current password is incorrect." };
      writeUsers(users.map((u) => (u.email === user.email ? { ...u, password: next } : u)));
      return { ok: true };
    },
    [user],
  );

  const resetPassword = useCallback((email: string, next: string) => {
    const e = email.trim().toLowerCase();
    const users = readUsers();
    if (!users.some((u) => u.email === e)) return { ok: false, error: "No account found." };
    writeUsers(users.map((u) => (u.email === e ? { ...u, password: next, verified: true } : u)));
    return { ok: true };
  }, []);

  const accountExists = useCallback((email: string) => {
    const e = email.trim().toLowerCase();
    return readUsers().some((u) => u.email === e);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      isAuthenticated: !!user,
      registerAccount,
      markVerified,
      login,
      logout,
      updateProfile,
      changePassword,
      resetPassword,
      accountExists,
    }),
    [user, ready, registerAccount, markVerified, login, logout, updateProfile, changePassword, resetPassword, accountExists],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}