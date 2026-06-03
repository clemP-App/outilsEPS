-- Permet d'annuler un vote en recliquant sur Utile ou Pas utile.
-- Exécuter dans Supabase → SQL Editor (remplace vote_catalog_grid).

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
