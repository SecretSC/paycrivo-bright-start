// OTP send/verify. Resolution order (per requirements):
//   1. If VITE_API_BASE_URL is set -> {BASE}/api/email/send-code (standalone backend)
//   2. Else -> relative /api/email/send-code (in-app TanStack server route)
//   3. Mock simulator ONLY if both are unreachable (network failure)
// The in-app route exists in this build, so step 2 always applies in preview/
// production and real Mailjet emails are sent. Mock is a true last resort.
import { apiFetch, isBackendConfigured, ApiError } from "./client";
import type { OtpPurpose, SendCodeResponse, VerifyCodeResponse } from "@/lib/email-otp";

const isDev = import.meta.env.DEV;
function devLog(...args: unknown[]) {
  // Dev-only diagnostics. Never logs OTP codes.
  if (isDev) console.info("[OTP]", ...args);
}

/** POST to the in-app relative server route (no backend base URL configured). */
async function relativeFetch<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError(e instanceof Error ? e.message : "Network error", { isNetwork: true });
  }
  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "error" in data && typeof (data as Record<string, unknown>).error === "string"
        ? (data as Record<string, string>).error
        : `Request failed (${res.status})`;
    throw new ApiError(msg, { status: res.status, payload: data });
  }
  return data as T;
}

/** Send via configured backend, then in-app route. Throws ApiError on failure. */
async function postEmail<T>(path: string, body: unknown): Promise<T> {
  if (isBackendConfigured()) {
    devLog("route used: backend", path);
    return apiFetch<T>(path, { method: "POST", body });
  }
  devLog("route used: in-app", path);
  return relativeFetch<T>(path, body);
}

// Preview-only simulator: deterministic but local-only codes. Used ONLY when
// neither the configured backend nor the in-app route is reachable.
const PREVIEW_KEY = "paycrivo_preview_otp";
function previewCodes(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(PREVIEW_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function setPreviewCode(k: string, code: string) {
  try {
    const all = previewCodes();
    all[k] = code;
    sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export async function sendOtp(email: string, purpose: OtpPurpose): Promise<SendCodeResponse> {
  const key = `${email.toLowerCase()}::${purpose}`;
  const mock = (): SendCodeResponse => {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setPreviewCode(key, code);
    return { success: true, cooldown: 60, devCode: code };
  };
  devLog("send request started", { purpose });
  try {
    const r = await postEmail<SendCodeResponse>("/api/email/send-code", { email, purpose });
    devLog("send status: success");
    return r;
  } catch (e) {
    if (e instanceof ApiError && e.isNetwork) {
      devLog("send status: network failure -> mock fallback");
      return mock();
    }
    if (e instanceof ApiError && e.payload) {
      devLog("send status: api error");
      return e.payload as SendCodeResponse;
    }
    devLog("send status: error");
    return { success: false, error: e instanceof Error ? e.message : "Failed to send code." };
  }
}

export async function verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<VerifyCodeResponse> {
  const key = `${email.toLowerCase()}::${purpose}`;
  const mock = (): VerifyCodeResponse => {
    const expected = previewCodes()[key];
    if (!expected) return { success: false, error: "No active code. Request a new one." };
    if (expected !== code) return { success: false, error: "Incorrect code." };
    return { success: true };
  };
  devLog("verify request started", { purpose });
  try {
    const r = await postEmail<VerifyCodeResponse>("/api/email/verify-code", { email, purpose, code });
    devLog("verify status: success");
    return r;
  } catch (e) {
    if (e instanceof ApiError && e.isNetwork) {
      devLog("verify status: network failure -> mock fallback");
      return mock();
    }
    if (e instanceof ApiError && e.payload) {
      devLog("verify status: api error");
      return e.payload as VerifyCodeResponse;
    }
    devLog("verify status: error");
    return { success: false, error: e instanceof Error ? e.message : "Verification failed." };
  }
}
