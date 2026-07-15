begin;

revoke all on function public.oc_sync_medication_plan_occurrences()
  from public, anon, authenticated;

commit;
