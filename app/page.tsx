import { ProtectedRoute } from '@/components/ProtectedRoute';
import { StudentShell } from '@/components/StudentShell';

export default function HomePage() {
  return (
    <ProtectedRoute>
      <StudentShell />
    </ProtectedRoute>
  );
}
