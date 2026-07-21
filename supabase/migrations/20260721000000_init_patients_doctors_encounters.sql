-- KazMedSim: patients, doctors, encounters
-- Run this in the Supabase SQL editor, or via `supabase db push` if you use the CLI.

create table if not exists public.patients (
  iin text primary key check (iin ~ '^[0-9]{12}$'),
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.encounters (
  id uuid primary key default gen_random_uuid(),
  patient_iin text not null references public.patients (iin) on delete restrict,
  doctor_id uuid not null references public.doctors (id) on delete restrict,
  raw_transcript text,
  structured_dialogue jsonb not null default '[]'::jsonb,
  protocol jsonb,
  rag_sources jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'edited', 'final')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists encounters_patient_iin_idx on public.encounters (patient_iin);
create index if not exists encounters_doctor_id_idx on public.encounters (doctor_id);
create index if not exists encounters_status_idx on public.encounters (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists encounters_set_updated_at on public.encounters;
create trigger encounters_set_updated_at
  before update on public.encounters
  for each row
  execute function public.set_updated_at();

-- Row Level Security: no policies for anon/authenticated on any table.
-- The app never talks to Supabase from the browser — only server-side API
-- routes using the service_role key (which bypasses RLS) may read/write.
alter table public.patients enable row level security;
alter table public.doctors enable row level security;
alter table public.encounters enable row level security;

revoke all on public.patients from anon, authenticated;
revoke all on public.doctors from anon, authenticated;
revoke all on public.encounters from anon, authenticated;
