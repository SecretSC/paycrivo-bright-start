export type SavedWallet = {
  id: string;
  nickname: string;
  coin: string;
  network: string;
  address: string;
  isDefault: boolean;
};

const KEY = "paycrivo_wallets";

export function loadWallets(): SavedWallet[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as SavedWallet[];
  } catch {
    return [];
  }
}

function save(list: SavedWallet[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function addWallet(w: Omit<SavedWallet, "id" | "isDefault">): SavedWallet[] {
  const list = loadWallets();
  const wallet: SavedWallet = { ...w, id: `w_${Date.now()}`, isDefault: list.length === 0 };
  save([...list, wallet]);
  return loadWallets();
}

export function deleteWallet(id: string): SavedWallet[] {
  let list = loadWallets().filter((w) => w.id !== id);
  if (list.length && !list.some((w) => w.isDefault)) list = list.map((w, i) => ({ ...w, isDefault: i === 0 }));
  save(list);
  return loadWallets();
}

export function setDefaultWallet(id: string): SavedWallet[] {
  save(loadWallets().map((w) => ({ ...w, isDefault: w.id === id })));
  return loadWallets();
}