import { Check, X } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/password";

export function PasswordChecklist({ value }: { value: string }) {
  if (!value) return null;
  return (
    <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value);
        return (
          <li
            key={r.key}
            className={`flex items-center gap-1.5 text-xs font-medium ${ok ? "text-success" : "text-muted-foreground"}`}
          >
            <span
              className={`grid size-4 shrink-0 place-items-center rounded-full ${ok ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"}`}
            >
              {ok ? <Check className="size-3" /> : <X className="size-3" />}
            </span>
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}