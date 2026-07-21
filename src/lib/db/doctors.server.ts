import 'server-only';
import { getSupabaseServerClient } from './supabase.server';
import type { Doctor } from './types';

export async function findOrCreateDoctorByName(fullName: string): Promise<Doctor> {
  const supabase = getSupabaseServerClient();
  const trimmed = fullName.trim();

  const { data: existing, error: findError } = await supabase
    .from('doctors')
    .select('*')
    .ilike('full_name', trimmed)
    .limit(1)
    .maybeSingle();
  if (findError) throw new Error(`[doctors] findOrCreateDoctorByName lookup failed: ${findError.message}`);
  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from('doctors')
    .insert({ full_name: trimmed })
    .select('*')
    .single();
  if (insertError) throw new Error(`[doctors] findOrCreateDoctorByName insert failed: ${insertError.message}`);
  return created;
}
