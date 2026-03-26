/** JSON persisted in profiles.onboarding_draft */
export const ONBOARDING_DRAFT_VERSION = 1 as const;

export type OnboardingDraft = {
  v: typeof ONBOARDING_DRAFT_VERSION;
  currentStepId: string;
  answers: Record<string, unknown>;
};

export type OnboardingStepKind = 'single' | 'text' | 'message';

export type OnboardingOption = {
  value: string;
  label: string;
};

export type OnboardingStepBase = {
  id: string;
  title: string;
  description?: string;
};

export type OnboardingStepSingle = OnboardingStepBase & {
  kind: 'single';
  options: OnboardingOption[];
  /** Resolved after this answer is stored in answers[id] */
  resolveNext: (answers: Record<string, unknown>) => string | null;
};

export type OnboardingStepText = OnboardingStepBase & {
  kind: 'text';
  placeholder?: string;
  optional?: boolean;
  resolveNext: (answers: Record<string, unknown>) => string | null;
};

export type OnboardingStepMessage = OnboardingStepBase & {
  kind: 'message';
  resolveNext: () => null;
};

export type OnboardingStep =
  | OnboardingStepSingle
  | OnboardingStepText
  | OnboardingStepMessage;
