// Base Components
export { Card, StatCard, CircularProgress, Button, ActivityButton, Chip, Badge } from './BaseComponents';

// Pages & Complex Components
export { Dashboard } from './Dashboard';
export { Calendar } from './Calendar';
export { TrainerCard, LessonCard, UpcomingLessonCard, UpcomingSessionCard } from './Cards';
export { LessonsPage } from './LessonsPage';
export { AdminApp } from './AdminApp';
export type { CoachInfo, RequestedSession } from './AdminApp';
export { MOCK_COACHES, TIER_HOURLY_RATES } from '../data/mockCoaches';
export type { CoachTier } from '../data/mockCoaches';
