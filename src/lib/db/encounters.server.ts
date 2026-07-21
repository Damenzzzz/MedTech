import 'server-only';
import { getSupabaseServerClient } from './supabase.server';
import type { Encounter, EncounterInsert } from './types';

export async function createEncounter(encounter: EncounterInsert): Promise<Encounter> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('encounters').insert(encounter).select('*').single();
  if (error) throw new Error(`[encounters] createEncounter failed: ${error.message}`);
  return data;
}

export async function listEncountersByPatient(patientIin: string): Promise<Encounter[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('encounters')
    .select('*')
    .eq('patient_iin', patientIin)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`[encounters] listEncountersByPatient failed: ${error.message}`);
  return data;
}

export async function listEncountersByDoctor(doctorId: string): Promise<Encounter[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('encounters')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`[encounters] listEncountersByDoctor failed: ${error.message}`);
  return data;
}
