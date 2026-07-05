import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fetchActivities } from "../data";

export default defineTool({
  name: "get_activity",
  title: "Get FamilyFun activity details",
  description: "Fetch full details for one FamilyFun activity by its slug (e.g. 'warszawa-zoo-warszawskie').",
  inputSchema: {
    slug: z.string().trim().min(1).describe("Activity slug, e.g. 'warszawa-zoo-warszawskie'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => {
    const all = await fetchActivities();
    const a = all.find((x) => x.slug === slug);
    if (!a) {
      return {
        content: [{ type: "text", text: `No activity found with slug '${slug}'.` }],
        isError: true,
      };
    }
    const detail = {
      id: a.id,
      slug: a.slug,
      title: a.title,
      city: a.city,
      location: a.location,
      address: a.address,
      rating: a.rating,
      reviewCount: a.reviewCount,
      ageRange: a.ageRange,
      isIndoor: a.isIndoor,
      tags: a.tags,
      description: a.description,
      openingHours: a.openingHours,
      priceRange: a.priceRange,
      priceLevel: a.priceLevel,
      website: a.website,
      latitude: a.latitude,
      longitude: a.longitude,
      url: `https://familyfun.pl/atrakcje/${a.slug}`,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(detail, null, 2) }],
      structuredContent: detail,
    };
  },
});