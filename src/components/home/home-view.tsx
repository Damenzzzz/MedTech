'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  ArrowRight,
  Sparkles,
  Stethoscope,
  Bot,
  Edit3,
  UserCheck,
  Thermometer,
  HeartPulse,
  FileSpreadsheet,
  ShieldCheck,
  Brain,
  BookOpenCheck,
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { useUserStore } from '@/stores/user-store';

export function HomeView() {
  const t = useTranslations('Landing');
  const navT = useTranslations('Nav');
  const router = useRouter();

  const profile = useUserStore((s) => s.profile);
  const hydrated = useUserStore((s) => s.hydrated);
  const setName = useUserStore((s) => s.setName);

  const [mode, setMode] = useState<'training' | 'ai'>('training');
  const [isEditing, setIsEditing] = useState(false);

  const schema = z.object({
    name: z
      .string()
      .transform((v) => v.trim())
      .pipe(
        z
          .string()
          .min(2, t('nameMinMax'))
          .max(40, t('nameMinMax'))
      ),
  });

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: profile?.name || '',
    },
  });

  useEffect(() => {
    if (profile?.name) {
      setValue('name', profile.name);
    }
  }, [profile, setValue]);

  const onSaveName = (data: FormData) => {
    setName(data.name);
    setIsEditing(false);
  };

  const handleStartTraining = () => {
    if (profile?.onboardingCompleted) {
      router.push('/patients');
    } else {
      router.push('/intro');
    }
  };

  return (
    <div className="space-y-16 py-8 sm:py-12">
      {/* Hero Section */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_.9fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/80 px-3.5 py-1.5 text-xs font-semibold text-teal-800 shadow-xs">
            <Sparkles size={14} className="text-teal-600" />
            <span>{t('eyebrow')}</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.08]">
            {t('heroTitle')}
          </h1>

          {/* Subtitle */}
          <p className="text-lg leading-relaxed text-slate-600 max-w-2xl">
            {t('heroSubtitle')}
          </p>

          {/* Mode Switcher Pills */}
          <div className="flex rounded-2xl border border-slate-200 bg-slate-100/80 p-1.5 max-w-md shadow-inner">
            <button
              onClick={() => setMode('training')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                mode === 'training'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope size={16} />
              {t('modeTrainingTitle')}
            </button>
            <button
              onClick={() => setMode('ai')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                mode === 'ai'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot size={16} />
              {t('modeAiTitle')}
            </button>
          </div>

          {/* Dynamic Mode Card Content */}
          <AnimatePresence mode="wait">
            {mode === 'training' ? (
              <motion.div
                key="training-mode"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5 rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/60 to-white p-5 shadow-sm"
              >
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {t('modeTrainingDesc')}
                </p>

                {/* Profile / Name Section */}
                {hydrated && profile && !isEditing ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl bg-white p-3.5 border border-teal-200/80 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-teal-600 text-white font-bold text-sm shadow-xs">
                          {profile.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">
                            {t('welcomeBack', { name: profile.name })}
                          </p>
                          <p className="text-sm font-bold text-slate-900">
                            {profile.name}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 hover:bg-teal-50 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Edit3 size={14} />
                        {t('changeNameBtn')}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        onClick={handleStartTraining}
                        className="focus-ring inline-flex h-12 items-center gap-2 rounded-xl bg-teal-600 px-6 text-sm font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all hover:scale-[1.01] active:scale-[0.99]"
                      >
                        {profile.onboardingCompleted
                          ? t('startTraining')
                          : t('continueTraining')}
                        <ArrowRight size={18} />
                      </button>

                      <Link
                        href="/ai-assistant"
                        className="focus-ring inline-flex h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all"
                      >
                        <Bot size={17} className="text-teal-600" />
                        {t('openAi')}
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Form for Name Input */
                  <form
                    onSubmit={handleSubmit(onSaveName)}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        {t('nameLabel')}
                      </label>
                      <div className="relative">
                        <input
                          {...register('name')}
                          type="text"
                          placeholder={t('namePlaceholder')}
                          className="input pr-10 border-slate-300 focus:border-teal-600"
                        />
                        <UserCheck
                          size={18}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </div>
                      {errors.name && (
                        <p className="mt-1.5 text-xs font-medium text-red-600">
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="focus-ring inline-flex h-12 items-center gap-2 rounded-xl bg-teal-600 px-6 text-sm font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all hover:scale-[1.01]"
                      >
                        {t('startTraining')}
                        <ArrowRight size={18} />
                      </button>

                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="focus-ring inline-flex h-12 items-center rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-600 hover:bg-slate-100"
                        >
                          {navT('back')}
                        </button>
                      )}

                      <Link
                        href="/ai-assistant"
                        className="focus-ring inline-flex h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                      >
                        <Bot size={17} className="text-teal-600" />
                        {t('openAi')}
                      </Link>
                    </div>
                  </form>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="ai-mode"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50/70 to-white p-5 shadow-sm"
              >
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {t('modeAiDesc')}
                </p>
                <Link
                  href="/ai-assistant"
                  className="focus-ring inline-flex h-12 items-center gap-2 rounded-xl bg-cyan-700 px-6 text-sm font-bold text-white shadow-md shadow-cyan-700/20 hover:bg-cyan-800 transition-all"
                >
                  <Bot size={18} />
                  {t('openAi')}
                  <ArrowRight size={18} />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Workspace Preview Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/50 overflow-hidden"
        >
          <div className="clinical-grid absolute inset-0 opacity-60" />
          
          <div className="relative z-10 space-y-5">
            {/* Workspace Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-teal-100 text-teal-700">
                  <Activity size={18} />
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {t('workspace')}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                {t('status')}
              </span>
            </div>

            {/* Patient Card Preview */}
            <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/80 p-6 text-center shadow-xs">
                <div className="grid size-20 place-items-center rounded-2xl bg-teal-600 text-2xl font-bold text-white shadow-md shadow-teal-600/30 mb-3">
                  АС
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {t('patient')}
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  46 лет · Мужской
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-100/80 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                  <Thermometer size={13} />
                  Жалоба: Боль в груди
                </div>
              </div>

              {/* Vitals Preview */}
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>SpO₂</span>
                    <HeartPulse size={14} className="text-teal-600" />
                  </div>
                  <div className="mt-1 text-2xl font-black text-slate-900">
                    94<span className="text-xs font-normal text-slate-500">%</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                  <div className="text-xs text-slate-500 font-semibold">АД</div>
                  <div className="mt-1 text-xl font-black text-slate-900">
                    150/92 <span className="text-xs font-normal text-slate-500">мм рт.ст.</span>
                  </div>
                </div>

                <div className="rounded-xl border border-teal-200 bg-teal-50/80 p-3 text-[11px] font-bold text-teal-900 flex items-center gap-2">
                  <FileSpreadsheet size={15} className="text-teal-700" />
                  {t('stage')}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Benefits Block */}
      <section className="border-y border-slate-200/80 bg-white/70 py-16 backdrop-blur-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              {t('featuresTitle')}
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Brain,
                key: 'dialogue',
                color: 'text-teal-600 bg-teal-50 border-teal-100',
              },
              {
                icon: Stethoscope,
                key: 'clinical',
                color: 'text-cyan-600 bg-cyan-50 border-cyan-100',
              },
              {
                icon: BookOpenCheck,
                key: 'rubric',
                color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
              },
            ].map(({ icon: Icon, key, color }, idx) => (
              <motion.article
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="card rounded-2xl p-7 transition-all hover:shadow-lg hover:-translate-y-1"
              >
                <div
                  className={`inline-grid size-12 place-items-center rounded-xl border ${color} mb-5`}
                >
                  <Icon size={24} />
                </div>
                <p className="text-base leading-relaxed text-slate-600 font-medium">
                  {t(key)}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works & Educational Safety Disclaimer */}
      <section className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <div className="space-y-6">
          <p className="label text-teal-700">01 — 08</p>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('howTitle')}
          </h2>
          <ol className="space-y-4">
            {['one', 'two', 'three'].map((x, i) => (
              <li
                key={x}
                className="flex items-center gap-4 rounded-xl border border-slate-200/70 bg-white p-4 shadow-xs"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-teal-600 text-sm font-bold text-white shadow-xs">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {t(x)}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Disclaimer */}
        <aside className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/40 p-8 text-amber-950 shadow-sm flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 mb-4">
              <ShieldCheck size={18} className="text-amber-700" />
              <span>{t('safetyTitle')}</span>
            </div>
            <p className="text-sm leading-relaxed font-medium text-amber-900/90">
              {t('disclaimer')}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-amber-200/60 text-xs font-semibold text-amber-800/70">
            КазМедСим Educational Framework · KazMedSim Demo Profile
          </div>
        </aside>
      </section>
    </div>
  );
}
