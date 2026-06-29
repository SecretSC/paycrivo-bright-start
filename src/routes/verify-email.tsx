import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageChrome } from "@/components/paycrivo/PageChrome";
import { OtpVerify } from "@/components/auth/OtpVerify";
import { useAuth } from "@/lib/auth";
import type { OtpPurpose } from "@/lib/email-otp";

type Search = { email: string; purpose: OtpPurpose };

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    email: String(s.email ?? ""),
    purpose: (String(s.purpose ?? "signup") as OtpPurpose),
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { email, purpose } = Route.useSearch();
  const navigate = useNavigate();
  const { markVerified } = useAuth();

  return (
    <PageChrome promo={false}>
      <main className="mx-auto flex max-w-md flex-col px-4 py-16">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant sm:p-8">
          <OtpVerify
            email={email}
            purpose={purpose}
            onVerified={() => {
              markVerified(email);
              navigate({ to: "/dashboard" });
            }}
          />
        </div>
      </main>
    </PageChrome>
  );
}