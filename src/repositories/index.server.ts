import 'server-only';
import {z} from 'zod';
import type {CaseRepository} from './case-repository';
import {SeedCaseRepository} from './seed-case-repository.server';
const EnvSchema=z.object({CASE_REPOSITORY:z.enum(['seed','supabase']).default('seed')});
export function getCaseRepository():CaseRepository{const env=EnvSchema.parse({CASE_REPOSITORY:process.env.CASE_REPOSITORY});if(env.CASE_REPOSITORY==='supabase'){throw new Error('Supabase adapter requires a project-specific implementation.');}return new SeedCaseRepository()}
