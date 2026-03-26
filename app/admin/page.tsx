import { OnboardingGate } from '@/components/OnboardingGate';
import { AdminApp } from '@/components/AdminApp';

export default function AdminPage() {
  return (
    <OnboardingGate>
      <AdminApp />
    </OnboardingGate>
  );
}
