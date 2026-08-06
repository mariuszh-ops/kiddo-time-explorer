import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchActivities from "./tools/search-activities";
import getActivity from "./tools/get-activity";
import listCities from "./tools/list-cities";

// Issuer musi wskazywać bezpośredni host Supabase (nie proxy .lovable.cloud).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "familyfun-mcp",
  title: "FamilyFun MCP",
  version: "0.1.0",
  instructions:
    "Tools for FamilyFun (familyfun.pl), a catalog of ~460 family-friendly activities in Poland — mainly the Warsaw area (city slug `warszawa`) and the Silesian agglomeration (`slask`), plus smaller nearby towns. Use `list_cities` to see coverage, `search_activities` to find places by city/tag/query, and `get_activity` to fetch details for a specific slug.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchActivities, getActivity, listCities],
});