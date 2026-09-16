/**
 * W-E-01: odporność Reacta na tłumacze stron (Google Translate, Chrome „Przetłumacz").
 *
 * Tłumacz podmienia węzły tekstowe na `<font><font>tekst</font></font>` — robi to
 * POZA Reactem, więc drzewo, które React trzyma w pamięci, przestaje odpowiadać
 * temu, co jest w DOM. Przy najbliższej rekoncyliacji `removeChild` trafia w węzeł,
 * który nie jest już dzieckiem tego rodzica, i leci
 * `NotFoundError: Failed to execute 'removeChild' on 'Node'`.
 *
 * ZMIERZONE (produkcja 10.09, `x-deployment-id 7c0c13cc`): 179 owiniętych węzłów
 * w `#root` na `/malopolskie`, klik „Kategoria atrakcji" → 4 wpisy w konsoli
 * (`NotFoundError` + `ErrorBoundary caught`) i dropdown, który NIE otwiera się
 * wcale (0 elementów `role="option"`). Cały widok szedł na fallback trasy.
 *
 * Łata jest tą rekomendowaną w facebook/react#11538: jeśli węzeł ma innego
 * rodzica, niż ten, z którego React go zdejmuje, traktujemy operację jako
 * wykonaną zamiast rzucać. To samo dla `insertBefore` z obcym węzłem odniesienia.
 * Skutek: React kończy commit, a co najwyżej zostaje w DOM sierota po tłumaczu.
 *
 * NIE jest to zamiennik `translate="no"` na paskach filtrów — to dwie warstwy:
 * atrybut usuwa najczęstsze źródło kolizji, ta łata łapie resztę (treść atrakcji
 * MA się tłumaczyć, więc jej nie wyłączamy).
 */

let zainstalowany = false;

export function installTranslateDomGuard(): void {
  if (zainstalowany) return;
  if (typeof Node !== "function" || !Node.prototype) return;
  zainstalowany = true;

  const oryginalnyRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      // Zwracamy węzeł tak, jakby operacja się udała — React tylko sprawdza
      // wartość zwrotną, a dalszy commit dzieje się już na spójnym drzewie.
      return child;
    }
    return oryginalnyRemoveChild.call(this, child) as T;
  } as typeof Node.prototype.removeChild;

  const oryginalnyInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      // Węzeł odniesienia wyjechał (tłumacz opakował go w <font>) — dokładamy
      // na koniec zamiast rzucać `NotFoundError`.
      return this.appendChild(newNode) as T;
    }
    return oryginalnyInsertBefore.call(this, newNode, referenceNode) as T;
  } as typeof Node.prototype.insertBefore;
}
