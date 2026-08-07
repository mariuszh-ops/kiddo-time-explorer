# FamilyFun — Architektura projektu

## Cel

FamilyFun to katalog rodzinnych atrakcji w 5 polskich miastach
(Warszawa, Kraków, Wrocław, Poznań, Gdańsk). Pomaga rodzicom
znaleźć miejsca dopasowane do wieku dzieci i preferencji rodziny.

## Stos technologiczny

- React 18 + TypeScript
- Tailwind CSS
- React Router
- Dane atrakcji w bazie (tabela `public_activities`, tylko odczyt)

## Kluczowe pliki

- Klient katalogu (baza): `src/lib/catalogClient.ts`
- Typ Activity + ładowanie danych: `src/data/activities.ts`
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

1. Atrakcje żyją w bazie (`public_activities`) — nie ma plików JSON z danymi
2. Nowe miejsca dodaje się przez panel `/admin` (zakładka Katalog)
3. Publikacja: `published = true` oraz `admin_hidden = false`

## Jak dodać artykuł na blogu

1. Utwórz nowy plik w `/content/blog/[slug].md`
2. Pierwsza linia: `# Tytuł artykułu`
3. Treść w markdownie