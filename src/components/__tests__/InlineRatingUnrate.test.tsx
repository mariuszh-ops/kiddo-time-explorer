import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import InlineRatingAction from "@/components/InlineRatingAction";

// N-16: klik w już wybraną gwiazdkę ma usuwać ocenę (DELETE), a nie tylko ją nadpisywać.
const removeRating = vi.fn(async () => true);
const rateActivity = vi.fn(async () => {});
let userRating: number | null = 5;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isLoggedIn: true }),
}));
vi.mock("@/contexts/UserRatingsContext", () => ({
  useUserRatings: () => ({
    getUserRating: () => (userRating === null ? undefined : { activityId: 1, rating: userRating, ratedAt: new Date() }),
    rateActivity,
    removeRating,
    aggregateRefreshKey: 0,
  }),
}));
vi.mock("@/hooks/useActivityRating", () => ({
  useActivityRating: () => ({ avg: null, count: 0 }),
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (m: string) => toastSuccess(m) } }));

describe("InlineRatingAction — wycofanie oceny (N-16)", () => {
  beforeEach(() => {
    removeRating.mockClear();
    rateActivity.mockClear();
    toastSuccess.mockClear();
    userRating = 5;
  });

  it("klik w wybraną gwiazdkę usuwa ocenę i pokazuje toast", async () => {
    const { getByLabelText } = render(<InlineRatingAction activityId={1} onAuthRequired={() => {}} />);
    fireEvent.click(getByLabelText("Usuń swoją ocenę 5/5"));
    await waitFor(() => expect(removeRating).toHaveBeenCalledWith(1));
    expect(rateActivity).not.toHaveBeenCalled();
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Ocena usunięta"));
  });

  it("klik w inną gwiazdkę nadal zmienia ocenę, nie usuwa", async () => {
    const { getByLabelText } = render(<InlineRatingAction activityId={1} onAuthRequired={() => {}} />);
    fireEvent.click(getByLabelText(/Oceń 3 z 5 gwiazdek/));
    await waitFor(() => expect(rateActivity).toHaveBeenCalledWith(1, 3));
    expect(removeRating).not.toHaveBeenCalled();
  });

  it("bez własnej oceny każda gwiazdka ma etykietę oceniania", () => {
    userRating = null;
    const { getByLabelText, queryByLabelText } = render(
      <InlineRatingAction activityId={1} onAuthRequired={() => {}} />,
    );
    expect(getByLabelText(/Oceń 5 z 5 gwiazdek/)).toBeTruthy();
    expect(queryByLabelText(/Usuń swoją ocenę/)).toBeNull();
  });
});
