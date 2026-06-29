// Client helpers for the server-side email verification endpoints.
export type SendCodeResponse = {
  success: boolean;
  error?: string;
  cooldown?: number;
  cooldownRemaining?: number;
  blocked?: boolean;
  devCode?: string;
};

export type VerifyCodeResponse = {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
  expired?: boolean;
  blocked?: boolean;
};

export type OtpPurpose =
  | "signup"
  | "buy_checkout"
  | "exchange_checkout"
  | "forgot_password"
  | "login_security";

// Delegates to the backend API client (VITE_API_BASE_URL) with graceful
// preview fallback. Call-site signatures are unchanged.
import { sendOtp, verifyOtp } from "@/lib/api/otp";

export async function sendCode(email: string, purpose: OtpPurpose): Promise<SendCodeResponse> {
  return sendOtp(email, purpose);
}

export async function verifyCode(
  email: string,
  purpose: OtpPurpose,
  code: string,
): Promise<VerifyCodeResponse> {
  return verifyOtp(email, purpose, code);
}