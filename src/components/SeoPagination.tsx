import { Link } from "react-router-dom";

interface SeoPaginationProps {
  /** Ścieżka listingu bez query, np. "/mazowieckie/muzea". */
  basePath: string;
  /** Aktualne parametry URL (bez modyfikacji — page nadpisujemy). */
  searchParams: URLSearchParams;
  /** Numer bieżącej strony (1-based). */
  currentPage: number;
  /** Łączna liczba stron. */
  totalPages: number;
}

/**
 * Prawdziwe linki paginacji (crawlable) renderowane od razu w HTML.
 * Wizualnie dyskretne, ale nigdy ukryte przez display/visibility.
 */
const SeoPagination = ({ basePath, searchParams, currentPage, totalPages }: SeoPaginationProps) => {
  if (totalPages <= 1) return null;

  const hrefFor = (page: number) => {
    const next = new URLSearchParams(searchParams);
    next.delete("page");
    if (page > 1) next.set("page", String(page));
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  // Okno numerów: pierwsza, ostatnia i ±2 wokół bieżącej.
  const numbers: number[] = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) numbers.push(i);
  }

  return (
    <nav aria-label="Paginacja wyników" className="mt-8 border-t border-border pt-4">
      <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
        {currentPage > 1 && (
          <li>
            <Link to={hrefFor(currentPage - 1)} rel="prev" className="hover:text-primary hover:underline">
              Poprzednia
            </Link>
          </li>
        )}
        {numbers.map((n, idx) => {
          const prev = numbers[idx - 1];
          return (
            <li key={n} className="flex items-center gap-3">
              {prev !== undefined && n - prev > 1 && <span aria-hidden="true">…</span>}
              {n === currentPage ? (
                <span aria-current="page" className="font-medium text-foreground">
                  {n}
                </span>
              ) : (
                <Link to={hrefFor(n)} className="hover:text-primary hover:underline">
                  {n}
                </Link>
              )}
            </li>
          );
        })}
        {currentPage < totalPages && (
          <li>
            <Link to={hrefFor(currentPage + 1)} rel="next" className="hover:text-primary hover:underline">
              Następna
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default SeoPagination;
