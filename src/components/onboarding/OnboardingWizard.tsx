'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/AuthProvider';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/styles/theme';
import {
  createEmptyDraft,
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
    if (!supabase || !user?.id) return;
    setSaving(true);
    setError(null);
    try {
      const { error: uErr } = await supabase
        .from('profiles')
        .update({
          onboarding_completed_at: new Date().toISOString(),
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
  }, [supabase, user?.id, router, role]);

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
    setDraft(nextDraft);
    setError(null);
    void (async () => {
      if (!supabase || !user?.id) return;
      setSaving(true);
      try {
        const { error: uErr } = await supabase
          .from('profiles')
          .update({ onboarding_draft: nextDraft })
          .eq('id', user.id);
        if (uErr) setError(uErr.message);
      } finally {
        setSaving(false);
      }
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
          background: COLORS.backgroundLibrary,
          fontFamily: fontDisplay,
        }}
      >
        <p style={{ color: COLORS.textSecondary, ...TYPOGRAPHY.body }}>Loading…</p>
      </div>
    );
  }

  const showNext = step.kind !== 'message';
  const showFinish = step.kind === 'message';

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: COLORS.backgroundLibrary,
        fontFamily: fontDisplay,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: SPACING.xxl, paddingBottom: SPACING.md }}>
        <div
          style={{
            height: 6,
            borderRadius: RADIUS.full,
            background: COLORS.backgroundLight,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressApprox}%`,
              background: COLORS.libraryPrimary,
              transition: 'width 0.25s ease',
            }}
          />
        </div>
        <p
          style={{
            margin: `${SPACING.md}px 0 0`,
            fontSize: 12,
            color: COLORS.textSecondary,
          }}
        >
          Onboarding
        </p>
      </div>

      <div style={{ flex: 1, padding: `0 ${SPACING.xxl}px ${SPACING.xxl}px` }}>
        <h1
          style={{
            margin: `0 0 ${SPACING.md}px`,
            fontSize: 24,
            fontWeight: 700,
            color: COLORS.textPrimary,
            lineHeight: 1.25,
          }}
        >
          {step.title}
        </h1>
        {step.description ? (
          <p
            style={{
              margin: `0 0 ${SPACING.xl}px`,
              fontSize: 15,
              color: COLORS.textSecondary,
              lineHeight: 1.5,
            }}
          >
            {step.description}
          </p>
        ) : null}

        {step.kind === 'single' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
            {step.options.map((opt) => {
              const selected = selectedSingle === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setSelectedSingle(opt.value);
                    setError(null);
                  }}
                  style={{
                    textAlign: 'left',
                    padding: SPACING.lg,
                    borderRadius: RADIUS.md,
                    border: `2px solid ${selected ? COLORS.libraryPrimary : COLORS.backgroundLight}`,
                    background: selected ? COLORS.libraryPrimaryLight : COLORS.white,
                    fontFamily: fontDisplay,
                    fontSize: 15,
                    fontWeight: 500,
                    color: COLORS.textPrimary,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
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
              borderRadius: RADIUS.md,
              border: `1px solid ${COLORS.backgroundLight}`,
              fontFamily: fontDisplay,
              fontSize: 15,
              resize: 'vertical',
            }}
          />
        ) : null}

        {error ? (
          <p style={{ marginTop: SPACING.lg, fontSize: 14, color: COLORS.red }} role="alert">
            {error}
          </p>
        ) : null}

        <div
          style={{
            marginTop: SPACING.xxl,
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.md,
          }}
        >
          {showNext ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleNext()}
              style={{
                padding: '14px 20px',
                borderRadius: RADIUS.md,
                border: 'none',
                background: COLORS.libraryPrimary,
                color: COLORS.white,
                fontFamily: fontDisplay,
                fontSize: 16,
                fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              Next
            </button>
          ) : null}
          {showFinish ? (
            <button
              type="button"
              disabled={saving}
              onClick={handleFinish}
              style={{
                padding: '14px 20px',
                borderRadius: RADIUS.md,
                border: 'none',
                background: COLORS.primary,
                color: COLORS.white,
                fontFamily: fontDisplay,
                fontSize: 16,
                fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              Finish
            </button>
          ) : null}
          <button
            type="button"
            disabled={saving}
            onClick={handleContinueLater}
            style={{
              padding: '12px 20px',
              borderRadius: RADIUS.md,
              border: 'none',
              background: 'transparent',
              color: COLORS.textSecondary,
              fontFamily: fontDisplay,
              fontSize: 15,
              fontWeight: 500,
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            Continue later
          </button>
        </div>
      </div>
    </div>
  );
}
