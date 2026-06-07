-- Synchronisation temporaire de sauvegardes A/B -- Outils EPS
-- Executer dans l'editeur SQL Supabase.

create table if not exists public.backup_sync_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  token_hash text not null,
  b_joined_at timestamptz null,
  a_payload jsonb null,
  b_payload jsonb null,
  a_payload_hash text null,
  b_payload_hash text null,
  decision jsonb null,
  a_applied_at timestamptz null,
  b_applied_at timestamptz null,
  constraint backup_sync_token_hash_len check (char_length(token_hash) >= 32),
  constraint backup_sync_a_payload_size check (a_payload is null or octet_length(a_payload::text) <= 5000000),
  constraint backup_sync_b_payload_size check (b_payload is null or octet_length(b_payload::text) <= 5000000)
);

create index if not exists backup_sync_sessions_expires_idx
  on public.backup_sync_sessions (expires_at);

alter table public.backup_sync_sessions
  add column if not exists a_applied_at timestamptz null;

alter table public.backup_sync_sessions
  add column if not exists b_applied_at timestamptz null;

alter table public.backup_sync_sessions enable row level security;

drop policy if exists backup_sync_no_select on public.backup_sync_sessions;
create policy backup_sync_no_select
  on public.backup_sync_sessions
  for select
  to anon, authenticated
  using (false);

drop policy if exists backup_sync_no_insert on public.backup_sync_sessions;
create policy backup_sync_no_insert
  on public.backup_sync_sessions
  for insert
  to anon, authenticated
  with check (false);

drop policy if exists backup_sync_no_update on public.backup_sync_sessions;
create policy backup_sync_no_update
  on public.backup_sync_sessions
  for update
  to anon, authenticated
  using (false);

drop policy if exists backup_sync_no_delete on public.backup_sync_sessions;
create policy backup_sync_no_delete
  on public.backup_sync_sessions
  for delete
  to anon, authenticated
  using (false);

create or replace function public.cleanup_expired_backup_sync_sessions()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.backup_sync_sessions
  where expires_at < now();
$$;

create or replace function public.create_backup_sync_session(
  p_token_hash text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.backup_sync_sessions%rowtype;
begin
  perform public.cleanup_expired_backup_sync_sessions();

  if p_token_hash is null or char_length(trim(p_token_hash)) < 32 then
    raise exception 'jeton invalide';
  end if;

  if p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '15 minutes' then
    raise exception 'expiration invalide';
  end if;

  insert into public.backup_sync_sessions (token_hash, expires_at)
  values (trim(p_token_hash), p_expires_at)
  returning * into v_row;

  return jsonb_build_object(
    'session_id', v_row.id,
    'expires_at', v_row.expires_at
  );
end;
$$;

create or replace function public.join_backup_sync_session(
  p_session_id uuid,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.backup_sync_sessions%rowtype;
begin
  perform public.cleanup_expired_backup_sync_sessions();

  select * into v_row
  from public.backup_sync_sessions
  where id = p_session_id
    and token_hash = trim(p_token_hash)
    and expires_at > now()
  for update;

  if not found then
    raise exception 'session introuvable ou expiree';
  end if;

  update public.backup_sync_sessions
  set b_joined_at = coalesce(b_joined_at, now())
  where id = p_session_id
  returning * into v_row;

  return jsonb_build_object(
    'session_id', v_row.id,
    'expires_at', v_row.expires_at
  );
end;
$$;

create or replace function public.upload_backup_sync_payload(
  p_session_id uuid,
  p_token_hash text,
  p_device text,
  p_payload jsonb,
  p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.backup_sync_sessions%rowtype;
begin
  perform public.cleanup_expired_backup_sync_sessions();

  if p_device not in ('a', 'b') then
    raise exception 'appareil invalide';
  end if;

  if p_payload is null or p_payload_hash is null or char_length(trim(p_payload_hash)) < 32 then
    raise exception 'sauvegarde invalide';
  end if;

  if octet_length(p_payload::text) > 5000000 then
    raise exception 'sauvegarde trop volumineuse';
  end if;

  select * into v_row
  from public.backup_sync_sessions
  where id = p_session_id
    and token_hash = trim(p_token_hash)
    and expires_at > now()
  for update;

  if not found then
    raise exception 'session introuvable ou expiree';
  end if;

  if p_device = 'a' then
    update public.backup_sync_sessions
    set a_payload = p_payload,
        a_payload_hash = trim(p_payload_hash)
    where id = p_session_id
    returning * into v_row;
  else
    update public.backup_sync_sessions
    set b_payload = p_payload,
        b_payload_hash = trim(p_payload_hash),
        b_joined_at = coalesce(b_joined_at, now())
    where id = p_session_id
    returning * into v_row;
  end if;

  return jsonb_build_object(
    'session_id', v_row.id,
    'a_uploaded', v_row.a_payload is not null,
    'b_uploaded', v_row.b_payload is not null,
    'expires_at', v_row.expires_at
  );
end;
$$;

create or replace function public.get_backup_sync_session(
  p_session_id uuid,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.backup_sync_sessions%rowtype;
begin
  perform public.cleanup_expired_backup_sync_sessions();

  select * into v_row
  from public.backup_sync_sessions
  where id = p_session_id
    and token_hash = trim(p_token_hash)
    and expires_at > now();

  if not found then
    raise exception 'session introuvable ou expiree';
  end if;

  return jsonb_build_object(
    'session_id', v_row.id,
    'expires_at', v_row.expires_at,
    'b_joined', v_row.b_joined_at is not null,
    'a_uploaded', v_row.a_payload is not null,
    'b_uploaded', v_row.b_payload is not null,
    'a_payload_hash', v_row.a_payload_hash,
    'b_payload_hash', v_row.b_payload_hash,
    'a_payload', v_row.a_payload,
    'b_payload', v_row.b_payload,
    'decision', v_row.decision
  );
end;
$$;

create or replace function public.set_backup_sync_decision(
  p_session_id uuid,
  p_token_hash text,
  p_decision jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.backup_sync_sessions%rowtype;
begin
  perform public.cleanup_expired_backup_sync_sessions();

  select * into v_row
  from public.backup_sync_sessions
  where id = p_session_id
    and token_hash = trim(p_token_hash)
    and expires_at > now()
  for update;

  if not found then
    raise exception 'session introuvable ou expiree';
  end if;

  if v_row.a_payload is null or v_row.b_payload is null then
    raise exception 'les deux sauvegardes ne sont pas encore disponibles';
  end if;

  update public.backup_sync_sessions
  set decision = coalesce(p_decision, '{}'::jsonb)
  where id = p_session_id
  returning * into v_row;

  return jsonb_build_object('session_id', v_row.id, 'decision', v_row.decision);
end;
$$;

create or replace function public.delete_backup_sync_session(
  p_session_id uuid,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.backup_sync_sessions
  where id = p_session_id
    and token_hash = trim(p_token_hash);

  get diagnostics v_deleted = row_count;
  perform public.cleanup_expired_backup_sync_sessions();

  return jsonb_build_object('deleted', v_deleted);
end;
$$;

create or replace function public.mark_backup_sync_applied(
  p_session_id uuid,
  p_token_hash text,
  p_device text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.backup_sync_sessions%rowtype;
begin
  perform public.cleanup_expired_backup_sync_sessions();

  if p_device not in ('a', 'b') then
    raise exception 'appareil invalide';
  end if;

  select * into v_row
  from public.backup_sync_sessions
  where id = p_session_id
    and token_hash = trim(p_token_hash)
    and expires_at > now()
  for update;

  if not found then
    return jsonb_build_object('deleted', true);
  end if;

  if p_device = 'a' then
    update public.backup_sync_sessions
    set a_applied_at = coalesce(a_applied_at, now())
    where id = p_session_id
    returning * into v_row;
  else
    update public.backup_sync_sessions
    set b_applied_at = coalesce(b_applied_at, now())
    where id = p_session_id
    returning * into v_row;
  end if;

  if v_row.a_applied_at is not null and v_row.b_applied_at is not null then
    delete from public.backup_sync_sessions
    where id = p_session_id;
    return jsonb_build_object('deleted', true);
  end if;

  return jsonb_build_object(
    'deleted', false,
    'a_applied', v_row.a_applied_at is not null,
    'b_applied', v_row.b_applied_at is not null
  );
end;
$$;

grant execute on function public.cleanup_expired_backup_sync_sessions() to anon, authenticated;
grant execute on function public.create_backup_sync_session(text, timestamptz) to anon, authenticated;
grant execute on function public.join_backup_sync_session(uuid, text) to anon, authenticated;
grant execute on function public.upload_backup_sync_payload(uuid, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.get_backup_sync_session(uuid, text) to anon, authenticated;
grant execute on function public.set_backup_sync_decision(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.delete_backup_sync_session(uuid, text) to anon, authenticated;
grant execute on function public.mark_backup_sync_applied(uuid, text, text) to anon, authenticated;
