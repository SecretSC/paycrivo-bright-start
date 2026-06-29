import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Prototype account store backed by localStorage. No real secrets, no SMTP here.
// Passwords are stored hashed (prototype hash) — never plain text.
export type AccountStatus = "active" | "deactivated";

export type Account = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  country: string;
  phone: string;
  verified: boolean;
  preferredFiat: string;
  language: string;
  notifyOrders?: boolean;
  notifySecurity?: boolean;
  notifyRewards?: boolean;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = Omit<Account, "passwordHash">;

const USERS_KEY = "paycrivo_users";
const SESSION_KEY = "paycrivo_session";
const LAST_LOGIN_KEY = "paycrivo_last_login";

// Prototype, non-reversible-ish hash. NOT secure — for local prototype only.
function hashPassword(pw: string): string {
  const s = "paycrivo::v1::" + pw;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `pcv1$${(h >>> 0).toString(16)}$${s.length.toString(16)}`;
}
function verifyPassword(pw: string, hash: string): boolean {
  return hashPassword(pw) === hash;
}

function migrate(raw: unknown): Account[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((u: Record<string, unknown>) => {
    const password = u.password as string | undefined;
    return {
      id: (u.id as string) ?? `usr_${Math.random().toString(36).slice(2, 10)}`,
      email: String(u.email ?? "").trim().toLowerCase(),
      passwordHash: (u.passwordHash as string) ?? (password ? hashPassword(password) : ""),
      firstName: (u.firstName as string) ?? "",
      lastName: (u.lastName as string) ?? "",
      country: (u.country as string) ?? "",
      phone: (u.phone as string) ?? "",
      verified: Boolean(u.verified),
      preferredFiat: (u.preferredFiat as string) ?? "USD",
      language: (u.language as string) ?? "English",
      notifyOrders: u.notifyOrders === undefined ? true : Boolean(u.notifyOrders),
      notifySecurity: u.notifySecurity === undefined ? true : Boolean(u.notifySecurity),
      notifyRewards: u.notifyRewards === undefined ? true : Boolean(u.notifyRewards),
      status: (u.status as AccountStatus) ?? "active",
      createdAt: (u.createdAt as string) ?? new Date().toISOString(),
      updatedAt: (u.updatedAt as string) ?? (u.createdAt as string) ?? new Date().toISOString(),
    };
  });
}

function readUsers(): Account[] {
  try {
    return migrate(JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]"));
  } catch {
    return [];
  }
}
function writeUsers(users: Account[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function toPublic(a: Account): PublicUser {
  const { passwordHash: _pw, ...rest } = a;
  return rest;
}

// Link any guest orders (buy + exchange) that used this email to the user id.
export function linkGuestOrders(email: string, userId: string) {
  const e = email.trim().toLowerCase();
  for (const key of ["paycrivo-orders", "paycrivo_exchange_orders"]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const list = JSON.parse(raw) as Array<Record<string, unknown>>;
      let changed = false;
      const next = list.map((o) => {
        if (String(o.email ?? "").trim().toLowerCase() === e && o.userId !== userId) {
          changed = true;
          return { ...o, userId };
        }
        return o;
      });
      if (changed) localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
}

type SignupInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  country: string;
  phone: string;
  preferredFiat?: string;
  language?: string;
};

type AuthContextValue = {
  user: PublicUser | null;
  ready: boolean;
  isAuthenticated: boolean;
  lastLogin: string | null;
  registerAccount: (input: SignupInput) => { ok: boolean; error?: string };
  markVerified: (email: string) => void;
  login: (email: string, password: string) => { ok: boolean; error?: string; needsVerify?: boolean };
  logout: () => void;
  updateProfile: (patch: Partial<PublicUser>) => void;
  updateEmail: (newEmail: string) => { ok: boolean; error?: string };
  changePassword: (current: string, next: string) => { ok: boolean; error?: string };
  resetPassword: (email: string, next: string) => { ok: boolean; error?: string };
  accountExists: (email: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);
  const [lastLogin, setLastLogin] = useState<string | null>(null);

  useEffect(() => {
    try {
      const id = localStorage.getItem(SESSION_KEY);
      if (id) {
        const found = readUsers().find((u) => u.id === id || u.email === id);
        if (found) setUser(toPublic(found));
      }
      setLastLogin(localStorage.getItem(LAST_LOGIN_KEY));
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
    const now = new Date().toISOString();
    const account: Account = {
      id: `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      email,
      passwordHash: hashPassword(input.password),
      firstName: input.firstName,
      lastName: input.lastName,
      country: input.country,
      phone: input.phone,
      verified: false,
      preferredFiat: input.preferredFiat ?? "USD",
      language: input.language ?? "English",
      notifyOrders: true,
      notifySecurity: true,
      notifyRewards: true,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    writeUsers([...users, account]);
    return { ok: true };
  }, []);

  const markVerified = useCallback((email: string) => {
    const e = email.trim().toLowerCase();
    const users = readUsers().map((u) => (u.email === e ? { ...u, verified: true } : u));
    writeUsers(users);
    const found = users.find((u) => u.email === e);
    if (found) {
      linkGuestOrders(e, found.id); // link prior guest orders after verification
      localStorage.setItem(SESSION_KEY, found.id);
      const now = new Date().toISOString();
      localStorage.setItem(LAST_LOGIN_KEY, now);
      setLastLogin(now);
      setUser(toPublic(found));
    }
  }, []);

  const login = useCallback((email: string, password: string) => {
    const e = email.trim().toLowerCase();
    const found = readUsers().find((u) => u.email === e);
    if (!found || !verifyPassword(password, found.passwordHash)) {
      return { ok: false, error: "Incorrect email or password." };
    }
    if (!found.verified) return { ok: false, error: "Email not verified.", needsVerify: true };
    localStorage.setItem(SESSION_KEY, found.id);
    const now = new Date().toISOString();
    localStorage.setItem(LAST_LOGIN_KEY, now);
    setLastLogin(now);
    linkGuestOrders(e, found.id);
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
      const now = new Date().toISOString();
      const safe = { ...patch };
      delete (safe as Record<string, unknown>).id;
      delete (safe as Record<string, unknown>).email;
      delete (safe as Record<string, unknown>).firstName;
      delete (safe as Record<string, unknown>).lastName;
      const users = readUsers().map((u) => (u.id === prev.id ? { ...u, ...safe, updatedAt: now } : u));
      writeUsers(users);
      return { ...prev, ...safe, updatedAt: now };
    });
  }, []);

  const updateEmail = useCallback((newEmail: string) => {
    const e = newEmail.trim().toLowerCase();
    if (!user) return { ok: false, error: "Not signed in." };
    const users = readUsers();
    if (users.some((u) => u.email === e && u.id !== user.id)) {
      return { ok: false, error: "That email is already in use." };
    }
    const now = new Date().toISOString();
    const next = users.map((u) => (u.id === user.id ? { ...u, email: e, verified: true, updatedAt: now } : u));
    writeUsers(next);
    linkGuestOrders(e, user.id);
    setUser({ ...user, email: e, updatedAt: now });
    return { ok: true };
  }, [user]);

  const changePassword = useCallback(
    (current: string, next: string) => {
      if (!user) return { ok: false, error: "Not signed in." };
      const users = readUsers();
      const found = users.find((u) => u.id === user.id);
      if (!found || !verifyPassword(current, found.passwordHash)) return { ok: false, error: "Current password is incorrect." };
      const now = new Date().toISOString();
      writeUsers(users.map((u) => (u.id === user.id ? { ...u, passwordHash: hashPassword(next), updatedAt: now } : u)));
      return { ok: true };
    },
    [user],
  );

  const resetPassword = useCallback((email: string, next: string) => {
    const e = email.trim().toLowerCase();
    const users = readUsers();
    if (!users.some((u) => u.email === e)) return { ok: false, error: "No account found." };
    const now = new Date().toISOString();
    writeUsers(users.map((u) => (u.email === e ? { ...u, passwordHash: hashPassword(next), verified: true, updatedAt: now } : u)));
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
      lastLogin,
      registerAccount,
      markVerified,
      login,
      logout,
      updateProfile,
      updateEmail,
      changePassword,
      resetPassword,
      accountExists,
    }),
    [user, ready, lastLogin, registerAccount, markVerified, login, logout, updateProfile, updateEmail, changePassword, resetPassword, accountExists],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
