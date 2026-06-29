import { Link } from "@tanstack/react-router";
import { ArrowRight, Gift } from "lucide-react";

export function RewardBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div
        className="overflow-hidden rounded-3xl border border-primary/30 p-6 shadow-elegant sm:p-9"
        style={{ backgroundImage: "linear-gradient(135deg, #1a0f33, #2b1259 55%, #120a24)" }}
      >
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-white">
              <Gift className="size-7" />
            </span>
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
                <span className="grid size-5 place-items-center rounded-full bg-white text-[10px] font-extrabold text-[#2b1259]">$20</span>
                Welcome reward
              </div>
              <h3 className="font-display text-xl font-bold text-white sm:text-2xl">
                Create your PayCrivo account and claim a $20 welcome reward
              </h3>
              <p className="mt-1.5 max-w-xl text-sm text-white/70">
                New verified email accounts can claim a one-time PayCrivo reward to their own wallet.
              </p>
              <p className="mt-2 text-xs text-white/50">Reward availability may vary. One reward per customer.</p>
            </div>
          </div>
          <Link
            to="/signup"
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-[#2b1259] transition-transform hover:-translate-y-0.5"
          >
            Create account <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
