-- Remet à zéro les votes des grilles modèles Outils EPS (après import seed).
-- Exécuter dans Supabase → SQL Editor.

update public.catalog_grids
set upvotes = 0, downvotes = 0
where source = 'outilseps';

delete from public.catalog_votes
where grid_id in (
  select id from public.catalog_grids where source = 'outilseps'
);
