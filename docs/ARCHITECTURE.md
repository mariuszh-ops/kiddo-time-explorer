# FamilyFun — Architektura projektu

## Cel

FamilyFun to katalog rodzinnych atrakcji w 5 polskich miastach
(Warszawa, Kraków, Wrocław, Poznań, Gdańsk). Pomaga rodzicom
znaleźć miejsca dopasowane do wieku dzieci i preferencji rodziny.

## Stos technologiczny

- React 18 + TypeScript
- Tailwind CSS
- React Router
- Dane w plikach JSON (nie w bazie danych)

## Kluczowe pliki

- Dane atrakcji: `src/data/activities.json`
- Typ Activity: `src/data/activities.ts`
- Treści redakcyjne (blog, opisy miast): `/content/`
- Komponenty UI: `src/components/`
- Strony: `src/pages/`

## Konwencje nazewnictwa

- Slug atrakcji: `[miasto]-[nazwa-kebab-case]`
  Przykład: `"warszawa-zoo-warszawskie"`
- Bez polskich znaków (ą→a, ł→l, itd.)
- Pliki blog: `/content/blog/[slug-artykulu].md`
- Pliki miast: `/content/cities/[nazwa-miasta].md`

## Jak dodać nową atrakcję

1. Otwórz `src/data/activities.json`
2. Dodaj nowy obiekt na końcu tablicy
3. Wymagane pola: `id`, `title`, `city`, `ageRange`, `indoor`, `tags`
4. Opcjonalne (zalecane): `slug`, `address`, `description`, `amenities`
5. Zapisz plik — zmiany pojawią się automatycznie

## Jak dodać artykuł na blogu

1. Utwórz nowy plik w `/content/blog/[slug].md`
2. Pierwsza linia: `# Tytuł artykułu`
3. Treść w markdownie