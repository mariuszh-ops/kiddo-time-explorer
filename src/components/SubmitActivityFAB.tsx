import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { FEATURES } from "@/lib/featureFlags";
import SubmitActivityModal from "./SubmitActivityModal";

const SubmitActivityFAB = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();

  // Only show on: home, city pages, map view
  const path = location.pathname;
  const isHome = path === "/";
  const isMapView = isHome && location.search.includes("view=map");
  const isCityPage = path.match(/^\/atrakcje\/([^/]+)$/) && 
    FEATURES.ENABLED_CITIES.includes(path.split("/")[2]);
  const isCityCategoryPage = path.match(/^\/atrakcje\/[^/]+\/[^/]+/) &&
    FEATURES.ENABLED_CITIES.includes(path.split("/")[2]);

  // Hide on map view entirely, and hide on non-allowed pages
  if (isMapView) return null;
  if (!isHome && !isCityPage && !isCityCategoryPage) return null;

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed right-6 z-50 group flex items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.2)] active:scale-95 transition-all duration-200 bottom-20 md:bottom-6 h-14 w-14 md:hover:w-[180px] md:hover:rounded-full overflow-hidden"
        aria-label="Dodaj nowe miejsce"
      >
        <Plus className="w-6 h-6 shrink-0" strokeWidth={2.5} />
        <span className="max-w-0 md:group-hover:max-w-[120px] overflow-hidden whitespace-nowrap text-sm font-medium transition-all duration-200 md:group-hover:ml-2">
          Dodaj miejsce
        </span>
      </button>
      <SubmitActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default SubmitActivityFAB;
