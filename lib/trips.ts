import type { SupabaseClient } from '@supabase/supabase-js';
import type { TripDoc } from '@/lib/entities';

export type TripSummary = TripDoc & { id: string };

export async function listTrips(supabase: SupabaseClient): Promise<TripSummary[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('id,data,created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: { id: string; data: TripDoc }) => ({
    ...row.data,
    id: row.id,
  }));
}

export async function createTrip(supabase: SupabaseClient, doc: TripDoc): Promise<TripDoc> {
  // user_id проставляется БД по умолчанию из auth.uid() (см. миграцию).
  const { error } = await supabase.from('trips').insert({ id: doc.id, data: doc });
  if (error) throw error;
  return doc;
}
