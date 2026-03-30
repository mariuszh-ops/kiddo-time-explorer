import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isPrerendering = () => {
  return typeof navigator !== "undefined" && navigator.userAgent.includes("ReactSnap");
};

