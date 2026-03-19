'use client';

import React from 'react';
import { COLORS } from '../styles/theme';

const PRIMARY = '#3f6758';
const PRIMARY_CONTAINER = '#c0ecda';
const SECONDARY_CONTAINER = '#cee9dc';
const SURFACE = '#f6faf6';
const ON_SURFACE = '#2b3530';
const ON_SURFACE_VARIANT = '#57615c';

/** Pickleball/tennis icon - minimalist ball with curved seam */
function PickleballIcon({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={PRIMARY}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16 8 8 0 0 1 0-16" />
    </svg>
  );
}

/**
 * Full-screen loading state for the Player Profile / Game Analytics screen.
 * Matches the "Living Sanctuary" design: rotating ring, pickleball icon,
 * soft background blurs, and contextual messaging.
 */
export function PlayerProfileLoadingScreen() {
  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        overflow: 'hidden',
        backgroundColor: SURFACE,
        fontFamily: "'Lexend', sans-serif",
        color: ON_SURFACE,
      }}
    >
      {/* Abstract background elements */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: 384,
          height: 384,
          backgroundColor: `${PRIMARY_CONTAINER}33`,
          filter: 'blur(120px)',
          borderRadius: '50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-5%',
          left: '-5%',
          width: 320,
          height: 320,
          backgroundColor: `${SECONDARY_CONTAINER}4D`,
          filter: 'blur(100px)',
          borderRadius: '50%',
        }}
      />

      {/* Central loading anchor */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        {/* Icon composition */}
        <div
          style={{
            position: 'relative',
            marginBottom: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Circular track */}
          <div
            style={{
              position: 'absolute',
              width: 192,
              height: 192,
              border: `1px solid ${PRIMARY}0D`,
              borderRadius: '50%',
            }}
          />
          {/* Rotating loading ring */}
          <div
            style={{
              position: 'absolute',
              width: 160,
              height: 160,
              borderTop: `2px solid ${PRIMARY}66`,
              borderRight: `2px solid ${PRIMARY}1A`,
              borderBottom: '2px solid transparent',
              borderLeft: '2px solid transparent',
              borderRadius: '50%',
              animation: 'loading-slow-rotate 8s linear infinite',
            }}
          />
          {/* Minimalist pickleball visual */}
          <div
            style={{
              position: 'relative',
              width: 128,
              height: 128,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.white,
              borderRadius: '50%',
              boxShadow: '0 10px 40px rgba(43, 53, 48, 0.06)',
              animation: 'loading-soft-pulse 3s ease-in-out infinite',
            }}
          >
            <PickleballIcon size={60} />
            {/* Decorative holes (pickleball detail) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: `${PRIMARY}33`,
                  borderRadius: '50%',
                  position: 'absolute',
                  top: 32,
                  left: 48,
                }}
              />
              <div
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: `${PRIMARY}33`,
                  borderRadius: '50%',
                  position: 'absolute',
                  bottom: 32,
                  right: 48,
                }}
              />
              <div
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: `${PRIMARY}33`,
                  borderRadius: '50%',
                  position: 'absolute',
                  top: 56,
                  right: 40,
                }}
              />
              <div
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: `${PRIMARY}33`,
                  borderRadius: '50%',
                  position: 'absolute',
                  bottom: 56,
                  left: 40,
                }}
              />
            </div>
          </div>
        </div>

        {/* Content hierarchy */}
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <h1
            style={{
              fontFamily: "'Lexend', sans-serif",
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: ON_SURFACE,
              margin: '0 0 12px',
            }}
          >
            Sanctuary
          </h1>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <p
              style={{
                color: ON_SURFACE_VARIANT,
                fontWeight: 500,
                letterSpacing: '0.02em',
                fontSize: 14,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              Prepping your court...
            </p>
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginTop: 16,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: PRIMARY,
                  borderRadius: '50%',
                  opacity: 1,
                }}
              />
              <span
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: PRIMARY,
                  borderRadius: '50%',
                  opacity: 0.4,
                }}
              />
              <span
                style={{
                  width: 6,
                  height: 6,
                  backgroundColor: PRIMARY,
                  borderRadius: '50%',
                  opacity: 0.1,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Branding signature footer */}
      <footer
        style={{
          position: 'fixed',
          bottom: 48,
          left: 0,
          right: 0,
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        <p
          style={{
            fontFamily: "'Lexend', sans-serif",
            fontSize: 11,
            color: `${ON_SURFACE_VARIANT}99`,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          Analyzing your swing
        </p>
      </footer>
    </main>
  );
}
