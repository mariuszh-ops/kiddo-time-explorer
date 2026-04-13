export const CATEGORY_COLORS: Record<string, string> = {
  "sala-zabaw":    "#E91E63",
  "plac-zabaw":    "#4CAF50",
  "sport":         "#2196F3",
  "zoo":           "#FF9800",
  "park-rozrywki": "#F44336",
  "muzeum-teatr":  "#9C27B0",
  "park":          "#2E7D32",
  "inne":          "#607D8B",
};

export function getCategoryColor(type: string): string {
  return CATEGORY_COLORS[type] || "#757575";
}
