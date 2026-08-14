-- This project models one tournament per business branch. The existing
-- tournament_teams and tournament_matches tables use business_id + gender;
-- gender is therefore the persisted branch key until a tournament entity is introduced.
create table if not exists public.tournament_classification_zones (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  gender text not null default 'masculino' check (gender in ('masculino', 'femenino')),
  direct_count integer not null default 0 check (direct_count >= 0),
  playoff_count integer not null default 0 check (playoff_count >= 0),
  eliminated_count integer not null default 0 check (eliminated_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_classification_zones_business_gender_key unique (business_id, gender)
);

alter table public.tournament_classification_zones
  add column if not exists created_at timestamptz not null default now();

alter table public.tournament_classification_zones
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tournament_classification_zones_gender_check'
      and conrelid = 'public.tournament_classification_zones'::regclass
  ) then
    alter table public.tournament_classification_zones
      add constraint tournament_classification_zones_gender_check
      check (gender in ('masculino', 'femenino'));
  end if;
end;
$$;

create index if not exists idx_tournament_classification_zones_business
  on public.tournament_classification_zones (business_id);

create index if not exists idx_tournament_classification_zones_gender
  on public.tournament_classification_zones (gender);

create or replace function public.set_tournament_classification_zones_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tournament_classification_zones_updated_at
  on public.tournament_classification_zones;

create trigger set_tournament_classification_zones_updated_at
before update on public.tournament_classification_zones
for each row execute function public.set_tournament_classification_zones_updated_at();

alter table public.tournament_classification_zones enable row level security;

drop policy if exists "Public can read tournament classification zones"
  on public.tournament_classification_zones;

create policy "Public can read tournament classification zones"
  on public.tournament_classification_zones
  for select
  using (true);

drop policy if exists "Business staff can manage tournament classification zones"
  on public.tournament_classification_zones;

create policy "Business staff can manage tournament classification zones"
  on public.tournament_classification_zones
  for all
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = tournament_classification_zones.business_id
        and b.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.business_users bu
      where bu.business_id = tournament_classification_zones.business_id
        and bu.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.businesses b
      where b.id = tournament_classification_zones.business_id
        and b.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.business_users bu
      where bu.business_id = tournament_classification_zones.business_id
        and bu.user_id = auth.uid()
    )
  );
