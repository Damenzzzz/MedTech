import 'server-only';

export type EncounterStatus = 'draft' | 'edited' | 'final';

export type DialogueTurn = {
  speaker: 'doctor' | 'patient' | 'relative' | 'nurse' | 'unknown';
  text: string;
  start?: number;
  end?: number;
};

export type RagSource = {
  id?: string;
  title: string;
  protocolId?: string;
  sourceFile?: string;
  sectionType?: string;
  chunkText?: string;
  url?: string;
  excerpt?: string;
};

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          iin: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          iin: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          iin?: string;
          full_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      doctors: {
        Row: {
          id: string;
          full_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      encounters: {
        Row: {
          id: string;
          patient_iin: string;
          doctor_id: string;
          raw_transcript: string | null;
          structured_dialogue: DialogueTurn[];
          protocol: Record<string, unknown> | null;
          rag_sources: RagSource[];
          status: EncounterStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_iin: string;
          doctor_id: string;
          raw_transcript?: string | null;
          structured_dialogue?: DialogueTurn[];
          protocol?: Record<string, unknown> | null;
          rag_sources?: RagSource[];
          status?: EncounterStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_iin?: string;
          doctor_id?: string;
          raw_transcript?: string | null;
          structured_dialogue?: DialogueTurn[];
          protocol?: Record<string, unknown> | null;
          rag_sources?: RagSource[];
          status?: EncounterStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'encounters_patient_iin_fkey';
            columns: ['patient_iin'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['iin'];
          },
          {
            foreignKeyName: 'encounters_doctor_id_fkey';
            columns: ['doctor_id'];
            isOneToOne: false;
            referencedRelation: 'doctors';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Patient = Database['public']['Tables']['patients']['Row'];
export type PatientInsert = Database['public']['Tables']['patients']['Insert'];
export type Doctor = Database['public']['Tables']['doctors']['Row'];
export type Encounter = Database['public']['Tables']['encounters']['Row'];
export type EncounterInsert = Database['public']['Tables']['encounters']['Insert'];
export type EncounterUpdate = Database['public']['Tables']['encounters']['Update'];
