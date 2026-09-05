-- M-10: autor widzi wlasne zgloszenia (issue_reports, activity_submissions).
--
-- Wykonane 05.09.2026 na projekcie zpqpgatnnbojgiejmtpt przez Management API.
-- Ten plik jest zapisem tego, co juz stoi na produkcji - nie planem.
--
-- STAN PRZED (zmierzony na zywej bazie): obie tabele mialy wylacznie polityki
-- adminowe SELECT, wiec zalogowany autor po wlasnym INSERT czytal 0 wierszy.
-- Zadna polityka nie mogla go dopuscic, bo w tych tabelach NIE BYLO czym
-- rozpoznac autora - kolumny user_id nie bylo w ogole. To nie byl zly warunek
-- w polityce, tylko brak danych.
--
-- Uboczny objaw tego samego braku: INSERT z naglowkiem "Prefer: return=representation"
-- konczyl sie 403 "new row violates row-level security policy" - RETURNING wymaga
-- polityki SELECT na wstawionym wierszu. Front tego nie uzywa (supabase-js bez
-- .select() wysyla return=minimal, stad prawdziwe 201 w audycie), ale pierwsze
-- .select() dopisane po insercie pekloby bez ostrzezenia. Po tej migracji dziala.
--
-- Formularze ZOSTAJA otwarte dla niezalogowanych: user_id jest nullowalne, anon
-- wstawia null i nadal nie czyta niczego (nie ma grantu SELECT).

alter table public.issue_reports        add column if not exists user_id uuid;
alter table public.activity_submissions add column if not exists user_id uuid;

-- ON DELETE SET NULL, nie CASCADE: zgloszenie jest elementem obslugi po stronie
-- redakcji, nie trescia konta. Skasowanie konta ma zerwac powiazanie z osoba,
-- a nie zabrac adminowi sprawy w toku. Ta sama decyzja co przy opiniach (N-15).
alter table public.issue_reports
  add constraint issue_reports_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.activity_submissions
  add constraint activity_submissions_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

create index if not exists issue_reports_user_id_idx
  on public.issue_reports (user_id) where user_id is not null;
create index if not exists activity_submissions_user_id_idx
  on public.activity_submissions (user_id) where user_id is not null;

-- Autora stempluje BAZA, nie klient. Obie tabele maja tabelowy GRANT INSERT dla
-- anon i authenticated, wiec bez tego triggera klient moglby podac w JSON-ie cudze
-- user_id i podszyc sie pod inne konto. Wzorzec i powod identyczne jak przy
-- client_fp w rate-limicie (migration_rate_limit_2026-08-03.sql): trigger ZAWSZE
-- nadpisuje, nie uzupelnia. Zweryfikowane testem: insert z podstawionym cudzym
-- user_id zapisuje sie z id wlasciciela sesji.
create or replace function public.stempluj_autora_zgloszenia()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
begin
  -- auth.uid() dla niezalogowanego to null - i o to chodzi.
  new.user_id := auth.uid();
  return new;
end;
$function$;

revoke all on function public.stempluj_autora_zgloszenia() from anon, authenticated;

-- Nazwa z 'a': BEFORE-triggery ida alfabetycznie, wiec stempel autora idzie przed
-- rate-limitem. Kolejnosc nie jest tu krytyczna (rate-limit nie czyta user_id),
-- ale trzyma zgodnosc z ukladem z N-15.
drop trigger if exists trg_issue_reports_autor on public.issue_reports;
create trigger trg_issue_reports_autor
before insert on public.issue_reports
for each row execute function public.stempluj_autora_zgloszenia();

drop trigger if exists trg_activity_submissions_autor on public.activity_submissions;
create trigger trg_activity_submissions_autor
before insert on public.activity_submissions
for each row execute function public.stempluj_autora_zgloszenia();

-- Polityki wlascicielskie: TYLKO SELECT. Zmiana statusu i kasowanie zostaja przy
-- adminie - autor ma widziec, co sie dzieje z jego zgloszeniem, a nie zamykac go
-- sam. auth.uid() w podzapytaniu (jak w politykach adminowych) - planer liczy je
-- raz na zapytanie, nie raz na wiersz.
drop policy if exists issue_reports_owner_select on public.issue_reports;
create policy issue_reports_owner_select
on public.issue_reports for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists activity_submissions_owner_select on public.activity_submissions;
create policy activity_submissions_owner_select
on public.activity_submissions for select to authenticated
using (user_id = (select auth.uid()));

-- ODBIOR (zmierzony 05.09 na zywej bazie, wiersze zasiane i posprzatane):
--   BC-A-04: autor SELECT wlasnych = liczba wlasnych INSERT-ow (1/1 w obu tabelach);
--            PATCH statusu i DELETE przez autora nadal 0 zmienionych wierszy;
--   obcy zalogowany widzi 0, anon dostaje 401/42501 (brak grantu SELECT);
--   admin widzi WSZYSTKO, takze wiersze anonimowe (user_id null), i dalej moderuje;
--   skasowanie konta autora przechodzi mimo nowego FK, wiersz zostaje z user_id null.
--
-- CZEGO TA MIGRACJA NIE ROBI: front nie ma jeszcze widoku "moje zgloszenia" ani nie
-- czyta tych tabel w eksporcie przegladarkowym - to pozycja planu M-10b. Skrypt
-- 7_public/eksport_uzytkownika.py (repo pipeline'u) juz dobiera te wiersze po user_id.
