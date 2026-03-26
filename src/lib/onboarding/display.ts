import { getStep, normalizeDraft } from './survey';

export type OnboardingSurveyStatus = 'complete' | 'in_progress' | 'not_started';

const ANSWER_STEP_IDS = ['experience', 'focus_area', 'compete', 'goal_text'] as const;

export function deriveOnboardingSurveyFields(row: {
  onboarding_completed_at?: string | null;
  onboarding_draft?: unknown;
  onboarding_answers?: unknown;
}): {
  onboardingSurveyStatus: OnboardingSurveyStatus;
  onboardingAnswers: Record<string, unknown>;
} {
  const completed = Boolean(row.onboarding_completed_at);
  const draft = normalizeDraft(row.onboarding_draft);
  const draftHasAnswers =
    draft?.answers && Object.keys(draft.answers as object).length > 0 ? draft.answers : null;

  const saved =
    row.onboarding_answers &&
    typeof row.onboarding_answers === 'object' &&
    !Array.isArray(row.onboarding_answers)
      ? { ...(row.onboarding_answers as Record<string, unknown>) }
      : null;

  if (completed) {
    const answers =
      saved && Object.keys(saved).length > 0 ? saved : draftHasAnswers ?? {};
    return { onboardingSurveyStatus: 'complete', onboardingAnswers: answers };
  }

  if (draftHasAnswers) {
    return {
      onboardingSurveyStatus: 'in_progress',
      onboardingAnswers: draftHasAnswers,
    };
  }

  return { onboardingSurveyStatus: 'not_started', onboardingAnswers: {} };
}

/** Human-readable rows for admin survey modal. */
export function formatOnboardingAnswersForAdmin(
  answers: Record<string, unknown>
): { question: string; answer: string }[] {
  const rows: { question: string; answer: string }[] = [];
  for (const key of ANSWER_STEP_IDS) {
    const raw = answers[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const step = getStep(key);
    const question = step?.title ?? key;
    let answer = typeof raw === 'string' ? raw : String(raw);
    if (step?.kind === 'single') {
      const opt = step.options.find((o) => o.value === raw);
      if (opt) answer = opt.label;
    }
    rows.push({ question, answer });
  }
  return rows;
}
