import type { PaymentMethodIcon } from "@/data/paymentMethods";
import { Building2, CreditCard, Landmark } from "lucide-react";

export function PaymentBrandIcon({ icon, size = 36 }: { icon: PaymentMethodIcon; size?: number }) {
  const box = "grid shrink-0 place-items-center rounded-xl overflow-hidden";
  const s = { width: size, height: size };

  switch (icon) {
    case "apple":
      return (
        <span className={`${box} bg-black text-white`} style={s} aria-hidden>
          <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="currentColor">
            <path d="M16.36 12.78c.02 2.5 2.19 3.33 2.22 3.34-.02.06-.35 1.2-1.15 2.37-.69 1.02-1.41 2.03-2.54 2.05-1.11.02-1.47-.66-2.74-.66-1.27 0-1.67.64-2.72.68-1.09.04-1.92-1.1-2.62-2.11C5.39 16.4 4.3 12.6 5.77 10.05c.73-1.27 2.04-2.07 3.46-2.09 1.07-.02 2.08.72 2.74.72.65 0 1.88-.89 3.17-.76.54.02 2.06.22 3.03 1.65-.08.05-1.81 1.06-1.81 3.21M14.3 6.6c.58-.7.97-1.68.86-2.65-.84.03-1.85.56-2.45 1.26-.54.62-1.01 1.61-.88 2.56.93.07 1.89-.47 2.47-1.17"/>
          </svg>
        </span>
      );
    case "google":
      return (
        <span className={`${box} bg-white border border-border`} style={s} aria-hidden>
          <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62}>
            <path fill="#4285F4" d="M22.5 12.2c0-.7-.06-1.4-.18-2.06H12v3.9h5.9a5.05 5.05 0 0 1-2.19 3.32v2.75h3.54c2.07-1.91 3.25-4.72 3.25-7.91"/>
            <path fill="#34A853" d="M12 23c2.95 0 5.43-.98 7.24-2.65l-3.54-2.75c-.98.66-2.24 1.05-3.7 1.05-2.84 0-5.25-1.92-6.11-4.5H2.23v2.84A11 11 0 0 0 12 23"/>
            <path fill="#FBBC05" d="M5.89 14.15a6.6 6.6 0 0 1 0-4.3V7.01H2.23a11 11 0 0 0 0 9.98z"/>
            <path fill="#EA4335" d="M12 5.35c1.6 0 3.04.55 4.17 1.63l3.13-3.13C17.43 2.08 14.95 1 12 1A11 11 0 0 0 2.23 7.01l3.66 2.84C6.75 7.27 9.16 5.35 12 5.35"/>
          </svg>
        </span>
      );
    case "trustly":
      return (
        <span className={`${box} bg-[#0ee06e] text-black text-[9px] font-extrabold tracking-tight`} style={s} aria-hidden>
          Trustly
        </span>
      );
    case "mobilepay":
      return (
        <span className={`${box} bg-[#5a78ff] text-white`} style={s} aria-hidden>
          <svg viewBox="0 0 24 24" width={size * 0.52} height={size * 0.52} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
        </span>
      );
    case "pix":
      return (
        <span className={`${box} bg-[#32bcad] text-white text-[10px] font-extrabold`} style={s} aria-hidden>
          PIX
        </span>
      );
    case "sepa":
      return (
        <span className={`${box} bg-[#003399] text-[#ffcc00] text-[9px] font-extrabold tracking-tight`} style={s} aria-hidden>
          SEPA
        </span>
      );
    case "ach":
      return <span className={`${box} bg-accent text-primary`} style={s} aria-hidden><Landmark style={{ width: size * 0.5, height: size * 0.5 }} /></span>;
    case "wire":
      return <span className={`${box} bg-accent text-primary`} style={s} aria-hidden><Building2 style={{ width: size * 0.5, height: size * 0.5 }} /></span>;
    case "faster":
      return (
        <span className={`${box} bg-[#1d3a8a] text-white text-[8px] font-extrabold leading-tight text-center`} style={s} aria-hidden>
          FAST<br/>PAY
        </span>
      );
    case "bank":
      return <span className={`${box} bg-accent text-primary`} style={s} aria-hidden><Building2 style={{ width: size * 0.5, height: size * 0.5 }} /></span>;
    default:
      return (
        <span className={`${box} bg-gradient-to-br from-primary to-primary/70 text-primary-foreground`} style={s} aria-hidden>
          <CreditCard style={{ width: size * 0.5, height: size * 0.5 }} />
        </span>
      );
  }
}
