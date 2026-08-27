import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageErrorPlaceholderProps {
  className?: string;
}

export default function ImageErrorPlaceholder({ className }: ImageErrorPlaceholderProps) {
  return (
    <div
      className={cn(
        "w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground",
        className
      )}
    >
      <Camera className="w-8 h-8 mb-1" aria-hidden="true" />
      <span className="text-xs">Brak zdjęcia</span>
    </div>
  );
}
