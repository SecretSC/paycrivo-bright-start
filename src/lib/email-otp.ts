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

export async function sendCode(email: string, purpose: OtpPurpose): Promise<SendCodeResponse> {
  try {
    const res = await fetch("/api/email/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose }),
    });
    return (await res.json()) as SendCodeResponse;
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}

export async function verifyCode(
  email: string,
  purpose: OtpPurpose,
  code: string,
): Promise<VerifyCodeResponse> {
  try {
    const res = await fetch("/api/email/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose, code }),
    });
    return (await res.json()) as VerifyCodeResponse;
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}