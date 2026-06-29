import { customAlphabet } from "nanoid";

const upper = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);
const num = customAlphabet("0123456789", 6);

export function ticketNumber(): string {
  return `PCV-TKT-${new Date().getFullYear()}-${num()}`;
}

export function orderReference(type: "buy" | "exchange"): string {
  const p = type === "buy" ? "BUY" : "EXC";
  return `PCV-${p}-${upper()}`;
}