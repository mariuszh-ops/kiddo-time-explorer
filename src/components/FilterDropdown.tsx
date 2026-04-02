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
  disabled?: boolean;
}

const FilterDropdown = ({
  label,
  options,
  selectedValue,
  hasAnyFilter,
  onSelect,
  disabled = false,
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
        "fixed min-w-[180px] bg-[var(--color-bg-surface)] border border-[var(--color-border-soft)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200",
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
              "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors duration-150",
              option.value === selectedValue
                ? "bg-[var(--color-brand-primary-soft)] text-[var(--color-brand-primary)] font-semibold"
                : "hover:bg-[var(--color-bg-surface-muted)]"
            )}
          >
            <span>{option.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">({option.count})</span>
              {option.value === selectedValue && (
                <Check className="w-4 h-4 text-[var(--color-brand-primary)]" />
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
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] text-sm font-medium transition-all duration-200 whitespace-nowrap",
          "px-[var(--space-4)] py-[var(--space-2)]",
          "border focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary-soft)] focus:ring-offset-1",
          disabled
            ? "bg-[var(--color-bg-surface-muted)] text-[var(--color-text-muted)] border-[var(--color-border-soft)] cursor-not-allowed opacity-60"
            : selectedValue
              ? "bg-[var(--color-brand-primary-soft)] text-[var(--color-brand-primary)] border-[var(--color-brand-primary-soft)] font-semibold"
              : "bg-[var(--color-bg-surface-soft)] text-[var(--color-text-secondary)] border-[var(--color-border-soft)] hover:bg-[var(--color-bg-surface-muted)]"
        )}
      >
        <span className="max-w-[120px] truncate">{displayLabel}</span>
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
