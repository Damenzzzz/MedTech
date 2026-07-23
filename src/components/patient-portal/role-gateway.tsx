import { getTranslations, getLocale } from 'next-intl/server';
import { getCaseRepository } from '@/repositories/index.server';
import { Link } from '@/i18n/navigation';
import { FallbackImage } from '@/components/ui/fallback-image';
import type { LocalizedText } from '@/domain/schemas';

/**
 * The Role Gateway: an asymmetric split of a live-scenario hero visual next
 * to two role cards (Doctor / Patient). `eyebrow`/`title`/`lead` differ
 * between the landing page and the standalone `/patient-portal` hub, so the
 * caller supplies copy while this component owns the Spatial composition.
 */
export async function RoleGateway({
  eyebrow,
  title,
  lead,
  headingLevel = 'h1',
}: {
  eyebrow: string;
  title: string;
  lead: string;
  headingLevel?: 'h1' | 'h2';
}) {
  const t = await getTranslations('PatientPortal');
  const locale = (await getLocale()) as 'ru' | 'kk' | 'en';
  const heroCase = await getCaseRepository().getStudentCase('chest-pain');
  const Heading = headingLevel;

  const pick = (text: LocalizedText) => text[locale] || text.ru;

  const doctorTitle = t('doctorCardTitle');
  const patientTitle = t('patientCardTitle');

  return (
    <div className="w-full max-w-6xl" style={{ animation: 'boardIn .4s cubic-bezier(.2,.8,.2,1) both' }}>
      <div className="mb-7 text-center">
        <div className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--surface-glass)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)]">
          <span
            className="size-[7px] shrink-0 rounded-full bg-[#12B5A6]"
            style={{ animation: 'softPulse 1.8s ease-in-out infinite' }}
          />
          {eyebrow}
        </div>
        <Heading className="mx-auto max-w-3xl text-[clamp(30px,4.6vw,50px)] font-bold leading-[1.06] tracking-tight text-[var(--text-primary)]">
          {title}
        </Heading>
        <p className="mx-auto mt-3.5 max-w-xl text-[15px] leading-relaxed text-[var(--text-secondary)] sm:text-base">
          {lead}
        </p>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 min-[961px]:grid-cols-[1.35fr_.95fr]">
        {/* Focal medical visual */}
        <div
          className="relative flex min-h-[420px] flex-col justify-between overflow-hidden rounded-[32px] p-7 shadow-[0_30px_70px_-20px_rgba(31,111,235,0.6)]"
          style={{ background: 'linear-gradient(140deg,#1F6FEB 0%,#2E86E0 46%,#12B5A6 104%)' }}
        >
          <div
            className="pointer-events-none absolute -top-20 -right-16 size-[340px] rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(255,255,255,0.4),transparent 62%)' }}
          />
          <div
            className="pointer-events-none absolute -bottom-32 -left-20 size-[360px] rounded-full"
            style={{ background: 'radial-gradient(circle,rgba(18,181,166,0.55),transparent 60%)' }}
          />

          <div className="relative z-[2] flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white/80">{t('heroScenarioLabel')}</div>
              {heroCase && (
                <>
                  <div className="mt-1 text-2xl font-bold tracking-tight text-white">{pick(heroCase.title)}</div>
                  <div className="mt-1 max-w-[320px] text-[13.5px] leading-relaxed text-white/85">
                    {pick(heroCase.complaint)}
                  </div>
                </>
              )}
            </div>
            {heroCase && (
              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="rounded-2xl border border-white/25 bg-white/15 px-3 py-2 text-right backdrop-blur-sm">
                  <div className="text-[10px] font-medium text-white/75">ЧСС</div>
                  <div className="mono text-xl font-semibold text-white tabular-nums">{heroCase.vitals.heartRate}</div>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/15 px-3 py-2 text-right backdrop-blur-sm">
                  <div className="text-[10px] font-medium text-white/75">SpO₂</div>
                  <div className="mono text-xl font-semibold text-white tabular-nums">{heroCase.vitals.spo2}%</div>
                </div>
              </div>
            )}
          </div>

          <div className="relative z-[2] my-2 flex flex-1 items-end justify-center">
            <div
              className="absolute bottom-8 h-[150px] w-3/4 rounded-full"
              style={{ background: 'radial-gradient(circle,rgba(255,255,255,0.28),transparent 68%)' }}
            />
            {heroCase && (
              <div
                className="relative h-[230px] w-[200px] overflow-hidden rounded-t-[26px] rounded-b-[90px] border-2 border-white/40 shadow-[0_24px_50px_-12px_rgba(6,20,40,0.5)]"
                style={{ animation: 'floatY 6s ease-in-out infinite' }}
              >
                <FallbackImage
                  src={heroCase.patient.avatar}
                  alt={pick(heroCase.patient.name)}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(160deg,transparent 40%,rgba(31,111,235,0.35))', mixBlendMode: 'multiply' }}
                />
              </div>
            )}
          </div>

          <div className="relative z-[2] rounded-2xl border border-white/20 bg-white/[.14] px-3.5 py-2.5 backdrop-blur-sm">
            <div className="mb-0.5 flex justify-between text-[10.5px] font-medium text-white/80">
              <span>{t('heroRhythmLabel')}</span>
              <span className="mono">{t('heroLeadLabel')}</span>
            </div>
            <svg viewBox="0 0 900 60" preserveAspectRatio="none" className="block h-10 w-full">
              <polyline
                points="0,30 90,30 120,30 132,10 146,52 160,30 250,30 300,30 312,22 326,38 340,30 430,30 470,30 482,6 498,56 512,30 610,30 660,30 672,22 686,38 700,30 800,30 860,30 872,10 886,52 900,30"
                fill="none"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="2.4"
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ strokeDasharray: 900, animation: 'ecgDash 3.4s linear infinite' }}
              />
            </svg>
          </div>
        </div>

        {/* Asymmetric role panels */}
        <div className="flex flex-col gap-4">
          <Link
            href="/patient-portal/doctor"
            className="group relative flex-[1.25] overflow-hidden rounded-[28px] border border-[var(--glass-border)] bg-[var(--surface)] p-6 shadow-[0_1px_2px_rgba(16,32,43,0.04),0_16px_40px_-14px_rgba(16,32,43,0.2)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_52px_-16px_rgba(31,111,235,0.34)]"
            style={{ animation: 'fadeUp .5s ease both' }}
          >
            <div
              className="pointer-events-none absolute -top-10 -right-8 size-[150px] rounded-full"
              style={{ background: 'radial-gradient(circle,rgba(31,111,235,0.14),transparent 65%)' }}
            />
            <div className="relative z-[1] flex items-center justify-between">
              <div className="brand-mark grid size-[52px] place-items-center rounded-2xl text-xl font-semibold shadow-[0_8px_18px_-4px_rgba(31,111,235,0.5)]">
                {doctorTitle.slice(0, 2)}
              </div>
              <span className="text-2xl text-[#1F6FEB] transition-transform group-hover:translate-x-1">→</span>
            </div>
            <div className="relative z-[1] mt-4 text-xl font-bold tracking-tight text-[var(--text-primary)]">
              {doctorTitle}
            </div>
            <p className="relative z-[1] mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              {t('doctorCardLead')}
            </p>
            <div className="relative z-[1] mt-4 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-[rgba(31,111,235,0.09)] px-2.5 py-1 text-[11.5px] font-medium text-[#1F6FEB]">
                {t('doctorTagStt')}
              </span>
              <span className="rounded-full bg-[rgba(18,181,166,0.11)] px-2.5 py-1 text-[11.5px] font-medium text-[#0E9E92]">
                {t('doctorTagRag')}
              </span>
              <span className="rounded-full bg-[rgba(16,32,43,0.05)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--text-secondary)]">
                {t('doctorTagTraining')}
              </span>
            </div>
          </Link>

          <Link
            href="/patient-portal/patient"
            className="group relative flex-1 overflow-hidden rounded-3xl border border-[var(--glass-border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(16,32,43,0.04),0_12px_30px_-14px_rgba(16,32,43,0.18)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_48px_-16px_rgba(18,181,166,0.32)]"
            style={{ animation: 'fadeUp .62s ease both' }}
          >
            <div
              className="pointer-events-none absolute -top-10 -right-8 size-[130px] rounded-full"
              style={{ background: 'radial-gradient(circle,rgba(18,181,166,0.16),transparent 65%)' }}
            />
            <div className="relative z-[1] flex items-center justify-between">
              <div
                className="grid size-[46px] place-items-center rounded-2xl text-[15px] font-semibold text-white shadow-[0_8px_18px_-4px_rgba(18,181,166,0.5)]"
                style={{ background: 'linear-gradient(135deg,#12B5A6,#1FB6D0)' }}
              >
                {patientTitle.slice(0, 2)}
              </div>
              <span className="text-xl text-[#0E9E92] transition-transform group-hover:translate-x-1">→</span>
            </div>
            <div className="relative z-[1] mt-3.5 text-lg font-bold tracking-tight text-[var(--text-primary)]">
              {patientTitle}
            </div>
            <p className="relative z-[1] mt-1 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
              {t('patientCardLead')}
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
