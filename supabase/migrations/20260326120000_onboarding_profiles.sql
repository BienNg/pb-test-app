-- Onboarding: completion, resumable draft, and optional defer (use app before finishing survey)
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_draft jsonb,
  add column if not exists onboarding_deferred_at timestamptz,
  add column if not exists onboarding_answers jsonb;

comment on column public.profiles.onboarding_completed_at is 'Set when user finishes onboarding; null means not completed.';
comment on column public.profiles.onboarding_draft is 'Resume state: version, currentStepId, answers.';
comment on column public.profiles.onboarding_deferred_at is 'Set when user chooses Continue later so gate allows main app until they finish.';
comment on column public.profiles.onboarding_answers is 'Copy of onboarding answer values at completion for admin reporting.';
