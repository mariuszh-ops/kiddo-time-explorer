export const CATEGORY_COLORS: Record<string, string> = {
  "sala-zabaw":    "#4CAF50",
  "plac-zabaw":    "#2E7D32",
  "sport":         "#1E88E5",
  "zoo":           "#F9A825",
  "park-rozrywki": "#FF7043",
  "muzeum-teatr":  "#8E24AA",
  "park":          "#00897B",
  "inne":          "#757575",
};

export function getCategoryColor(type: string): string {
  return CATEGORY_COLORS[type] || "#757575";
}
