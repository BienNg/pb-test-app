/**
 * Coach tier levels with corresponding hourly rates.
 * Students can choose their coach based on tier, experience, and budget.
 */
export type CoachTier = 'Associate Coach' | 'Senior Coach' | 'Elite Coach';

/** Hourly rate by tier (USD) */
export const TIER_HOURLY_RATES: Record<CoachTier, number> = {
  'Associate Coach': 45,
  'Senior Coach': 70,
  'Elite Coach': 110,
};

export interface CoachInfo {
  id: string;
  name: string;
  email: string;
  tier: CoachTier;
  /** Hourly rate in USD */
  hourlyRate: number;
  bio?: string;
  specialties?: string[];
  studentCount: number;
  sessionCount: number;
  lastActive?: string;
  /** Profile picture path relative to src/assets */
  profilePicture?: string;
}

export const MOCK_COACHES: CoachInfo[] = [
  // Associate Coaches - $45/hr
  {
    id: 'c1',
    name: 'Sarah Martinez',
    email: 'sarah@pbacademy.com',
    tier: 'Associate Coach',
    hourlyRate: 45,
    bio: 'Certified pickleball instructor with 2+ years of coaching experience.',
    specialties: ['Beginner fundamentals', 'Technique basics'],
    studentCount: 5,
    sessionCount: 15,
    lastActive: 'Feb 6, 2026',
  },
  {
    id: 'c2',
    name: 'Mike Johnson',
    email: 'mike@pbacademy.com',
    tier: 'Associate Coach',
    hourlyRate: 45,
    bio: 'Former tennis player turned pickleball enthusiast. Great for new players.',
    specialties: ['Doubles strategy', 'Footwork'],
    studentCount: 3,
    sessionCount: 8,
    lastActive: 'Feb 5, 2026',
  },
  {
    id: 'c3',
    name: 'Emma Wilson',
    email: 'emma@pbacademy.com',
    tier: 'Associate Coach',
    hourlyRate: 45,
    bio: 'Patient and thorough — ideal for building strong foundations.',
    specialties: ['Serve mechanics', 'Kitchen play'],
    studentCount: 4,
    sessionCount: 12,
    lastActive: 'Feb 4, 2026',
  },
  // Senior Coaches - $70/hr
  {
    id: 'c4',
    name: 'David Chen',
    email: 'david@pbacademy.com',
    tier: 'Senior Coach',
    hourlyRate: 70,
    bio: '5+ years coaching. Tournament veteran with regional rankings.',
    specialties: ['Advanced technique', 'Tournament prep'],
    studentCount: 8,
    sessionCount: 22,
    lastActive: 'Feb 6, 2026',
  },
  {
    id: 'c5',
    name: 'Jessica Park',
    email: 'jessica@pbacademy.com',
    tier: 'Senior Coach',
    hourlyRate: 70,
    bio: 'USAPA-certified. Specializes in competitive play and mental game.',
    specialties: ['Strategy', 'Mental toughness'],
    studentCount: 6,
    sessionCount: 18,
    lastActive: 'Feb 5, 2026',
  },
  {
    id: 'c6',
    name: 'Marcus Thompson',
    email: 'marcus@pbacademy.com',
    tier: 'Senior Coach',
    hourlyRate: 70,
    bio: 'Pro-level player. Focus on power play and aggressive positioning.',
    specialties: ['Power shots', 'Third-shot drops'],
    studentCount: 7,
    sessionCount: 20,
    lastActive: 'Feb 4, 2026',
  },
  // Elite Coaches - $110/hr
  {
    id: 'c7',
    name: 'Alexandra Rivera',
    email: 'alexandra@pbacademy.com',
    tier: 'Elite Coach',
    hourlyRate: 110,
    bio: 'National champion. 10+ years coaching elite athletes.',
    specialties: ['High-level technique', 'Pro-style play'],
    studentCount: 4,
    sessionCount: 14,
    lastActive: 'Feb 6, 2026',
  },
  {
    id: 'c8',
    name: 'Ryan Foster',
    email: 'ryan@pbacademy.com',
    tier: 'Elite Coach',
    hourlyRate: 110,
    bio: 'Former professional. Personalized coaching for serious competitors.',
    specialties: ['Tournament strategy', 'Doubles partnerships'],
    studentCount: 3,
    sessionCount: 10,
    lastActive: 'Feb 5, 2026',
  },
  {
    id: 'c9',
    name: 'Nina Patel',
    email: 'nina@pbacademy.com',
    tier: 'Elite Coach',
    hourlyRate: 110,
    bio: 'Olympic training background. Top-tier technical and tactical coaching.',
    specialties: ['Elite conditioning', 'Game analysis'],
    studentCount: 5,
    sessionCount: 16,
    lastActive: 'Feb 4, 2026',
  },
  // Senior Coach with profile picture
  {
    id: 'c10',
    name: 'James Kim',
    email: 'james@pbacademy.com',
    tier: 'Senior Coach',
    hourlyRate: 70,
    bio: 'USAPA-certified coach with 6+ years of experience. Specializes in technique refinement and competitive strategy.',
    specialties: ['Advanced dinking', 'Third-shot strategy', 'Tournament play'],
    studentCount: 9,
    sessionCount: 25,
    lastActive: 'Feb 7, 2026',
    profilePicture: 'coach-profile-pictures/3b1cfb78-b2ba-4cc5-a57a-42f9247304c9.png',
  },
];
