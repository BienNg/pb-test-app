import { ProtectedRoute } from '@/components/ProtectedRoute';
import { OnboardingGate } from '@/components/OnboardingGate';
import { StudentShell } from '@/components/StudentShell';

export default function HomePage() {
  return (
    <ProtectedRoute>
      <OnboardingGate>
        <StudentShell />
      </OnboardingGate>
    </ProtectedRoute>
  );
}
