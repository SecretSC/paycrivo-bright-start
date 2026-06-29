import { Sparkles } from "lucide-react";

export function PromoBar() {
  return (
    <div className="bg-gradient-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium sm:text-sm">
        <Sparkles className="size-4 shrink-0" />
        <span>
          First purchase: <strong className="font-bold">0% PayCrivo fee</strong> + lowest
          end-to-end cost.
        </span>
      </div>
    </div>
  );
}