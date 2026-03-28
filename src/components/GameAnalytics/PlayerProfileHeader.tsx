import React from 'react';
import { COLORS } from '../../styles/theme';
import { IconUser } from '../Icons';

interface PlayerProfileHeaderProps {
  welcomeName: string;
  /** Pre-resolved avatar URL string (undefined = show fallback icon). */
  avatarUrl?: string;
  /** Slot rendered top-right (e.g. <ProfileMenuButton />). */
  settingsSlot?: React.ReactNode;
}

export function PlayerProfileHeader({ welcomeName, avatarUrl, settingsSlot }: PlayerProfileHeaderProps) {
  return (
    <header
      data-purpose="game-analytics-header"
      style={{
        backgroundColor: COLORS.brandLight,
        margin: '-24px -24px 0',
        paddingTop: 48,
        paddingBottom: 32,
        paddingLeft: 24,
        paddingRight: 24,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#1f2937',
            lineHeight: 1.2,
            textAlign: 'center',
          }}
        >
          Player Profile
        </h2>
        {settingsSlot && (
          <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
            {settingsSlot}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              border: '4px solid white',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLORS.white,
            }}
          >
            {avatarUrl ? (
              <img
                alt="Profile"
                src={avatarUrl}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <IconUser size={40} style={{ color: COLORS.brandDark }} />
            )}
          </div>
        </div>
        <p
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: COLORS.brandDark,
            opacity: 0.8,
            margin: 0,
          }}
        >
          {welcomeName}
        </p>
      </div>
    </header>
  );
}
