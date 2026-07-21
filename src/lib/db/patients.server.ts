import 'server-only';
import { getSupabaseServerClient } from './supabase.server';
import type { Patient, PatientInsert } from './types';

export async function getPatientByIin(iin: string): Promise<Patient | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('patients').select('*').eq('iin', iin).maybeSingle();
  if (error) throw new Error(`[patients] getPatientByIin failed: ${error.message}`);
  return data;
}

export async function upsertPatient(patient: PatientInsert): Promise<Patient> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('patients').upsert(patient).select('*').single();
  if (error) throw new Error(`[patients] upsertPatient failed: ${error.message}`);
  return data;
}
