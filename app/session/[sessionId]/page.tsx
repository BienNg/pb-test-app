import { ProtectedRoute } from '@/components/ProtectedRoute';
import { OnboardingGate } from '@/components/OnboardingGate';
import { TrainingSessionRoutePage } from '@/components/TrainingSessionRoutePage';

export default async function TrainingSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <ProtectedRoute>
      <OnboardingGate>
        <TrainingSessionRoutePage sessionId={sessionId} />
      </OnboardingGate>
    </ProtectedRoute>
  );
}
