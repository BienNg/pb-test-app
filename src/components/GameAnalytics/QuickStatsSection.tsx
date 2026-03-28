import React from 'react';
import { COLORS } from '../../styles/theme';
import { IconChevronRight } from '../Icons';
import { ROADMAP_SKILLS } from '../../data/roadmapSkills';

interface QuickStatsSectionProps {
  sessionCount: number;
  shotVideoCountByShotId: Record<string, number>;
  onOpenRoadmap?: () => void;
  onOpenShotDetail?: (shotTitle: string) => void;
}

export function QuickStatsSection({
  sessionCount,
  shotVideoCountByShotId,
  onOpenRoadmap,
  onOpenShotDetail,
}: QuickStatsSectionProps) {
  const mostTrained = Object.entries(shotVideoCountByShotId).sort((a, b) => b[1] - a[1])[0];
  const mostTrainedSkill = mostTrained ? ROADMAP_SKILLS.find((s) => s.id === mostTrained[0]) : null;
  const mostTrainedTitle = mostTrainedSkill?.title ?? '—';
  const canOpenShotDetail = Boolean(onOpenShotDetail && mostTrainedSkill);
  const totalShotsAnalyzed = Object.values(shotVideoCountByShotId).reduce((a, b) => a + b, 0);

  return (
    <section
      data-purpose="quick-stats"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        padding: '0 12px',
        marginTop: -24,
        marginBottom: 24,
      }}
    >
      {/* Games Analyzed */}
      <div style={statCardStyle}>
        <span style={statLabelStyle}>Games Analyzed</span>
        <span style={statValueStyle}>{sessionCount}</span>
      </div>

      {/* Shots Analyzed */}
      <button
        type="button"
        onClick={() => onOpenRoadmap?.()}
        style={{
          ...statCardStyle,
          position: 'relative',
          cursor: onOpenRoadmap ? 'pointer' : 'default',
          width: '100%',
        }}
      >
        <span style={statLabelStyle}>Shots Analyzed</span>
        <span style={statValueStyle}>{totalShotsAnalyzed}</span>
        {onOpenRoadmap && (
          <span style={chevronStyle}>
            <IconChevronRight size={14} style={{ color: COLORS.brandDark }} />
          </span>
        )}
      </button>

      {/* Most Trained Shot */}
      <button
        type="button"
        onClick={() => canOpenShotDetail && onOpenShotDetail?.(mostTrainedTitle)}
        style={{
          ...statCardStyle,
          position: 'relative',
          cursor: canOpenShotDetail ? 'pointer' : 'default',
          width: '100%',
        }}
      >
        <span style={statLabelStyle}>Most trained shot</span>
        <span
          style={{
            display: 'block',
            width: '100%',
            minWidth: 0,
            fontSize: 14,
            fontWeight: 700,
            color: COLORS.brandDark,
            lineHeight: 1.2,
            wordBreak: 'break-word',
            textAlign: 'center',
          }}
        >
          {mostTrainedTitle}
        </span>
        {canOpenShotDetail && (
          <span style={chevronStyle}>
            <IconChevronRight size={14} style={{ color: COLORS.brandDark }} />
          </span>
        )}
      </button>
    </section>
  );
}

const statCardStyle: React.CSSProperties = {
  minHeight: 90,
  minWidth: 0,
  backgroundColor: COLORS.white,
  border: '1px solid #E8F1EE',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  borderRadius: 16,
  padding: 12,
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  boxSizing: 'border-box',
};

const statLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#9ca3af',
  marginBottom: 4,
};

const statValueStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 18,
  fontWeight: 700,
  color: COLORS.brandDark,
};

const chevronStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 12,
  right: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
