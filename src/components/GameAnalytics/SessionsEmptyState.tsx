import React from 'react';
import { COLORS, TYPOGRAPHY } from '../../styles/theme';

const SAGE_PRIMARY = '#8FB9A8';

interface SessionsEmptyStateProps {
  isAdminView: boolean;
  onOpenLibrary?: () => void;
}

export function SessionsEmptyState({ isAdminView, onOpenLibrary }: SessionsEmptyStateProps) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        textAlign: 'center',
        minHeight: 320,
      }}
    >
      {/* Illustration: court card with ball */}
      <div
        style={{
          position: 'relative',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 192,
            height: 192,
            borderRadius: '50%',
            backgroundColor: `${SAGE_PRIMARY}1A`,
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: 160,
            height: 160,
            backgroundColor: COLORS.white,
            borderRadius: 16,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: `1px solid ${COLORS.textMuted}40`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: SAGE_PRIMARY,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                bottom: 0,
                width: 1,
                backgroundColor: SAGE_PRIMARY,
              }}
            />
          </div>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: `${SAGE_PRIMARY}33`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke={SAGE_PRIMARY}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="8" />
              <path d="M12 4a8 8 0 0 1 0 16 8 8 0 0 1 0-16" />
            </svg>
          </div>
          <div
            style={{
              width: 48,
              height: 8,
              backgroundColor: `${SAGE_PRIMARY}4D`,
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      <div style={{ maxWidth: 320, marginBottom: 40 }}>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: COLORS.textPrimary,
            margin: '0 0 12px',
          }}
        >
          No sessions yet
        </h2>
        <p
          style={{
            ...TYPOGRAPHY.bodySmall,
            color: COLORS.textSecondary,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Book your first session and wait for the Academy to upload your recording. In the
          meantime watch our Video Lessons to improve your skills.
        </p>
      </div>

      {!isAdminView && (
        <button
          type="button"
          onClick={() => onOpenLibrary?.()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            maxWidth: 240,
            height: 56,
            padding: '0 24px',
            backgroundColor: SAGE_PRIMARY,
            color: COLORS.white,
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            boxShadow: `0 10px 15px -3px ${SAGE_PRIMARY}33`,
            cursor: onOpenLibrary ? 'pointer' : 'default',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseDown={(e) => onOpenLibrary && (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = '')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span>Watch Video Lessons</span>
        </button>
      )}
    </div>
  );
}
