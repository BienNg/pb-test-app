/**
 * Premium, minimal icon components using Lucide.
 * Consistent sizing and stroke for a polished look.
 */
import React from 'react';
import {
  Check,
  Clock,
  Users,
  User,
  Calendar,
  CalendarDays,
  MapPin,
  Play,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  BarChart3,
  LayoutGrid,
  Trophy,
  Circle,
  Target,
  Brain,
  Footprints,
} from 'lucide-react';

const iconSize = 20;
const stroke = 1.75;

interface IconWrapperProps {
  children: React.ReactNode;
  size?: number;
  style?: React.CSSProperties;
}

const IconWrapper: React.FC<IconWrapperProps> = ({ children, size = iconSize, style }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, flexShrink: 0, ...style }}>
    {children}
  </span>
);

export const IconCheck: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <Check size={size} strokeWidth={stroke} />
  </IconWrapper>
);

export const IconClock: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <Clock size={size} strokeWidth={stroke} />
  </IconWrapper>
);

export const IconUsers: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <Users size={size} strokeWidth={stroke} />
  </IconWrapper>
);

export const IconUser: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <User size={size} strokeWidth={stroke} />
  </IconWrapper>
);

export const IconCalendar: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <Calendar size={size} strokeWidth={stroke} />
  </IconWrapper>
);

export const IconCalendarDays: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <CalendarDays size={size} strokeWidth={stroke} />
  </IconWrapper>
);

export const IconMapPin: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <MapPin size={size} strokeWidth={stroke} />
  </IconWrapper>
);

export const IconPlay: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <Play size={size} strokeWidth={stroke} fill="currentColor" />
  </IconWrapper>
);

export const IconChevronRight: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <ChevronRight size={size} strokeWidth={stroke} />
  </IconWrapper>
);

export const IconChevronLeft: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <ChevronLeft size={size} strokeWidth={stroke} />
  </IconWrapper>
);

export const IconGraduationCap: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <GraduationCap size={size} strokeWidth={stroke} />
  </IconWrapper>
);

export const IconBarChart: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <BarChart3 size={size} strokeWidth={stroke} />
  </IconWrapper>
);

export const IconLayoutGrid: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <LayoutGrid size={size} strokeWidth={stroke} />
  </IconWrapper>
);

export const IconTrophy: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <Trophy size={size} strokeWidth={stroke} />
  </IconWrapper>
);

export const IconCircle: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <Circle size={size} strokeWidth={stroke} />
  </IconWrapper>
);

export const IconTarget: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <Target size={size} strokeWidth={stroke} />
  </IconWrapper>
);

export const IconBrain: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <Brain size={size} strokeWidth={stroke} />
  </IconWrapper>
);

export const IconFootprints: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = iconSize, style }) => (
  <IconWrapper size={size} style={style}>
    <Footprints size={size} strokeWidth={stroke} />
  </IconWrapper>
);
