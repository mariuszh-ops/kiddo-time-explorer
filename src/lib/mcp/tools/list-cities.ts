import { defineTool } from "@lovable.dev/mcp-js";
import { fetchActivities } from "../data";

export default defineTool({
  name: "list_cities",
  title: "List FamilyFun cities",
  description: "List Polish cities covered by FamilyFun with activity counts.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const all = await fetchActivities();
    const counts: Record<string, number> = {};
    for (const a of all) counts[a.city] = (counts[a.city] ?? 0) + 1;
    const cities = Object.entries(counts)
      .map(([slug, count]) => ({ slug, count }))
      .sort((a, b) => b.count - a.count);
    return {
      content: [{ type: "text", text: JSON.stringify({ cities }, null, 2) }],
      structuredContent: { cities },
    };
  },
});