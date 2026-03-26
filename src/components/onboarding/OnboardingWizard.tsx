'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { COLORS, RADIUS, SPACING, SHADOWS } from '@/styles/theme';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft } from 'lucide-react';
import {
  createEmptyDraft,
  draftAfterNavigatingBack,
  getOrderedPathToCurrent,
  getStep,
  normalizeDraft,
  ONBOARDING_MAX_STEPS_HINT,
  resolveNextStepId,
  validateStepAnswer,
} from '@/lib/onboarding/survey';
import type { OnboardingDraft, OnboardingStep } from '@/lib/onboarding/types';

const fontDisplay = "'Lexend', sans-serif";

function defaultHomeForRole(role: string | null | undefined): string {
  if (role === 'admin') return '/admin';
  if (role === 'coach') return '/coach';
  return '/';
}

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
};

const transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

export function OnboardingWizard() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [textInput, setTextInput] = useState('');
  const [selectedSingle, setSelectedSingle] = useState<string | null>(null);
  const [navDirection, setNavDirection] = useState(1);

  const loadProfile = useCallback(async () => {
    if (!supabase || !user?.id) {
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: qErr } = await supabase
      .from('profiles')
      .select('role, onboarding_completed_at, onboarding_draft')
      .eq('id', user.id)
      .maybeSingle();

    if (qErr) {
      setError(qErr.message);
      setLoading(false);
      return;
    }

    if (data?.onboarding_completed_at) {
      router.replace(defaultHomeForRole(data.role));
      setLoading(false);
      return;
    }

    setRole((data?.role as string) ?? 'student');
    const normalized = normalizeDraft(data?.onboarding_draft);
    const nextDraft = normalized ?? createEmptyDraft();
    setDraft(nextDraft);
    setLoading(false);
  }, [supabase, user?.id, router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const step: OnboardingStep | undefined = draft ? getStep(draft.currentStepId) : undefined;

  useEffect(() => {
    if (!step || !draft) return;
    if (step.kind === 'text') {
      const existing = draft.answers[step.id];
      setTextInput(typeof existing === 'string' ? existing : '');
    } else {
      setTextInput('');
    }
    if (step.kind === 'single') {
      const existing = draft.answers[step.id];
      setSelectedSingle(typeof existing === 'string' ? existing : null);
    } else {
      setSelectedSingle(null);
    }
  }, [step, draft]);

  const persistDraft = useCallback(
    async (next: OnboardingDraft, deferred: boolean) => {
      if (!supabase || !user?.id) return;
      setSaving(true);
      setError(null);
      try {
        const payload: Record<string, unknown> = {
          onboarding_draft: next,
        };
        if (deferred) {
          payload.onboarding_deferred_at = new Date().toISOString();
        }
        const { error: uErr } = await supabase.from('profiles').update(payload).eq('id', user.id);
        if (uErr) {
          setError(uErr.message);
          return;
        }
        if (deferred) {
          router.push(defaultHomeForRole(role));
          router.refresh();
        }
      } finally {
        setSaving(false);
      }
    },
    [supabase, user?.id, router, role]
  );

  const persistComplete = useCallback(async () => {
    if (!supabase || !user?.id || !draft) return;
    setSaving(true);
    setError(null);
    try {
      const answersSnapshot = { ...draft.answers };
      const { error: uErr } = await supabase
        .from('profiles')
        .update({
          onboarding_completed_at: new Date().toISOString(),
          onboarding_answers: answersSnapshot,
          onboarding_draft: null,
          onboarding_deferred_at: null,
        })
        .eq('id', user.id);
      if (uErr) {
        setError(uErr.message);
        return;
      }
      router.push(defaultHomeForRole(role));
      router.refresh();
    } finally {
      setSaving(false);
    }
  }, [supabase, user?.id, router, role, draft]);

  const handleContinueLater = async () => {
    if (!draft) return;
    await persistDraft(draft, true);
  };

  const handleNext = () => {
    if (!draft || !step) return;
    if (step.kind === 'message') return;

    let value: unknown =
      step.kind === 'single' ? selectedSingle : step.kind === 'text' ? textInput.trim() : undefined;

    if (step.kind === 'text' && step.optional && textInput.trim() === '') {
      value = '';
    }

    if (!validateStepAnswer(step, value)) {
      setError(step.kind === 'single' ? 'Please select an option.' : 'Please enter a response.');
      return;
    }

    const answers = { ...draft.answers, [step.id]: value };
    const nextId = resolveNextStepId(step.id, answers);

    if (nextId === null || !getStep(nextId)) {
      setError('Unexpected survey state.');
      return;
    }

    const nextDraft: OnboardingDraft = { ...draft, answers, currentStepId: nextId };
    setNavDirection(1);
    setDraft(nextDraft);
    setError(null);
    void (async () => {
      if (!supabase || !user?.id) return;
      // Don't set saving to true here to avoid UI flicker during optimistic update
      const { error: uErr } = await supabase
        .from('profiles')
        .update({ onboarding_draft: nextDraft })
        .eq('id', user.id);
      if (uErr) setError(uErr.message);
    })();
  };

  const handleBack = () => {
    if (!draft) return;
    const nextDraft = draftAfterNavigatingBack(draft);
    if (!nextDraft) return;
    setNavDirection(-1);
    setDraft(nextDraft);
    setError(null);
    void (async () => {
      if (!supabase || !user?.id) return;
      const { error: uErr } = await supabase
        .from('profiles')
        .update({ onboarding_draft: nextDraft })
        .eq('id', user.id);
      if (uErr) setError(uErr.message);
    })();
  };

  const handleFinish = () => {
    void persistComplete();
  };

  const progressApprox = draft
    ? Math.min(100, Math.round((Object.keys(draft.answers).length / ONBOARDING_MAX_STEPS_HINT) * 100))
    : 0;

  if (loading || !draft || !step) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: COLORS.background,
          fontFamily: fontDisplay,
        }}
      >
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ width: 40, height: 40, borderRadius: '50%', background: COLORS.textMuted }}
        />
      </div>
    );
  }

  const showNext = step.kind !== 'message';
  const showFinish = step.kind === 'message';
  const canGoBack =
    draft && getOrderedPathToCurrent(draft).length >= 2;

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: COLORS.background,
        fontFamily: fontDisplay,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top bar: back + progress */}
      <div
        style={{
          padding: `${SPACING.md}px ${SPACING.xxl}px ${SPACING.lg}px`,
          paddingTop: 'max(env(safe-area-inset-top), 16px)',
        }}
      >
        {canGoBack ? (
          <div style={{ marginBottom: SPACING.md }}>
            <button
              type="button"
              disabled={saving}
              onClick={handleBack}
              aria-label="Back"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                margin: 0,
                marginLeft: -8,
                padding: '8px 10px',
                border: 'none',
                background: 'transparent',
                fontFamily: fontDisplay,
                fontSize: 17,
                fontWeight: 400,
                color: COLORS.libraryPrimary,
                cursor: saving ? 'wait' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <ChevronLeft size={22} strokeWidth={2} aria-hidden />
              Back
            </button>
          </div>
        ) : null}
        <div
          style={{
            height: 4,
            borderRadius: RADIUS.full,
            background: COLORS.backgroundLight,
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressApprox}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: COLORS.textPrimary,
              borderRadius: RADIUS.full,
            }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <AnimatePresence initial={false} mode="wait" custom={navDirection}>
          <motion.div
            key={step.id}
            custom={navDirection}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              padding: `0 ${SPACING.xxl}px`,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 120 }}>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                style={{
                  margin: `0 0 ${SPACING.sm}px`,
                  fontSize: 32,
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                }}
              >
                {step.title}
              </motion.h1>
              
              {step.description ? (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  style={{
                    margin: `0 0 ${SPACING.xxl}px`,
                    fontSize: 17,
                    color: COLORS.textSecondary,
                    lineHeight: 1.4,
                  }}
                >
                  {step.description}
                </motion.p>
              ) : (
                <div style={{ height: SPACING.xl }} />
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                {step.kind === 'single' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
                    {step.options.map((opt) => {
                      const selected = selectedSingle === opt.value;
                      return (
                        <motion.button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSelectedSingle(opt.value);
                            setError(null);
                          }}
                          whileTap={{ scale: 0.98 }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            textAlign: 'left',
                            padding: '18px 20px',
                            borderRadius: RADIUS.lg,
                            border: `1.5px solid ${selected ? COLORS.textPrimary : COLORS.backgroundLight}`,
                            background: COLORS.white,
                            fontFamily: fontDisplay,
                            fontSize: 16,
                            fontWeight: 500,
                            color: COLORS.textPrimary,
                            cursor: 'pointer',
                            boxShadow: selected ? SHADOWS.light : 'none',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <span>{opt.label}</span>
                          {selected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            >
                              <Check size={20} color={COLORS.textPrimary} strokeWidth={2.5} />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                ) : null}

                {step.kind === 'text' ? (
                  <textarea
                    value={textInput}
                    onChange={(e) => {
                      setTextInput(e.target.value);
                      setError(null);
                    }}
                    placeholder={step.placeholder}
                    rows={4}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: SPACING.lg,
                      borderRadius: RADIUS.lg,
                      border: `1.5px solid ${COLORS.backgroundLight}`,
                      background: COLORS.backgroundLight,
                      fontFamily: fontDisplay,
                      fontSize: 16,
                      color: COLORS.textPrimary,
                      resize: 'none',
                      outline: 'none',
                      transition: 'border-color 0.2s ease, background-color 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = COLORS.textPrimary;
                      e.target.style.backgroundColor = COLORS.white;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = COLORS.backgroundLight;
                      e.target.style.backgroundColor = COLORS.backgroundLight;
                    }}
                  />
                ) : null}

                {error ? (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ marginTop: SPACING.md, fontSize: 14, color: COLORS.red, fontWeight: 500 }} 
                    role="alert"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky Bottom Actions */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: `0 ${SPACING.xxl}px calc(env(safe-area-inset-bottom) + 24px)`,
          background: 'linear-gradient(to top, rgba(255,255,255,1) 60%, rgba(255,255,255,0))',
          display: 'flex',
          flexDirection: 'column',
          gap: SPACING.md,
          zIndex: 10,
        }}
      >
        {showNext ? (
          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={saving}
            onClick={() => handleNext()}
            style={{
              padding: '18px 24px',
              borderRadius: RADIUS.full,
              border: 'none',
              background: COLORS.textPrimary,
              color: COLORS.white,
              fontFamily: fontDisplay,
              fontSize: 17,
              fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1,
              width: '100%',
              boxShadow: SHADOWS.md,
            }}
          >
            Continue
          </motion.button>
        ) : null}
        
        {showFinish ? (
          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={saving}
            onClick={handleFinish}
            style={{
              padding: '18px 24px',
              borderRadius: RADIUS.full,
              border: 'none',
              background: COLORS.textPrimary,
              color: COLORS.white,
              fontFamily: fontDisplay,
              fontSize: 17,
              fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1,
              width: '100%',
              boxShadow: SHADOWS.md,
            }}
          >
            Get Started
          </motion.button>
        ) : null}
        
        <button
          type="button"
          disabled={saving}
          onClick={handleContinueLater}
          style={{
            padding: '12px 20px',
            borderRadius: RADIUS.full,
            border: 'none',
            background: 'transparent',
            color: COLORS.textSecondary,
            fontFamily: fontDisplay,
            fontSize: 15,
            fontWeight: 500,
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.5 : 1,
          }}
        >
          Set up later
        </button>
      </div>
    </div>
  );
}
