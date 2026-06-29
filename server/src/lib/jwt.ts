import jwt from "jsonwebtoken";
import { env } from "./env.js";
import type { AdminRole } from "@prisma/client";

export type CustomerToken = { sub: string; email: string; kind: "customer" };
export type AdminToken = { sub: string; email: string; role: AdminRole; kind: "admin" };

export function signCustomer(payload: Omit<CustomerToken, "kind">): string {
  return jwt.sign({ ...payload, kind: "customer" }, env.jwtCustomerSecret, {
    expiresIn: env.jwtCustomerTtl,
  } as jwt.SignOptions);
}

export function signAdmin(payload: Omit<AdminToken, "kind">): string {
  return jwt.sign({ ...payload, kind: "admin" }, env.jwtAdminSecret, {
    expiresIn: env.jwtAdminTtl,
  } as jwt.SignOptions);
}

export function verifyCustomer(token: string): CustomerToken | null {
  try {
    return jwt.verify(token, env.jwtCustomerSecret) as CustomerToken;
  } catch {
    return null;
  }
}

export function verifyAdmin(token: string): AdminToken | null {
  try {
    return jwt.verify(token, env.jwtAdminSecret) as AdminToken;
  } catch {
    return null;
  }
}