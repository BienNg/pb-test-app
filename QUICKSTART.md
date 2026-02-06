# 🚀 PB Academy App - Quick Start Guide

## Getting Started (60 seconds)

### 1️⃣ Start Development Server
```bash
npm install  # (First time only)
npm run dev
```

Open your browser to: **http://localhost:5173**

### 2️⃣ What You'll See
- **Dashboard**: Main landing page with all key features
- Complete design system applied to every component
- Interactive calendar, progress indicators, and lesson cards
- Mobile-responsive layout

### 3️⃣ Key Features to Explore
- 📊 Quick stats cards showing training metrics
- 📅 Interactive calendar for scheduling
- 🎯 Training cycle progress with circular indicators
- ⚡ Quick action buttons for common tasks
- 👥 Trainer profile with specialties
- 🎬 Featured VOD lessons with progress tracking
- 📈 Student progress monitoring
- 📚 Complete lessons library with filtering

## 📦 Project Structure

```
src/
├── components/
│   ├── BaseComponents.tsx     ← Core UI widgets
│   ├── Calendar.tsx           ← Interactive calendar
│   ├── Cards.tsx              ← Specialized card components
│   ├── Dashboard.tsx          ← Main page
│   ├── LessonsPage.tsx        ← VOD library page
│   └── index.ts               ← Exports all components
│
├── styles/
│   ├── theme.ts               ← Design system (colors, spacing, etc.)
│   └── globals.ts             ← Global CSS
│
└── App.tsx                    ← Main app entry

```

## 🎨 Design System Quick Reference

### Colors (from your specs)
```typescript
import { COLORS } from './styles/theme';

COLORS.background    // #ECEFF3 (light gray)
COLORS.white         // #FFFFFF (card background)
COLORS.lavender      // #D6C9FF (primary accent)
COLORS.green         // #9BE15D (success)
COLORS.coral         // #FF8A80 (warning)
COLORS.textPrimary   // #1C1C1E (text)
COLORS.textSecondary // #8E8E93 (muted)
```

### Spacing (all in pixels)
```typescript
import { SPACING } from './styles/theme';

SPACING.xs   // 4px
SPACING.sm   // 8px
SPACING.md   // 12px
SPACING.lg   // 16px
SPACING.xl   // 20px
SPACING.xxl  // 24px
```

### Using the Theme
```tsx
<div style={{ 
  backgroundColor: COLORS.background, 
  padding: SPACING.lg,
  borderRadius: RADIUS.full 
}}>
  Content here
</div>
```

## 🧩 Core Components

### StatCard - Metrics Display
```tsx
<StatCard
  title="Lessons Completed"
  value="24"
  unit="of 30"
  icon="✓"
/>
```

### CircularProgress - Ring Indicators
```tsx
<CircularProgress
  percentage={60}
  value="6"
  label="Days In"
  color={COLORS.coral}
  size={140}
/>
```

### LessonCard - Video Content
```tsx
<LessonCard
  title="Bench Press Guide"
  category="Strength"
  duration="24:30"
  progress={75}
  isVOD
/>
```

### Calendar - Date Picker
```tsx
<Calendar 
  onDateSelect={(date) => console.log(date)}
/>
```

### Button - CTAs
```tsx
<Button variant="primary" size="lg">
  Start Session
</Button>
```

## 🔧 Common Tasks

### Switching Pages
Currently showing Dashboard. To show LessonsPage instead:

```tsx
// In App.tsx
import { LessonsPage } from './components';

export default function App() {
  return <LessonsPage />;
}
```

### Adding a New Card
```tsx
import { Card } from './components/BaseComponents';
import { COLORS, SPACING } from './styles/theme';

function MyCard() {
  return (
    <Card padding={SPACING.lg}>
      <h2>My Content</h2>
    </Card>
  );
}
```

### Creating a Responsive Grid
```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: SPACING.lg,
}}>
  {items.map(item => <Item key={item.id} {...item} />)}
</div>
```

### Using Typography
```tsx
import { TYPOGRAPHY } from './styles/theme';

<h1 style={TYPOGRAPHY.h1}>Main Title</h1>
<p style={TYPOGRAPHY.body}>Body text</p>
<span style={TYPOGRAPHY.label}>Label text</span>
```

## 📱 Responsive Design

The app is **mobile-first** and uses CSS Grid with `auto-fit`:

```tsx
gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
```

This means:
- **Mobile** (<481px): 1 column automatically
- **Tablet** (481-768px): 2-3 columns automatically  
- **Desktop** (769px+): 4+ columns automatically

No media queries needed!

## 🏗️ Build Commands

```bash
npm run dev      # Start dev server (hot reload)
npm run build    # Create production build
npm run preview  # Preview production build locally
npm lint         # Check code quality
```

## 🎯 Feature Roadmap

### Phase 1 (Current) ✅
- ✅ Dashboard with metrics
- ✅ Interactive calendar
- ✅ Trainer profile
- ✅ VOD lessons library
- ✅ Progress tracking
- ✅ Responsive design

### Phase 2 (Soon)
- [ ] Authentication
- [ ] Real-time video streaming
- [ ] Student messaging
- [ ] Homework assignments
- [ ] Performance analytics

### Phase 3 (Future)
- [ ] Mobile app (React Native)
- [ ] Payment integration
- [ ] Advanced analytics
- [ ] Notifications

## 💡 Pro Tips

1. **Colors**: Always use `COLORS` object, not hex codes directly
2. **Spacing**: Use `SPACING` for all padding/margins
3. **Consistency**: Use existing components before creating new ones
4. **Responsive**: Use `auto-fit` grid for automatic responsive behavior
5. **Reusable**: Split complex components into smaller, reusable pieces

## 🚀 Deploy to Production

The app is ready to deploy to any static hosting:

```bash
npm run build
# Upload dist/ folder to:
# - Vercel
# - Netlify
# - GitHub Pages
# - Firebase Hosting
# - Your own server
```

## 📚 Learn More

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vite.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🤝 Need Help?

Check these files:
- `src/components/Dashboard.tsx` - See how to build a full page
- `src/components/LessonsPage.tsx` - See filtering and pagination
- `src/styles/theme.ts` - All design tokens in one place
- `COMPONENT_DOCS.md` - Detailed component documentation

---

**Happy coding! 🎉**
