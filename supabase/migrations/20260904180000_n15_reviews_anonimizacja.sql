-- N-15: opinie przezywaja usuniecie konta autora (anonimizacja zamiast kasowania).
--
-- Decyzja wlasciciela 04.09 (sesja DEC-N, pytanie 5/9): ANONIMIZOWAC, NIE KASOWAC.
-- Podstawa: RODO art. 17 dopuszcza pozostawienie tresci nieidentyfikujacej.
--
-- Stan przed: user_reviews.user_id NOT NULL + FK ON DELETE CASCADE, wiec skasowanie
-- konta zabieralo ze soba opinie (audyt 400, N-15: znikla 1/1 zatwierdzona opinia).
--
-- Trigger jest tu celowo, obok anonimizacji w Edge Function `delete-account`:
-- samo ON DELETE SET NULL zostawiloby opinie podpisana PRAWDZIWYM imieniem, ktorej
-- autor nie moze juz usunac - gorzej dla RODO niz dzisiejsza kaskada. Konto da sie
-- skasowac takze panelem Supabase i recznym SQL-em; akcja referencyjna FK wykonuje
-- sie jako zwykly UPDATE wiersza potomnego, wiec trigger BEFORE UPDATE lapie
-- kazda z tych drog. Zweryfikowane na zywej bazie 04.09 na obu sciezkach.
--
-- user_ratings i saved_activities ZOSTAJA na CASCADE (BD-A-09) - nie ruszamy ich.

alter table public.user_reviews alter column user_id drop not null;

alter table public.user_reviews drop constraint user_reviews_user_id_fkey;
alter table public.user_reviews
  add constraint user_reviews_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

create or replace function public.user_reviews_anonimizuj_sierote()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
begin
  -- Wiersz wlasnie stracil autora. Podpis nie moze zostac.
  if new.user_id is null and old.user_id is not null then
    new.author_name := 'Rodzic (konto usunięte)';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_user_reviews_anonimizuj on public.user_reviews;
-- Nazwa z 'a' celowo: BEFORE-triggery ida alfabetycznie, wiec ten idzie przed
-- trg_user_reviews_status_stamp. Oba dotykaja innych kolumn, ale niech kolejnosc
-- bedzie deterministyczna.
create trigger trg_user_reviews_anonimizuj
  before update on public.user_reviews
  for each row execute function public.user_reviews_anonimizuj_sierote();

-- RLS bez zmian i tak jest poprawny - sprawdzone testem odbiorczym:
--   widocznosc idzie po statusie (widok public_reviews filtruje status='approved',
--   jest SECURITY DEFINER, wiec osierocony wiersz czyta anon),
--   a polityki "wlasne" (user_reviews_update_own_pending / _delete_own) porownuja
--   auth.uid() = user_id, co dla NULL nie jest prawda - nikt obcy wiersza nie
--   przejmie ani nie skasuje. Polityki admina zostaja: moderacja musi dalej dzialac.
