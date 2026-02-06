/**
 * PB ACADEMY MOBILE TRAINING APP
 * Component Library & Feature Documentation
 */

// ============================================================================
// CORE COMPONENTS (src/components/BaseComponents.tsx)
// ============================================================================

/**
 * Card
 * Base card component with subtle shadow and rounded corners
 * - Responsive padding
 * - Micro-interactions (scale on tap)
 * - Customizable background and padding
 */
export interface CardProps {
  children: React.ReactNode;
  padding?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/**
 * StatCard
 * Displays a key metric with title, value, unit, and icon
 * Used for: Lessons Completed, Training Hours, Ratings, Active Students
 * - Icon in circular background
 * - Bold value typography
 * - Muted unit label
 */
export interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: string;
  accentColor?: string;
  onClick?: () => void;
}

/**
 * CircularProgress
 * Animated circular progress indicator with SVG stroke
 * Used for: Training cycle tracking, daily progress, completion rates
 * - Smooth animation on load
 * - Customizable size and color
 * - Centered text inside ring
 */
export interface CircularProgressProps {
  percentage: number;
  value: string | number;
  label: string;
  color: string;
  size?: number;
}

/**
 * Button
 * Versatile button component with multiple variants
 * Variants: primary (lavender), secondary (light bg), minimal (outline)
 * Sizes: sm, md, lg
 */
export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

/**
 * ActivityButton
 * Circular button for quick actions/shortcuts
 * - White background with subtle shadow
 * - Emoji or icon display
 * - Tap feedback animation
 */
export interface ActivityButtonProps {
  icon: string;
  label: string;
  onClick?: () => void;
}

/**
 * Chip
 * Small pill-shaped button/label component
 * Colors: green, blue, lavender
 * Used for: specialties, tags, filters
 */
export interface ChipProps {
  label: string;
  color?: 'green' | 'blue' | 'lavender';
  onClick?: () => void;
}

/**
 * Badge
 * Status indicator component
 * Status: success (green), warning (coral), info (lavender)
 */
export interface BadgeProps {
  label: string;
  status?: 'success' | 'warning' | 'info';
}

// ============================================================================
// CALENDAR COMPONENT (src/components/Calendar.tsx)
// ============================================================================

/**
 * Calendar
 * Interactive month calendar for scheduling
 * Features:
 * - Month navigation with chevron buttons
 * - 7-day grid view
 * - Selected date highlighted with lavender pill
 * - Today indicator (coral dot)
 * - Callback on date selection
 */
export interface CalendarProps {
  onDateSelect?: (date: Date) => void;
}

// ============================================================================
// SPECIALIZED CARDS (src/components/Cards.tsx)
// ============================================================================

/**
 * TrainerCard
 * Horizontal coach profile card
 * Features:
 * - Circular avatar (left-aligned)
 * - Name, age, and bio (2-3 lines truncated)
 * - Specialty chips/tags
 * Used on: Dashboard, Profile section
 */
export interface TrainerCardProps {
  name: string;
  age: number;
  bio: string;
  specialties: string[];
  avatar?: string;
}

/**
 * LessonCard
 * Video lesson card with progress tracking
 * Features:
 * - Thumbnail/emoji display
 * - Category label
 * - Progress bar (optional)
 * - Completion status overlay
 * - VOD badge
 * - Duration display
 */
export interface LessonCardProps {
  title: string;
  category: string;
  duration: string;
  thumbnail?: string;
  progress?: number;
  isVOD?: boolean;
  isCompleted?: boolean;
  onClick?: () => void;
}

/**
 * UpcomingSessionCard
 * Coaching session preview card
 * Features:
 * - Trainer name and datetime
 * - Session type (live/vod)
 * - Status badges (upcoming/in-progress/completed)
 * - Status icon indicator
 */
export interface UpcomingSessionProps {
  trainerName: string;
  date: string;
  time: string;
  type: 'live' | 'vod';
  status?: 'upcoming' | 'in-progress' | 'completed';
  onClick?: () => void;
}

// ============================================================================
// PAGES (src/components/)
// ============================================================================

/**
 * Dashboard
 * Main landing page after login
 * Sections:
 * 1. Header with welcome message
 * 2. Quick stats (4 stat cards in grid)
 * 3. Calendar + Training Cycle Metrics (2-column layout)
 * 4. Quick Actions (8 circular activity buttons)
 * 5. Trainer Profile Card
 * 6. Upcoming Sessions (3-column cards)
 * 7. Featured VOD Lessons (4+ lesson cards)
 * 8. Student Progress Summary (progress bars)
 * 9. CTA Footer
 */

/**
 * LessonsPage
 * VOD training library and course browser
 * Features:
 * 1. Header + Filter buttons (category filtering)
 * 2. Lesson statistics (total, completed, in-progress, not-started)
 * 3. Filterable lesson grid (auto-fill layout)
 * 4. Empty state if no results
 * 
 * Categories: All, Strength, Hypertrophy, Technique, Nutrition, Recovery
 * 8 sample lessons with different progress states
 */

// ============================================================================
// DESIGN SYSTEM (src/styles/theme.ts)
// ============================================================================

export const COLORS = {
  background: '#ECEFF3',
  white: '#FFFFFF',
  textPrimary: '#1C1C1E',
  textSecondary: '#8E8E93',
  lavender: '#D6C9FF',
  green: '#9BE15D',
  coral: '#FF8A80',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 22,
  circle: '50%',
};

export const SHADOWS = {
  subtle: '0px 8px 24px rgba(0, 0, 0, 0.06)',
  light: '0px 4px 12px rgba(0, 0, 0, 0.04)',
};

// ============================================================================
// RESPONSIVE BREAKPOINTS
// ============================================================================

// Mobile-first approach:
// Default styles: Mobile (<481px)
// Tablet: 481px - 768px
// Desktop: 768px+

// All grids use: gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
// This ensures responsive behavior without media queries

// ============================================================================
// CURRENT FEATURES IMPLEMENTED
// ============================================================================

// ✅ Dashboard
//   - Welcome header
//   - 4 quick stat cards
//   - Interactive calendar
//   - 3 circular progress indicators (training cycle)
//   - 8 quick action buttons
//   - Trainer profile card
//   - 3 upcoming sessions
//   - 4 featured lessons
//   - Student progress tracking
//   - CTA button

// ✅ Lessons Page
//   - Filter by category
//   - Lesson statistics
//   - Grid of 8 sample lessons
//   - Progress tracking per lesson
//   - Completion indicators
//   - VOD badges

// ✅ Base Components Library
//   - Card (base container)
//   - StatCard (metrics)
//   - CircularProgress (ring indicator)
//   - Button (primary/secondary/minimal)
//   - ActivityButton (circular shortcuts)
//   - Chip (tags/filters)
//   - Badge (status indicators)
//   - Calendar (month view)

// ============================================================================
// FUTURE ENHANCEMENT OPPORTUNITIES
// ============================================================================

// [ ] Authentication system
//   - Login/signup flow
//   - Student roster management
//   - Role-based views (student vs. trainer)

// [ ] Real-time features
//   - Live video player integration
//   - WebSocket for session notifications
//   - Real-time progress sync

// [ ] Database integration
//   - Firebase/Supabase backend
//   - Student progress persistence
//   - VOD metadata storage

// [ ] Student tracking features
//   - Homework assignments
//   - Performance metrics
//   - Achievement badges
//   - Messaging system

// [ ] Video functionality
//   - HLS video streaming
//   - Watch history
//   - Playback speed controls
//   - Chapter markers

// [ ] Analytics dashboard
//   - Student engagement metrics
//   - Course completion rates
//   - Revenue tracking
//   - Performance insights

// [ ] Payment integration
//   - Stripe integration
//   - Subscription management
//   - Invoice generation

// [ ] Mobile app
//   - React Native version
//   - Offline lesson access
//   - Push notifications
//   - Download for offline viewing

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Switch between Dashboard and Lessons Page
 * 
 * // In src/App.tsx
 * import { Dashboard } from './components/Dashboard';
 * import { LessonsPage } from './components/LessonsPage';
 * 
 * export default function App() {
 *   const [page, setPage] = useState('dashboard'); // or 'lessons'
 *   
 *   return (
 *     <>
 *       {page === 'dashboard' && <Dashboard />}
 *       {page === 'lessons' && <LessonsPage />}
 *     </>
 *   );
 * }
 */

/**
 * Building a custom page with the design system
 * 
 * import { COLORS, SPACING, TYPOGRAPHY } from './styles/theme';
 * import { Card, Button } from './components/BaseComponents';
 * 
 * export function CustomPage() {
 *   return (
 *     <div style={{ backgroundColor: COLORS.background, padding: SPACING.lg }}>
 *       <h1 style={TYPOGRAPHY.h1}>My Custom Page</h1>
 *       <Card padding={SPACING.lg}>
 *         <p style={TYPOGRAPHY.body}>Content goes here</p>
 *         <Button>Click me</Button>
 *       </Card>
 *     </div>
 *   );
 * }
 */
