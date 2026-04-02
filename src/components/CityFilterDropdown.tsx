import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface CityFilterDropdownProps {
  cityOptions: FilterOption[];
  selectedCity?: string;
  selectedDistance?: number;
  hasAnyFilter: boolean;
  filteredCount: number;
  onCitySelect: (value: string | undefined) => void;
  onDistanceChange: (value: number) => void;
}

const CityFilterDropdown = ({
  cityOptions,
  selectedCity,
  selectedDistance,
  hasAnyFilter,
  filteredCount,
  onCitySelect,
  onDistanceChange,
}: CityFilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, openUpward: false });
  const [localDistance, setLocalDistance] = useState(selectedDistance ?? 5);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCityOption = cityOptions.find((o) => o.value === selectedCity);
  
  // Sync local distance with prop when it changes externally
  useEffect(() => {
    if (selectedDistance !== undefined) {
      setLocalDistance(selectedDistance);
    }
  }, [selectedDistance]);

  // Build combined display label
  const getDisplayLabel = () => {
    if (!selectedCityOption) return "Miasto";
    if (selectedDistance !== undefined && selectedDistance > 0) {
      return `${selectedCityOption.label} +${selectedDistance} km`;
    }
    return selectedCityOption.label;
  };

  const displayLabel = getDisplayLabel();
  const hasSelection = Boolean(selectedCity);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 420;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    
    setDropdownPosition({
      top: openUpward ? rect.top : rect.bottom + 8,
      left: rect.left,
      openUpward,
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && 
        !buttonRef.current.contains(target) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Handle clearing both city and distance
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCitySelect(undefined);
    setIsOpen(false);
  };

  const handleSliderChange = (values: number[]) => {
    const newValue = values[0];
    setLocalDistance(newValue);
    onDistanceChange(newValue);
  };

  const dropdownMenu = isOpen ? (
    <div
      ref={dropdownRef}
      className={cn(
        "fixed min-w-[280px] bg-[var(--color-bg-surface)] border border-[var(--color-border-soft)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200",
        dropdownPosition.openUpward && "origin-bottom"
      )}
      style={{
        top: dropdownPosition.openUpward ? "auto" : `${dropdownPosition.top}px`,
        bottom: dropdownPosition.openUpward ? `${window.innerHeight - dropdownPosition.top + 8}px` : "auto",
        left: `${dropdownPosition.left}px`,
        zIndex: 9999,
      }}
    >
      <div className="max-h-[420px] overflow-y-auto">
        {/* City section */}
        <div className="py-2">
          <div className="px-4 py-1.5 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
            Miasto
          </div>
          {cityOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onCitySelect(option.value);
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors duration-150",
                option.value === selectedCity
                  ? "bg-[var(--color-brand-primary-soft)] text-[var(--color-brand-primary)] font-semibold"
                  : "hover:bg-[var(--color-bg-surface-muted)]"
              )}
            >
              <span>{option.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-muted)]">({option.count})</span>
                {option.value === selectedCity && (
                  <Check className="w-4 h-4 text-[var(--color-brand-primary)]" />
                )}
              </div>
            </button>
          ))}
        </div>
        
        {/* Distance slider - only when city is selected */}
        {selectedCity && (
          <>
            <div className="border-t border-[var(--color-border-soft)]" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
                  <MapPin className="w-3 h-3" />
                  Atrakcje w pobliżu
                </div>
                <span className="text-sm font-semibold text-[var(--color-brand-primary)]">
                  {localDistance} km
                </span>
              </div>
              
              <Slider
                value={[localDistance]}
                onValueChange={handleSliderChange}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              
              <div className="flex justify-between mt-2 text-xs text-[var(--color-text-muted)]">
                <span>0 km</span>
                <span>100 km</span>
              </div>
              
              {/* Results preview */}
              <div className="mt-4 pt-3 border-t border-[var(--color-border-soft)] text-center">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  <span className="font-medium text-[var(--color-text-primary)]">{filteredCount}</span> atrakcji
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] text-sm font-medium transition-all duration-200 whitespace-nowrap",
          "px-[var(--space-4)] py-[var(--space-2)]",
          "border focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary-soft)] focus:ring-offset-1",
          hasSelection
            ? "bg-[var(--color-brand-primary-soft)] text-[var(--color-brand-primary)] border-[var(--color-brand-primary-soft)] font-semibold"
            : "bg-[var(--color-bg-surface-soft)] text-[var(--color-text-secondary)] border-[var(--color-border-soft)] hover:bg-[var(--color-bg-surface-muted)]"
        )}
      >
        <span className="max-w-[160px] truncate">{displayLabel}</span>
        {hasSelection ? (
          <X
            className="w-3.5 h-3.5 ml-0.5 hover:scale-110 transition-transform"
            onClick={handleClear}
          />
        ) : (
          <ChevronDown className={cn(
            "w-3.5 h-3.5 transition-transform",
            isOpen && "rotate-180"
          )} />
        )}
      </button>
      
      {createPortal(dropdownMenu, document.body)}
    </>
  );
};

export default CityFilterDropdown;
