// OTP send/verify wired to the backend (/api/email). Falls back to a local
// preview simulator when no backend is configured/reachable.
import { apiFetch, isBackendConfigured, ApiError } from "./client";
import type { OtpPurpose, SendCodeResponse, VerifyCodeResponse } from "@/lib/email-otp";

// Preview-only simulator: deterministic but local-only codes. Never used when a
// real backend is reachable.
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
  if (!isBackendConfigured()) return mock();
  try {
    return await apiFetch<SendCodeResponse>("/api/email/send-code", {
      method: "POST",
      body: { email, purpose },
    });
  } catch (e) {
    if (e instanceof ApiError && e.isNetwork) return mock();
    if (e instanceof ApiError && e.payload) return e.payload as SendCodeResponse;
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
  if (!isBackendConfigured()) return mock();
  try {
    return await apiFetch<VerifyCodeResponse>("/api/email/verify-code", {
      method: "POST",
      body: { email, purpose, code },
    });
  } catch (e) {
    if (e instanceof ApiError && e.isNetwork) return mock();
    if (e instanceof ApiError && e.payload) return e.payload as VerifyCodeResponse;
    return { success: false, error: e instanceof Error ? e.message : "Verification failed." };
  }
}
