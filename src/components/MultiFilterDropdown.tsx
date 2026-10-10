import { useState, useEffect, useLayoutEffect, useCallback, useTransition } from "react";
import { useFilterListbox } from "@/hooks/useFilterListbox";
import { createPortal } from "react-dom";
import { ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCountPl } from "@/lib/plural";

interface FilterOption {
  value: string;
  label: string;
  /** null = licznik jeszcze nieznany (FMN-B07) — opcja bez liczby, nie "(0)". */
  count: number | null;
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, openUpward: false });

  // AF-5-065: klik opcji zapisuje filtr w adresie jako PRZEJŚCIE (startTransition).
  // Wcześniej klik synchronicznie renderował całą stronę główną (montaż 48 kart
  // z modalami, efekty) przed pierwszym malowaniem: INP ok. 400 ms przy CPU 4x.
  // Router oddaje nowy adres dopiero po commicie przejścia, więc do tego czasu
  // opcja i etykieta pokazują wybór OPTYMISTYCZNY — zmieniają się w klatce
  // kliknięcia. Po commicie (czekaNaAdres = false) prawdą znów jest
  // `selectedValues` z adresu, także gdy w międzyczasie adres zmieniło coś
  // innego („wstecz”, „wyczyść”): optymizm nie może rozjechać się z adresem
  // na stałe. Bezpiecznik zapisów adresu w tym oknie: useBazaZapisuAdresu.
  const [czekaNaAdres, startPrzejscia] = useTransition();
  const [optymistyczne, setOptymistyczne] = useState<string[] | null>(null);
  const wybrane = czekaNaAdres && optymistyczne ? optymistyczne : selectedValues;
  const przelacz = (value: string) => {
    setOptymistyczne(wybrane.includes(value) ? wybrane.filter((v) => v !== value) : [...wybrane, value]);
    startPrzejscia(() => onToggle(value));
  };

  const firstSelectedIndex = Math.max(options.findIndex((o) => wybrane.includes(o.value)), 0);
  const {
    listboxId, isOpen, open, close, activeIndex, setActiveIndex,
    buttonRef, listRef, setOptionRef, handleTriggerKeyDown, handleListKeyDown, triggerAria,
  } = useFilterListbox(options.length, firstSelectedIndex);
  const dropdownRef = listRef;

  const hasSelection = wybrane.length > 0;

  const displayLabel = hasSelection
    ? wybrane.length === 1
      ? options.find(o => o.value === wybrane[0])?.label || label
      : `${options.find(o => o.value === wybrane[0])?.label || label} +${wybrane.length - 1}`
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

  useLayoutEffect(() => {
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
        close(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, close]);

  const dropdownMenu = isOpen ? (
    <div
      ref={dropdownRef}
      id={listboxId}
      role="listbox"
      aria-label={label}
      aria-multiselectable
      tabIndex={-1}
      onKeyDown={handleListKeyDown}
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
        {options.map((option, index) => {
          const isSelected = wybrane.includes(option.value);
          return (
            <button
              key={option.value}
              ref={setOptionRef(index)}
              role="option"
              aria-selected={isSelected}
              tabIndex={index === activeIndex ? 0 : -1}
              onFocus={() => setActiveIndex(index)}
              onClick={() => przelacz(option.value)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
              )}
            >
              <span>{option.label}</span>
              <div className="flex items-center gap-2">
                {option.count != null && (
                  <span className="text-xs text-muted-foreground">({formatCountPl(option.count)})</span>
                )}
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
        onClick={() => (isOpen ? close(false) : open(firstSelectedIndex))}
        onKeyDown={handleTriggerKeyDown}
        {...triggerAria}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
          "border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          hasSelection
            ? "bg-primary/10 text-primary border-primary"
            : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-accent"
        )}
      >
        <span className="max-w-[280px] truncate">{displayLabel}</span>
        {hasSelection ? (
          <X
            className="w-3.5 h-3.5 ml-0.5 hover:scale-110 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              // „Wyczyść” idzie od razu (bez przejścia): optymizm nie może go przykryć.
              setOptymistyczne(null);
              onClear();
              close(false);
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
