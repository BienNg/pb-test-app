import type { OnboardingDraft, OnboardingStep } from './types';
import { ONBOARDING_DRAFT_VERSION } from './types';

const STEPS: Record<string, OnboardingStep> = {
  experience: {
    id: 'experience',
    kind: 'single',
    title: 'How long have you played pickleball?',
    description: 'This helps us tailor your roadmap.',
    options: [
      { value: 'new', label: 'Brand new' },
      { value: 'casual', label: 'Under a year' },
      { value: 'regular', label: '1–3 years' },
      { value: 'advanced', label: '3+ years' },
    ],
    resolveNext: (answers) => {
      const v = answers.experience;
      if (v === 'new' || v === 'casual') return 'focus_area';
      return 'compete';
    },
  },
  focus_area: {
    id: 'focus_area',
    kind: 'single',
    title: 'What do you want to focus on first?',
    options: [
      { value: 'serve', label: 'Serve & return' },
      { value: 'dink', label: 'Dinking & net play' },
      { value: 'drive', label: 'Drives & resets' },
      { value: 'all', label: 'Overall fundamentals' },
    ],
    resolveNext: () => 'goal_text',
  },
  compete: {
    id: 'compete',
    kind: 'single',
    title: 'Do you play in leagues or tournaments?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'no', label: 'Not yet' },
    ],
    resolveNext: () => 'goal_text',
  },
  goal_text: {
    id: 'goal_text',
    kind: 'text',
    title: 'What is your main goal right now?',
    description: 'A sentence is enough—we use this to personalize tips.',
    placeholder: 'e.g. Win more at the kitchen line',
    optional: true,
    resolveNext: () => 'complete',
  },
  complete: {
    id: 'complete',
    kind: 'message',
    title: 'You are all set',
    description: 'Tap finish below to start using the app.',
    resolveNext: () => null,
  },
};

export const ONBOARDING_INITIAL_STEP_ID = 'experience';

export const ONBOARDING_TERMINAL_STEP_ID = 'complete';

export function getStep(stepId: string): OnboardingStep | undefined {
  return STEPS[stepId];
}

export function getInitialStepId(): string {
  return ONBOARDING_INITIAL_STEP_ID;
}

export function isTerminalStepId(stepId: string): boolean {
  return stepId === ONBOARDING_TERMINAL_STEP_ID;
}

export function resolveNextStepId(
  stepId: string,
  answers: Record<string, unknown>
): string | null {
  const step = STEPS[stepId];
  if (!step) return null;
  return step.resolveNext(answers);
}

export function validateStepAnswer(
  step: OnboardingStep,
  value: unknown
): boolean {
  if (step.kind === 'message') return true;
  if (step.kind === 'single') {
    if (typeof value !== 'string' || !value.trim()) return false;
    return step.options.some((o) => o.value === value);
  }
  if (step.optional) return true;
  return typeof value === 'string' && value.trim().length > 0;
}

export function createEmptyDraft(): OnboardingDraft {
  return {
    v: ONBOARDING_DRAFT_VERSION,
    currentStepId: getInitialStepId(),
    answers: {},
  };
}

export function normalizeDraft(raw: unknown): OnboardingDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== ONBOARDING_DRAFT_VERSION) return null;
  if (typeof o.currentStepId !== 'string' || !getStep(o.currentStepId)) return null;
  if (!o.answers || typeof o.answers !== 'object') return null;
  return {
    v: ONBOARDING_DRAFT_VERSION,
    currentStepId: o.currentStepId,
    answers: { ...(o.answers as Record<string, unknown>) },
  };
}

/** Approximate max steps for progress UI (branching makes exact count variable). */
export const ONBOARDING_MAX_STEPS_HINT = 5;
