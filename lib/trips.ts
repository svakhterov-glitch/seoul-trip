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

export async function getTrip(supabase: SupabaseClient, id: string): Promise<TripSummary | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('id,data')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as { id: string; data: TripDoc };
  return { ...row.data, id: row.id };
}

export async function updateTrip(supabase: SupabaseClient, doc: TripDoc): Promise<TripDoc> {
  const { error } = await supabase.from('trips').update({ data: doc }).eq('id', doc.id);
  if (error) throw error;
  return doc;
}
