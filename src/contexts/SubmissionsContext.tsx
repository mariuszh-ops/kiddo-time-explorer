import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";

export interface ActivitySubmission {
  id: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  title: string;
  city: string;
  address: string;
  type: string;
  isEvent: boolean;
  eventDate?: string;
  ageMin: number;
  ageMax: number;
  isIndoor: boolean;
  priceLevel?: number;
  priceNote?: string;
  description: string;
  website: string;
  amenities: string[];
}

interface SubmissionsContextType {
  submissions: ActivitySubmission[];
  addSubmission: (sub: Omit<ActivitySubmission, "id" | "submittedAt" | "status">) => void;
  updateSubmission: (id: string, updates: Partial<ActivitySubmission>) => void;
  removeSubmission: (id: string) => void;
  pendingCount: number;
}

const SubmissionsContext = createContext<SubmissionsContextType | undefined>(undefined);

export const SubmissionsProvider = ({ children }: { children: ReactNode }) => {
  const [submissions, setSubmissions] = useState<ActivitySubmission[]>(
    () => getItem<ActivitySubmission[]>(STORAGE_KEYS.SUBMISSIONS, [])
  );

  useEffect(() => {
    setItem(STORAGE_KEYS.SUBMISSIONS, submissions);
  }, [submissions]);

  const addSubmission = useCallback((sub: Omit<ActivitySubmission, "id" | "submittedAt" | "status">) => {
    const newSub: ActivitySubmission = {
      ...sub,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      status: "pending",
    };
    setSubmissions((prev) => [newSub, ...prev]);
  }, []);

  const updateSubmission = useCallback((id: string, updates: Partial<ActivitySubmission>) => {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const removeSubmission = useCallback((id: string) => {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  return (
    <SubmissionsContext.Provider value={{ submissions, addSubmission, updateSubmission, removeSubmission, pendingCount }}>
      {children}
    </SubmissionsContext.Provider>
  );
};

export const useSubmissions = () => {
  const ctx = useContext(SubmissionsContext);
  if (!ctx) throw new Error("useSubmissions must be used within SubmissionsProvider");
  return ctx;
};
