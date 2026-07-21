-- Read policies for Supabase-authenticated clients.
-- Expected JWT app_metadata: { "role": "doctor" } or
-- { "role": "patient", "iin": "123456789012" }.
-- The Next.js app currently validates its own signed cookie and uses the
-- server-only service role; these policies are defense in depth for any
-- future direct authenticated Supabase access.

create or replace function public.current_medtech_role()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() ->> 'app_role'
  );
$$;

create or replace function public.current_patient_iin()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'iin',
    auth.jwt() ->> 'iin'
  );
$$;

grant execute on function public.current_medtech_role() to authenticated;
grant execute on function public.current_patient_iin() to authenticated;
grant select on public.patients, public.doctors, public.encounters to authenticated;

drop policy if exists "doctors read all encounters" on public.encounters;
create policy "doctors read all encounters"
on public.encounters for select to authenticated
using ((select public.current_medtech_role()) = 'doctor');

drop policy if exists "patients read own encounters" on public.encounters;
create policy "patients read own encounters"
on public.encounters for select to authenticated
using (
  (select public.current_medtech_role()) = 'patient'
  and patient_iin = (select public.current_patient_iin())
);

drop policy if exists "doctors read all patients" on public.patients;
create policy "doctors read all patients"
on public.patients for select to authenticated
using ((select public.current_medtech_role()) = 'doctor');

drop policy if exists "patients read own profile" on public.patients;
create policy "patients read own profile"
on public.patients for select to authenticated
using (
  (select public.current_medtech_role()) = 'patient'
  and iin = (select public.current_patient_iin())
);

drop policy if exists "doctors read doctor directory" on public.doctors;
create policy "doctors read doctor directory"
on public.doctors for select to authenticated
using ((select public.current_medtech_role()) = 'doctor');

drop policy if exists "patients read encounter doctors" on public.doctors;
create policy "patients read encounter doctors"
on public.doctors for select to authenticated
using (
  (select public.current_medtech_role()) = 'patient'
  and exists (
    select 1
    from public.encounters
    where encounters.doctor_id = doctors.id
      and encounters.patient_iin = (select public.current_patient_iin())
  )
);
