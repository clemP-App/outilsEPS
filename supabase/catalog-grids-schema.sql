-- Catalogue collaboratif de grilles d'évaluation — Outils EPS
-- Exécuter dans l'éditeur SQL du projet Supabase (Dashboard → SQL → New query).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.catalog_grids (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  activity text not null,
  level text not null,
  author_name text not null default 'Enseignant1',
  source text not null default 'teacher',
  grid_data jsonb not null,
  grid_hash text not null,
  rows_count integer not null,
  columns_count integer not null,
  status text not null default 'published',
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  report_reason text null,
  constraint catalog_grids_title_not_empty check (char_length(trim(title)) > 0),
  constraint catalog_grids_activity_not_empty check (char_length(trim(activity)) > 0),
  constraint catalog_grids_level_not_empty check (char_length(trim(level)) > 0),
  constraint catalog_grids_rows_min check (rows_count >= 3),
  constraint catalog_grids_cols_min check (columns_count >= 3),
  constraint catalog_grids_size_max check (octet_length(grid_data::text) <= 50000),
  constraint catalog_grids_source_check check (source in ('teacher', 'outilseps')),
  constraint catalog_grids_status_check check (status in ('published', 'archived', 'rejected')),
  constraint catalog_grids_upvotes_nonneg check (upvotes >= 0),
  constraint catalog_grids_downvotes_nonneg check (downvotes >= 0),
  constraint catalog_grids_grid_data_not_empty check (grid_data <> '{}'::jsonb),
  constraint catalog_grids_grid_hash_unique unique (grid_hash)
);

create index if not exists catalog_grids_status_created_idx
  on public.catalog_grids (status, created_at desc);

create table if not exists public.catalog_votes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  grid_id uuid not null references public.catalog_grids (id) on delete cascade,
  vote_type text not null,
  voter_fingerprint text not null,
  constraint catalog_votes_type_check check (vote_type in ('up', 'down')),
  constraint catalog_votes_fingerprint_not_empty check (char_length(trim(voter_fingerprint)) > 0),
  constraint catalog_votes_grid_voter_unique unique (grid_id, voter_fingerprint)
);

create index if not exists catalog_votes_grid_id_idx on public.catalog_votes (grid_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.set_catalog_grids_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists catalog_grids_set_updated_at on public.catalog_grids;
create trigger catalog_grids_set_updated_at
  before update on public.catalog_grids
  for each row
  execute function public.set_catalog_grids_updated_at();

-- ---------------------------------------------------------------------------
-- RPC : vote_catalog_grid
-- ---------------------------------------------------------------------------

create or replace function public.vote_catalog_grid(
  p_grid_id uuid,
  p_vote_type text,
  p_voter_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grid public.catalog_grids%rowtype;
  v_old_vote text;
  v_up integer;
  v_down integer;
  v_result_vote text;
begin
  if p_vote_type is null or p_vote_type not in ('up', 'down') then
    raise exception 'vote_type invalide';
  end if;

  if p_voter_fingerprint is null or char_length(trim(p_voter_fingerprint)) < 8 then
    raise exception 'voter_fingerprint invalide';
  end if;

  select * into v_grid
  from public.catalog_grids
  where id = p_grid_id
  for update;

  if not found then
    raise exception 'grille introuvable';
  end if;

  if v_grid.status <> 'published' then
    raise exception 'grille non publiée';
  end if;

  select vote_type into v_old_vote
  from public.catalog_votes
  where grid_id = p_grid_id
    and voter_fingerprint = trim(p_voter_fingerprint);

  v_up := v_grid.upvotes;
  v_down := v_grid.downvotes;

  if v_old_vote is null then
    insert into public.catalog_votes (grid_id, vote_type, voter_fingerprint)
    values (p_grid_id, p_vote_type, trim(p_voter_fingerprint));
    if p_vote_type = 'up' then
      v_up := v_up + 1;
    else
      v_down := v_down + 1;
    end if;
    v_result_vote := p_vote_type;
  elsif v_old_vote = p_vote_type then
    -- re-clic sur le même vote : annulation
    delete from public.catalog_votes
    where grid_id = p_grid_id
      and voter_fingerprint = trim(p_voter_fingerprint);
    if p_vote_type = 'up' then
      v_up := greatest(0, v_up - 1);
    else
      v_down := greatest(0, v_down - 1);
    end if;
    v_result_vote := null;
  else
    update public.catalog_votes
    set vote_type = p_vote_type
    where grid_id = p_grid_id
      and voter_fingerprint = trim(p_voter_fingerprint);
    if v_old_vote = 'up' then
      v_up := greatest(0, v_up - 1);
    else
      v_down := greatest(0, v_down - 1);
    end if;
    if p_vote_type = 'up' then
      v_up := v_up + 1;
    else
      v_down := v_down + 1;
    end if;
    v_result_vote := p_vote_type;
  end if;

  if v_down >= 10 then
    update public.catalog_grids
    set upvotes = v_up,
        downvotes = v_down,
        status = 'archived',
        updated_at = now()
    where id = p_grid_id
    returning * into v_grid;
  else
    update public.catalog_grids
    set upvotes = v_up,
        downvotes = v_down,
        updated_at = now()
    where id = p_grid_id
    returning * into v_grid;
  end if;

  return jsonb_build_object(
    'id', v_grid.id,
    'status', v_grid.status,
    'upvotes', v_grid.upvotes,
    'downvotes', v_grid.downvotes,
    'vote_type', v_result_vote
  );
end;
$$;

grant execute on function public.vote_catalog_grid(uuid, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.catalog_grids enable row level security;
alter table public.catalog_votes enable row level security;

-- Lecture publique : grilles publiées uniquement
drop policy if exists catalog_grids_select_published on public.catalog_grids;
create policy catalog_grids_select_published
  on public.catalog_grids
  for select
  to anon, authenticated
  using (status = 'published');

-- Insertion publique : règles minimales (doublon bloqué par grid_hash unique)
drop policy if exists catalog_grids_insert_public on public.catalog_grids;
create policy catalog_grids_insert_public
  on public.catalog_grids
  for insert
  to anon, authenticated
  with check (
    status = 'published'
    and source in ('teacher', 'outilseps')
    and char_length(trim(title)) > 0
    and char_length(trim(activity)) > 0
    and char_length(trim(level)) > 0
    and grid_data is not null
    and grid_data <> '{}'::jsonb
    and rows_count >= 3
    and columns_count >= 3
    and octet_length(grid_data::text) <= 50000
    and char_length(trim(grid_hash)) >= 32
  );

-- Pas de mise à jour / suppression directe pour les clients anonymes
drop policy if exists catalog_votes_select_none on public.catalog_votes;
create policy catalog_votes_select_none
  on public.catalog_votes
  for select
  to anon, authenticated
  using (false);

drop policy if exists catalog_votes_insert_none on public.catalog_votes;
create policy catalog_votes_insert_none
  on public.catalog_votes
  for insert
  to anon, authenticated
  with check (false);

drop policy if exists catalog_votes_update_none on public.catalog_votes;
create policy catalog_votes_update_none
  on public.catalog_votes
  for update
  to anon, authenticated
  using (false);

drop policy if exists catalog_votes_delete_none on public.catalog_votes;
create policy catalog_votes_delete_none
  on public.catalog_votes
  for delete
  to anon, authenticated
  using (false);

-- Droits API (PostgREST) pour le rôle anon
grant select, insert on public.catalog_grids to anon, authenticated;
grant select on public.catalog_votes to anon, authenticated;
