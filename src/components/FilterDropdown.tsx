import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selectedValue?: string;
  hasAnyFilter: boolean; // Whether any filter is currently active
  onSelect: (value: string | undefined) => void;
}

const FilterDropdown = ({
  label,
  options,
  selectedValue,
  hasAnyFilter,
  onSelect,
}: FilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, openUpward: false });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === selectedValue);
  const displayLabel = selectedOption?.label || label;

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 250; // Estimated max height
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // Open upward if not enough space below and more space above
    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    
    setDropdownPosition({
      // Use viewport-relative positions for fixed positioning
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

  const dropdownMenu = isOpen ? (
    <div
      ref={dropdownRef}
      className={cn(
        "fixed min-w-[180px] bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200",
        dropdownPosition.openUpward && "origin-bottom"
      )}
      style={{
        top: dropdownPosition.openUpward ? "auto" : `${dropdownPosition.top}px`,
        bottom: dropdownPosition.openUpward ? `${window.innerHeight - dropdownPosition.top + 8}px` : "auto",
        left: `${dropdownPosition.left}px`,
        zIndex: 9999,
      }}
    >
      <div className="py-1 max-h-[300px] overflow-y-auto">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              onSelect(option.value);
              setIsOpen(false);
            }}
            className={cn(
              "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
              option.value === selectedValue
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted"
            )}
          >
            <span>{option.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">({option.count})</span>
              {option.value === selectedValue && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
          "border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          selectedValue
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent"
        )}
      >
        <span className="max-w-[120px] truncate">{displayLabel}</span>
        {/* Only show count when no filters are active (global count) */}
        {!hasAnyFilter && !selectedValue && (
          <span className="text-xs text-muted-foreground">
            ({options.reduce((sum, o) => Math.max(sum, o.count), 0)})
          </span>
        )}
        {selectedValue ? (
          <X
            className="w-3.5 h-3.5 ml-0.5 hover:scale-110 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(undefined);
              setIsOpen(false);
            }}
          />
        ) : (
          <ChevronDown className={cn(
            "w-3.5 h-3.5 transition-transform",
            isOpen && "rotate-180"
          )} />
        )}
      </button>
      
      {/* Render dropdown in portal to avoid clipping by parent containers */}
      {createPortal(dropdownMenu, document.body)}
    </>
  );
};

export default FilterDropdown;
