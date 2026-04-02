import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface MultiFilterDropdownProps {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  hasAnyFilter: boolean;
  onToggle: (value: string) => void;
  onClear: () => void;
}

const MultiFilterDropdown = ({
  label,
  options,
  selectedValues,
  hasAnyFilter,
  onToggle,
  onClear,
}: MultiFilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, openUpward: false });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasSelection = selectedValues.length > 0;

  const displayLabel = hasSelection
    ? selectedValues.length === 1
      ? options.find(o => o.value === selectedValues[0])?.label || label
      : `${options.find(o => o.value === selectedValues[0])?.label || label} +${selectedValues.length - 1}`
    : label;

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 250;
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
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
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
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <button
              key={option.value}
              onClick={() => onToggle(option.value)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
              )}
            >
              <span>{option.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">({option.count})</span>
                {isSelected && <Check className="w-4 h-4 text-primary" />}
              </div>
            </button>
          );
        })}
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
          hasSelection
            ? "bg-[#DCEEDB] text-[#2F6B4F] border-[#2F6B4F] font-semibold"
            : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent"
        )}
      >
        <span className="max-w-[140px] truncate">{displayLabel}</span>
        {hasSelection ? (
          <X
            className="w-3.5 h-3.5 ml-0.5 hover:scale-110 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              setIsOpen(false);
            }}
          />
        ) : (
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
        )}
      </button>
      {createPortal(dropdownMenu, document.body)}
    </>
  );
};

export default MultiFilterDropdown;
