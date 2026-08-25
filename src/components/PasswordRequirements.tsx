import { Check, Circle } from "lucide-react";
import { checkPassword, PASSWORD_RULES } from "@/lib/passwordPolicy";

/** Podgląd na żywo wymagań hasła (spełnione na zielono, niespełnione szare). */
const PasswordRequirements = ({ password }: { password: string }) => {
  const check = checkPassword(password);
  return (
    <ul className="mt-1 space-y-1 text-xs" aria-live="polite">
      {PASSWORD_RULES.map((rule) => {
        const met = check[rule.key];
        return (
          <li
            key={rule.key}
            className={met ? "flex items-center gap-1.5 text-primary" : "flex items-center gap-1.5 text-muted-foreground"}
          >
            {met ? (
              <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <Circle className="w-3 h-3 shrink-0" aria-hidden="true" />
            )}
            <span>{rule.label}</span>
            <span className="sr-only">{met ? " — spełnione" : " — niespełnione"}</span>
          </li>
        );
      })}
    </ul>
  );
};

export default PasswordRequirements;
