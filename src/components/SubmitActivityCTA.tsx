import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import SubmitActivityModal from "./SubmitActivityModal";
import { cn } from "@/lib/utils";

interface SubmitActivityCTAProps {
  variant?: "default" | "inline" | "card";
  className?: string;
}

const SubmitActivityCTA = ({ variant = "default", className }: SubmitActivityCTAProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (variant === "card") {
    // Card-style CTA for bottom of activity list
    return (
      <>
        <div 
          className={cn(
            "border border-dashed border-border rounded-xl p-6 md:p-8 text-center bg-muted/30 hover:bg-muted/50 transition-colors",
            className
          )}
        >
          <div className="max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <PlusCircle className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              Znasz fajne miejsce dla dzieci?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Podziel się z innymi rodzicami! Dodaj miejsce, które warto odwiedzić.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setIsModalOpen(true)}
              className="gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Dodaj nowe miejsce
            </Button>
          </div>
        </div>
        <SubmitActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  if (variant === "inline") {
    // Inline link-style for subtle placement
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={cn(
            "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors",
            className
          )}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Dodaj nowe miejsce</span>
        </button>
        <SubmitActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  // Default button variant
  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsModalOpen(true)}
        className={cn("gap-2", className)}
      >
        <PlusCircle className="w-4 h-4" />
        Dodaj nowe miejsce
      </Button>
      <SubmitActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default SubmitActivityCTA;
