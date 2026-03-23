import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Activity, mockActivities } from "@/data/activities";

export interface UserRating {
  activityId: number;
  rating: number; // 1-5 stars
  review?: string; // Optional review text
  ratedAt: Date;
}

interface UserRatingsContextType {
  // Get user's rating for an activity
  getUserRating: (activityId: number) => UserRating | undefined;
  // Check if user has rated an activity
  hasRated: (activityId: number) => boolean;
  // Add or update a rating
  rateActivity: (activityId: number, rating: number, review?: string) => Promise<void>;
  // Update just the review
  updateReview: (activityId: number, review: string) => Promise<void>;
  // Get all rated activities with full activity data
  visitedActivities: (Activity & { userRating: UserRating })[];
  // Count of visited/rated activities
  visitedCount: number;
}

const UserRatingsContext = createContext<UserRatingsContextType | undefined>(undefined);

export function UserRatingsProvider({ children }: { children: ReactNode }) {
  // Initialize with some mock data for demo purposes
  const [ratings, setRatings] = useState<Map<number, UserRating>>(new Map());

  const getUserRating = useCallback((activityId: number): UserRating | undefined => {
    return ratings.get(activityId);
  }, [ratings]);

  const hasRated = useCallback((activityId: number): boolean => {
    return ratings.has(activityId);
  }, [ratings]);

  const rateActivity = useCallback(async (activityId: number, rating: number, review?: string): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setRatings(prev => {
      const newMap = new Map(prev);
      newMap.set(activityId, {
        activityId,
        rating,
        review: review?.trim() || undefined,
        ratedAt: new Date(),
      });
      return newMap;
    });
  }, []);

  const updateReview = useCallback(async (activityId: number, review: string): Promise<void> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setRatings(prev => {
      const existing = prev.get(activityId);
      if (!existing) return prev;
      
      const newMap = new Map(prev);
      newMap.set(activityId, {
        ...existing,
        review: review.trim() || undefined,
      });
      return newMap;
    });
  }, []);

  // Get all visited activities with their ratings
  const visitedActivities = mockActivities
    .filter(activity => ratings.has(activity.id))
    .map(activity => ({
      ...activity,
      userRating: ratings.get(activity.id)!,
    }))
    .sort((a, b) => b.userRating.ratedAt.getTime() - a.userRating.ratedAt.getTime());

  return (
    <UserRatingsContext.Provider
      value={{
        getUserRating,
        hasRated,
        rateActivity,
        updateReview,
        visitedActivities,
        visitedCount: ratings.size,
      }}
    >
      {children}
    </UserRatingsContext.Provider>
  );
}

export function useUserRatings() {
  const context = useContext(UserRatingsContext);
  if (context === undefined) {
    throw new Error("useUserRatings must be used within a UserRatingsProvider");
  }
  return context;
}
