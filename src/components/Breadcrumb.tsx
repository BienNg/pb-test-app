/**
 * Reusable breadcrumb bar: optional back button + nav segments with "/" separator.
 * Matches the Shot Detail / Roadmap header style across the app.
 */
import React from 'react';
import { COLORS, SPACING } from '../styles/theme';
import { IconArrowLeft } from './Icons';

const BREADCRUMB_BORDER = 'rgba(143, 185, 168, 0.1)';
const BREADCRUMB_BG = '#f6f8f8';
const BREADCRUMB_LINK_COLOR = '#6a9a95';
const BREADCRUMB_SEPARATOR_COLOR = '#94a3b8';

export interface BreadcrumbItem {
  /** Segment label (e.g. "Your Roadmap", "Forehand Dink") */
  label: string;
  /** When set, segment is clickable and uses link styling; when omitted, segment is current page (bold, primary color) */
  onClick?: () => void;
}

export interface BreadcrumbProps {
  /** Segments in order; last item without onClick is rendered as current page */
  items: BreadcrumbItem[];
  /** When provided, shows a back button that calls this (e.g. return to previous view) */
  onBack?: () => void;
  /** Optional override for the outer bar container style (e.g. different background on session detail) */
  containerStyle?: React.CSSProperties;
  /** Accessibility label for the nav element */
  ariaLabel?: string;
  /** When 'centered', the nav takes flex:1 and content is centered (e.g. session detail header with right icon) */
  variant?: 'default' | 'centered';
  /** Optional node rendered after the nav (e.g. header actions) */
  rightSlot?: React.ReactNode;
  /** Optional font size override for breadcrumb text (default 17) */
  fontSize?: number;
}

export function Breadcrumb({
  items,
  onBack,
  containerStyle,
  ariaLabel = 'Breadcrumb',
  variant = 'default',
  rightSlot,
  fontSize = 17,
}: BreadcrumbProps) {
  const defaultContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    padding: 0,
    flexShrink: 0,
    borderBottom: `1px solid ${BREADCRUMB_BORDER}`,
    backgroundColor: BREADCRUMB_BG,
    height: 'fit-content',
  };

  const isCentered = variant === 'centered';
  const navStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    overflow: 'hidden',
    ...(isCentered
      ? { flex: 1, justifyContent: 'center' }
      : rightSlot != null
        ? { flex: 1 }
        : onBack == null
          ? { flex: 1 }
          : {}),
  };

  return (
    <div
      style={{
        ...defaultContainerStyle,
        ...containerStyle,
      }}
    >
      {onBack != null && (
        <button
          type="button"
          onClick={onBack}
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: 'none',
            background: 'none',
            color: '#475569',
            cursor: 'pointer',
          }}
          aria-label="Back"
        >
          <IconArrowLeft size={22} />
        </button>
      )}
      <nav aria-label={ariaLabel} style={navStyle}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isCurrent = isLast && item.onClick == null;
          const showSeparator = index > 0;

          return (
            <React.Fragment key={index}>
              {showSeparator && (
                <span
                  style={{
                    fontSize,
                    color: BREADCRUMB_SEPARATOR_COLOR,
                    flexShrink: 0,
                  }}
                  aria-hidden
                >
                  /
                </span>
              )}
              {item.onClick != null ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  style={{
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    fontSize,
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    color: BREADCRUMB_LINK_COLOR,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: onBack != null ? '50vw' : undefined,
                  }}
                >
                  {item.label}
                </button>
              ) : (
                <span
                  style={{
                    fontSize,
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                    color: isCurrent ? COLORS.textPrimary : BREADCRUMB_LINK_COLOR,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  {...(isCurrent ? { 'aria-current': 'page' as const } : {})}
                >
                  {item.label}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </nav>
      {rightSlot}
    </div>
  );
}
