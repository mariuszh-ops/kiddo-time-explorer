# Roadmap

## W toku
- [x] Start od góry przy wejściu na listing (scrollRestoration manual + scrollTo po danych) — ZWERYFIKOWANE
- [ ] /kategoria/:categorySlug → Mapa gubi kategorię

## Kolejka
- [ ] /kategoria/:categorySlug → Mapa gubi kategorię (selectedCategories z parametru trasy; licznik mapy = licznik listingu; powrót zachowuje ścieżkę; też /:regionSlug/:categorySlug)
- [ ] Mapa: po drag → karta → wstecz środek wraca błędny (zapis używać map.getCenter() w momencie zapisu; dalej { replace: true }; nie ruszać PUSH lista/mapa)
