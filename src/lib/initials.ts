/**
 * Inicjały do awatara. Zasady jak w Google/Slack:
 * - „Imię Nazwisko" → „IN" (pierwszy i ostatni wyraz),
 * - jednowyrazowa nazwa → JEDNA litera („Going" → „G", nie „GO"),
 * - brak nazwy → z części lokalnej e-maila: „mariusz.bodych@…" → „MB",
 *   „jan@…" → „J".
 */
export const getInitials = (u: { name?: string; email?: string } | null | undefined): string => {
  if (!u) return "";
  const name = u.name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  const local = (u.email ?? "").split("@")[0].trim();
  if (!local) return "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return local[0].toUpperCase();
};
