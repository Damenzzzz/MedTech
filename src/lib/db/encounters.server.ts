import 'server-only';
import { getSupabaseServerClient } from './supabase.server';
import type { Encounter, EncounterInsert } from './types';

export type EncounterWithDoctor = Encounter & { doctors: { full_name: string } | null };
export type DoctorPatientSummary = {
  iin: string;
  fullName: string | null;
  lastEncounterAt: string;
  encounterCount: number;
};

export async function createEncounter(encounter: EncounterInsert): Promise<Encounter> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from('encounters').insert(encounter).select('*').single();
  if (error) throw new Error(`[encounters] createEncounter failed: ${error.message}`);
  return data;
}

export async function listEncountersByPatient(patientIin: string): Promise<EncounterWithDoctor[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('encounters')
    .select('*, doctors(full_name)')
    .eq('patient_iin', patientIin)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`[encounters] listEncountersByPatient failed: ${error.message}`);
  return data as unknown as EncounterWithDoctor[];
}

export async function listDoctorPatients(doctorId: string): Promise<DoctorPatientSummary[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('encounters')
    .select('patient_iin, created_at, patients(full_name)')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`[encounters] listDoctorPatients failed: ${error.message}`);

  const summaries = new Map<string, DoctorPatientSummary>();
  for (const row of data as unknown as Array<{ patient_iin: string; created_at: string; patients: { full_name: string | null } | null }>) {
    const current = summaries.get(row.patient_iin);
    if (current) {
      current.encounterCount += 1;
      continue;
    }
    summaries.set(row.patient_iin, {
      iin: row.patient_iin,
      fullName: row.patients?.full_name ?? null,
      lastEncounterAt: row.created_at,
      encounterCount: 1,
    });
  }
  return [...summaries.values()];
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
