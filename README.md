# PB Academy Mobile Training App

A modern, mobile-first web application for the PB Academy that enables coaches to track coaching lessons, manage VOD training content, and monitor student progress. Built with React, TypeScript, and Vite for optimal performance and rapid development.

## 🎯 Features

### Dashboard
- **Quick Stats Cards**: Track lessons completed, training hours, session ratings, and active students
- **Calendar Component**: Interactive month/week view for scheduling lessons
- **Training Cycle Metrics**: Circular progress indicators for current training phase
- **Quick Actions**: Fast access to common trainer tasks
- **Trainer Profile**: Display coach credentials and specialties
- **Upcoming Sessions**: View scheduled live coaching and VOD sessions
- **Student Progress**: Monitor individual student completion rates
- **Featured Lessons**: Showcase top VOD training content

### VOD Training Library
- **Lesson Browsing**: Grid view of all training videos
- **Category Filtering**: Filter lessons by strength, hypertrophy, technique, nutrition, and recovery
- **Progress Tracking**: Individual progress bars for each lesson
- **Completion Status**: Visual indicators for completed lessons
- **Lesson Analytics**: Stats showing total, completed, in-progress, and not-started lessons

### Component System
- **Reusable UI Components**: Fully typed React components for rapid development
- **Design System**: Consistent spacing, colors, typography, and shadows
- **Responsive Grid**: Auto-fitting layouts for mobile, tablet, and desktop
- **Micro-interactions**: Subtle animations and tap feedback

## 🎨 Design System

### Color Palette
- **Background**: `#ECEFF3` (light gray canvas)
- **Card White**: `#FFFFFF`
- **Primary Text**: `#1C1C1E`
- **Secondary Text**: `#8E8E93`
- **Accents**: 
  - Lavender: `#D6C9FF`
  - Green: `#9BE15D`
  - Coral: `#FF8A80`

### Key Design Features
- **Card-Based Layout**: 2-column responsive grid with 16-20px gutter
- **Subtle Shadows**: `0px 8px 24px rgba(0,0,0,0.06)`
- **Rounded Corners**: 20-24px border radius for cards
- **Circular Progress**: Stroke-based progress indicators with smooth animations
- **Mobile First**: Optimized for all screen sizes starting from mobile

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm lint
```

The app will be available at `http://localhost:5173` (default Vite port).

## 📁 Project Structure

```
src/
├── components/
│   ├── BaseComponents.tsx    # Core UI components (Card, StatCard, etc.)
│   ├── Calendar.tsx          # Interactive calendar component
│   ├── Cards.tsx             # Specialized cards (Trainer, Lesson, Session)
│   ├── Dashboard.tsx         # Main dashboard page
│   ├── LessonsPage.tsx       # VOD lessons library page
│   └── index.ts              # Component exports
├── styles/
│   ├── theme.ts              # Design tokens and theme
│   └── globals.ts            # Global CSS styles
├── App.tsx                   # Main app component
├── App.css                   # App-level styles
├── main.tsx                  # React entry point
└── index.css                 # Base styles
```

## 🎮 Core Components

### StatCard
Displays a key metric with title, value, unit, and icon.

```tsx
<StatCard
  title="Lessons Completed"
  value="24"
  unit="of 30"
  icon="✓"
  accentColor={COLORS.green}
/>
```

### CircularProgress
Animated circular progress indicator.

```tsx
<CircularProgress
  percentage={60}
  value="6"
  label="Days In"
  color={COLORS.coral}
  size={140}
/>
```

### LessonCard
Video lesson card with progress tracking.

```tsx
<LessonCard
  title="Complete Bench Press Guide"
  category="Strength"
  duration="24:30"
  progress={75}
  isVOD
/>
```

### TrainerCard
Coach profile card with specialties.

```tsx
<TrainerCard
  name="Joshua Thompson"
  age={34}
  bio="Certified powerbuilding coach..."
  specialties={['Strength Training', 'Hypertrophy']}
  avatar="👨‍🏫"
/>
```

### Calendar
Interactive month calendar for scheduling.

```tsx
<Calendar onDateSelect={(date) => console.log(date)} />
```

## 📱 Responsive Design

The app is fully responsive using CSS Grid with auto-fit columns:

- **Mobile (<481px)**: Single column layout
- **Tablet (481-768px)**: 2-column layout
- **Desktop (>768px)**: 3+ column layout

All components automatically adapt based on available space.

## ⚡ Performance

- **Vite**: Ultra-fast build tool with instant HMR
- **React 19**: Latest features and performance improvements
- **TypeScript**: Full type safety
- **CSS-in-JS**: Inline styles with zero runtime overhead

## 🎯 Quick Start - Development

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open http://localhost:5173 in your browser
```

## 🔧 Development Guidelines

### Adding New Components
1. Create in `src/components/[Component].tsx`
2. Use design tokens from `src/styles/theme.ts`
3. Export from `src/components/index.ts`

### Using the Theme System
```tsx
import { COLORS, SPACING, TYPOGRAPHY } from '../styles/theme';

const MyComponent = () => (
  <div style={{ backgroundColor: COLORS.background, padding: SPACING.lg }}>
    <h1 style={TYPOGRAPHY.h1}>Title</h1>
  </div>
);
```

## 📦 Build for Production

```bash
npm run build
```

The optimized build is in the `dist/` folder, ready for deployment.

## 🌐 Deployment

Deploy to any static hosting:
- Vercel
- Netlify  
- GitHub Pages
- AWS S3 + CloudFront
- Firebase Hosting

Just upload the `dist/` folder.

## 📝 Notes

- All measurements use the spacing scale in `theme.ts` for consistency
- Colors use the predefined palette only
- All text uses the typography system
- Components use semantic spacing (sm, md, lg, xl, xxl)

## 📄 License

Created for PB Academy Training Platform
