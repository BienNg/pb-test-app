import { OnboardingGate } from '@/components/OnboardingGate';
import { CoachApp } from '@/components/CoachApp';

export default function CoachPage() {
  return (
    <OnboardingGate>
      <CoachApp />
    </OnboardingGate>
  );
}
