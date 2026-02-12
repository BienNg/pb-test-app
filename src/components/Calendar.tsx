import React, { useState } from 'react';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../styles/theme';
import { Card } from './BaseComponents';
import { IconChevronLeft, IconChevronRight } from './Icons';

export interface DayDots {
  /** Number of confirmed lessons (shown as green dots) */
  confirmed: number;
  /** Number of requested but not confirmed lessons (shown as grey dots) */
  requested: number;
}

interface CalendarProps {
  onDateSelect?: (date: Date) => void;
  /**
   * Optional list of active dates in 'YYYY-MM-DD' format.
   * When provided, only these dates are highlighted and clickable.
   */
  activeDateKeys?: string[];
  /**
   * Optional per-date dot counts for coach calendar.
   * Key = dateKey (YYYY-MM-DD). Each day can show green (confirmed) and grey (requested) dots.
   */
  dayDots?: Record<string, DayDots>;
}

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

export const Calendar: React.FC<CalendarProps> = ({ onDateSelect, activeDateKeys: _activeDateKeys = [], dayDots }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayInitials = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Days of month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const isDateSelected = (date: Date | null) => {
    if (!date) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    return date.toDateString() === new Date().toDateString();
  };

  return (
    <Card style={{ width: '100%', minWidth: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
      {/* Month Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
      }}>
        <button
          onClick={handlePrevMonth}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: RADIUS.circle,
            backgroundColor: COLORS.iconBg,
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconChevronLeft size={18} />
        </button>
        <h2 style={{
          ...TYPOGRAPHY.h3,
          color: COLORS.textPrimary,
          margin: 0,
        }}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <button
          onClick={handleNextMonth}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: RADIUS.circle,
            backgroundColor: COLORS.iconBg,
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconChevronRight size={18} />
        </button>
      </div>

      {/* Day Headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: SPACING.xs,
        marginBottom: SPACING.md,
      }}>
        {dayInitials.map((day) => (
          <div
            key={day}
            style={{
              textAlign: 'center',
              minWidth: 0,
              ...TYPOGRAPHY.label,
              color: COLORS.textSecondary,
              fontWeight: 600,
              padding: `${SPACING.xs}px`,
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: SPACING.xs,
        }}
      >
        {days.map((date, index) => {
          const dateKey = date ? formatDateKey(date) : '';
          const isSelected = isDateSelected(date);
          const today = isToday(date);
          const dots = date && dayDots ? dayDots[dateKey] : null;

          return (
            <button
              key={index}
              onClick={() => date && handleDateClick(date)}
              disabled={!date}
              style={{
                aspectRatio: '1',
                minWidth: 0,
                border: today ? `2px solid ${COLORS.primary}` : 'none',
                backgroundColor: isSelected ? COLORS.primaryLight : today ? COLORS.primaryLight : 'transparent',
                color: date ? COLORS.textPrimary : COLORS.textMuted,
                borderRadius: '12px',
                cursor: date ? 'pointer' : 'default',
                fontWeight: isSelected || today ? 600 : 400,
                fontSize: '14px',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                opacity: 1,
                gap: 2,
              }}
              onMouseDown={(e) => {
                if (date) (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
            >
              {date?.getDate()}
              {dots && (dots.confirmed > 0 || dots.requested > 0) && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    justifyContent: 'center',
                    maxWidth: '100%',
                  }}
                >
                  {Array.from({ length: dots.confirmed }).map((_, i) => (
                    <div
                      key={`c-${i}`}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: RADIUS.circle,
                        backgroundColor: COLORS.primary,
                      }}
                    />
                  ))}
                  {Array.from({ length: dots.requested }).map((_, i) => (
                    <div
                      key={`r-${i}`}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: RADIUS.circle,
                        backgroundColor: COLORS.textMuted,
                      }}
                    />
                  ))}
                </div>
              )}
              {!dots && isToday(date) && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    width: '4px',
                    height: '4px',
                    borderRadius: RADIUS.circle,
                    backgroundColor: COLORS.coral,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
};
