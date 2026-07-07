import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fetchActivities, type Activity } from "../data";

export default defineTool({
  name: "search_activities",
  title: "Search FamilyFun activities",
  description:
    "Search family activities from the FamilyFun catalog (Poland — mainly the Warsaw and Silesia regions). Filter by city/region, category/tag, indoor/outdoor, or a free-text query matched against title, location, tags and description.",
  inputSchema: {
    query: z.string().trim().optional().describe("Free-text query matched against title, location, tags, description."),
    city: z
      .enum(["warszawa", "slask"])
      .optional()
      .describe(
        "Region slug filter: 'warszawa' (Warsaw area) or 'slask' (Silesian agglomeration). Smaller towns appear under their own city values — use `list_cities` for full coverage and the free-text query to match them."
      ),
    indoor: z.boolean().optional().describe("If true, only indoor. If false, only outdoor."),
    tag: z.string().trim().optional().describe("Tag/category filter (case-insensitive contains)."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results, default 10."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, city, indoor, tag, limit }) => {
    const all = await fetchActivities();
    const q = query?.toLowerCase();
    const t = tag?.toLowerCase();
    const filtered = all.filter((a: Activity) => {
      if (city && a.city !== city) return false;
      if (indoor !== undefined && a.isIndoor !== indoor) return false;
      if (t && !(a.tags || []).some((x) => x.toLowerCase().includes(t))) return false;
      if (q) {
        const hay = [a.title, a.location, a.description ?? "", (a.tags || []).join(" ")]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const results = filtered
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, limit ?? 10)
      .map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        city: a.city,
        location: a.location,
        rating: a.rating,
        reviewCount: a.reviewCount,
        ageRange: a.ageRange,
        isIndoor: a.isIndoor,
        tags: a.tags,
        url: `https://familyfun.pl/atrakcje/${a.slug}`,
      }));
    return {
      content: [{ type: "text", text: JSON.stringify({ count: results.length, results }, null, 2) }],
      structuredContent: { count: results.length, results },
    };
  },
});