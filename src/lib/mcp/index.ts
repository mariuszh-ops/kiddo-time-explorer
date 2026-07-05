import { defineMcp } from "@lovable.dev/mcp-js";
import searchActivities from "./tools/search-activities";
import getActivity from "./tools/get-activity";
import listCities from "./tools/list-cities";

export default defineMcp({
  name: "familyfun-mcp",
  title: "FamilyFun MCP",
  version: "0.1.0",
  instructions:
    "Tools for FamilyFun (familyfun.pl), a catalog of family-friendly activities in 5 Polish cities (Warszawa, Kraków, Wrocław, Poznań, Gdańsk). Use `list_cities` to see coverage, `search_activities` to find places by city/tag/query, and `get_activity` to fetch details for a specific slug.",
  tools: [searchActivities, getActivity, listCities],
});