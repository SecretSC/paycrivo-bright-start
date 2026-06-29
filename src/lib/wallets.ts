export type SavedWallet = {
  id: string;
  userId: string;
  nickname: string;
  coin: string;
  network: string;
  address: string;
  isDefault: boolean;
  createdAt: string;
};

const KEY = "paycrivo_wallets";

function readAll(): SavedWallet[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as SavedWallet[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function writeAll(list: SavedWallet[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

// One-time migration: legacy wallets without a userId get assigned to the
// current user so existing data isn't lost.
function migrateLegacy(userId: string) {
  const all = readAll();
  let changed = false;
  const next = all.map((w) => {
    if (!w.userId) {
      changed = true;
      return { ...w, userId, createdAt: w.createdAt ?? new Date().toISOString() };
    }
    return w;
  });
  if (changed) writeAll(next);
}

export function loadWallets(userId?: string): SavedWallet[] {
  if (!userId) return [];
  migrateLegacy(userId);
  return readAll().filter((w) => w.userId === userId);
}

export function addWallet(
  userId: string,
  w: Omit<SavedWallet, "id" | "isDefault" | "userId" | "createdAt">,
): SavedWallet[] {
  const all = readAll();
  const mine = all.filter((x) => x.userId === userId);
  const wallet: SavedWallet = {
    ...w,
    id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    isDefault: mine.length === 0,
    createdAt: new Date().toISOString(),
  };
  writeAll([...all, wallet]);
  return loadWallets(userId);
}

export function deleteWallet(userId: string, id: string): SavedWallet[] {
  const all = readAll().filter((w) => !(w.id === id && w.userId === userId));
  let mine = all.filter((w) => w.userId === userId);
  if (mine.length && !mine.some((w) => w.isDefault)) {
    mine = mine.map((w, i) => ({ ...w, isDefault: i === 0 }));
    const others = all.filter((w) => w.userId !== userId);
    writeAll([...others, ...mine]);
  } else {
    writeAll(all);
  }
  return loadWallets(userId);
}

export function setDefaultWallet(userId: string, id: string): SavedWallet[] {
  writeAll(
    readAll().map((w) =>
      w.userId === userId ? { ...w, isDefault: w.id === id } : w,
    ),
  );
  return loadWallets(userId);
}
