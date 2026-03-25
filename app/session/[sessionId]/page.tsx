import { ProtectedRoute } from '@/components/ProtectedRoute';
import { TrainingSessionRoutePage } from '@/components/TrainingSessionRoutePage';

export default async function TrainingSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <ProtectedRoute>
      <TrainingSessionRoutePage sessionId={sessionId} />
    </ProtectedRoute>
  );
}
