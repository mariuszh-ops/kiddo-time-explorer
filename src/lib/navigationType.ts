import { createContext, useContext } from "react";

/** Zgodne z NavigationType react-routera. */
export type RealNavigationType = "POP" | "PUSH" | "REPLACE";

/**
 * `<Routes location={…}>` — wymagane przez AnimatePresence — montuje własny
 * LocationContext, w którym react-router 6 ZAHARDKODOWAŁ `navigationType`
 * na "POP" (`useRoutes`: `navigationType: Action.Pop`). Skutek: każde
 * `useNavigationType()` wywołane WEWNĄTRZ tras zwraca "POP", także po kliknięciu
 * <Link>. Strażniki „to jest wstecz, nie resetuj scrolla" nigdy nie przepuszczały
 * nawigacji w przód (F-12: listing z kafla home startował w połowie listy).
 *
 * Prawdziwy typ czytamy NAD `<Routes>` (w AnimatedRoutes) i podajemy tędy.
 */
export const RealNavigationTypeContext = createContext<RealNavigationType>("POP");

export const useRealNavigationType = () => useContext(RealNavigationTypeContext);
