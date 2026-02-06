import React, { useState, useMemo } from 'react';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../styles/theme';
import { Card } from './BaseComponents';

// Booking-specific colors matching the reference design
const BOOKING_COLORS = {
  selected: '#1E3A5F',
  available: '#E8F0FE',
  availableText: '#1E3A5F',
  slotBorder: '#E5E7EB',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_ABBREVS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Mock: available dates (keys) and their time slots
const MOCK_AVAILABILITY: Record<string, string[]> = {
  '2026-02-05': ['10:00', '10:45', '13:00', '13:45', '14:30', '15:15', '16:00'],
  '2026-02-06': ['09:00', '09:45', '11:00', '14:00'],
  '2026-02-09': ['10:00', '13:00', '15:00'],
  '2026-02-10': ['10:00', '10:45', '13:00', '13:45', '14:30', '15:15', '16:00'],
  '2026-02-11': ['10:00', '10:45', '13:00', '13:45', '14:30', '15:15', '16:00'],
  '2026-02-12': ['10:00', '10:45', '13:00', '13:45', '14:30', '15:15', '16:00'],
  '2026-02-13': ['10:00', '11:00', '14:00'],
  '2026-03-02': ['10:00', '13:00', '16:00'],
  '2026-03-03': ['09:00', '10:00', '11:00'],
  '2026-03-04': ['10:00', '14:00', '15:00'],
  '2026-03-05': ['10:00', '13:00', '16:00'],
  '2026-03-06': ['09:00', '10:00', '14:00'],
};

const getAvailableDateKeys = () => Object.keys(MOCK_AVAILABILITY);

const getTimeSlotsForDate = (dateKey: string): string[] =>
  MOCK_AVAILABILITY[dateKey] || [];

const getAvailableDatesInRange = (start: Date, end: Date): Date[] => {
  const keys = getAvailableDateKeys();
  const result: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    const key = formatDateKey(current);
    if (keys.includes(key)) result.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return result;
};

interface BookingCalendarProps {
  onTimeSlotSelect?: (date: Date, time: string) => void;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({ onTimeSlotSelect }) => {
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date(today);
    d.setFullYear(2026);
    d.setMonth(1); // February
    return d;
  });
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date(2026, 1, 5);
    return d;
  });
  const [dayOffset, setDayOffset] = useState(0);

  const availableDateKeys = useMemo(() => new Set(getAvailableDateKeys()), []);

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = (first.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = last.getDate();
    const days: (Date | null)[] = [];

    for (let i = 0; i < startDay; i++) {
      const d = new Date(year, month, 1 - (startDay - i));
      days.push(d);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateClick = (date: Date) => {
    const key = formatDateKey(date);
    if (availableDateKeys.has(key)) {
      setSelectedDate(date);
      setDayOffset(0);
    }
  };

  const allAvailableInView = useMemo(() => {
    const keys = getAvailableDateKeys();
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - 7);
    const end = new Date(selectedDate);
    end.setDate(end.getDate() + 14);
    return getAvailableDatesInRange(start, end);
  }, [selectedDate]);

  const visibleDays = useMemo(() => {
    const idx = allAvailableInView.findIndex(
      (d) => d.toDateString() === selectedDate.toDateString()
    );
    const start = Math.max(0, (idx + dayOffset));
    return allAvailableInView.slice(start, start + 3);
  }, [allAvailableInView, selectedDate, dayOffset]);

  const selectedIdx = allAvailableInView.findIndex(
    (d) => d.toDateString() === selectedDate.toDateString()
  );
  const canPrevDays = selectedIdx + dayOffset > 0;
  const canNextDays =
    selectedIdx >= 0 && selectedIdx + dayOffset + 3 < allAvailableInView.length;

  const handlePrevDays = () => {
    if (canPrevDays) setDayOffset((o) => o - 1);
  };

  const handleNextDays = () => {
    if (canNextDays) setDayOffset((o) => o + 1);
  };

  const handleSlotClick = (date: Date, time: string) => {
    onTimeSlotSelect?.(date, time);
  };

  return (
    <Card>
      {/* Month Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: SPACING.lg,
        }}
      >
        <h2
          style={{
            ...TYPOGRAPHY.h3,
            color: COLORS.textPrimary,
            margin: 0,
          }}
        >
          {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        <div style={{ display: 'flex', gap: SPACING.sm }}>
          <button
            onClick={handlePrevMonth}
            style={{
              width: 32,
              height: 32,
              borderRadius: RADIUS.circle,
              border: 'none',
              backgroundColor: COLORS.iconBg,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}
          >
            ‹
          </button>
          <button
            onClick={handleNextMonth}
            style={{
              width: 32,
              height: 32,
              borderRadius: RADIUS.circle,
              border: 'none',
              backgroundColor: COLORS.iconBg,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}
          >
            ›
          </button>
        </div>
      </div>

      {/* Day Headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: SPACING.xs,
          marginBottom: SPACING.md,
        }}
      >
        {DAY_ABBREVS.map((day, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              ...TYPOGRAPHY.label,
              color: COLORS.textSecondary,
              fontWeight: 600,
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
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: SPACING.xs,
          marginBottom: SPACING.xl,
        }}
      >
        {getCalendarDays().map((date, i) => {
          if (!date) return <div key={i} />;
          const key = formatDateKey(date);
          const isAvailable = availableDateKeys.has(key);
          const isSelected =
            selectedDate &&
            date.toDateString() === selectedDate.toDateString() &&
            isAvailable;

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={!isAvailable}
              style={{
                aspectRatio: '1',
                border: 'none',
                borderRadius: RADIUS.circle,
                cursor: isAvailable ? 'pointer' : 'default',
                fontSize: 14,
                fontWeight: isSelected ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isSelected
                  ? BOOKING_COLORS.selected
                  : isAvailable
                  ? BOOKING_COLORS.available
                  : 'transparent',
                color: isSelected
                  ? COLORS.white
                  : isAvailable
                  ? BOOKING_COLORS.availableText
                  : COLORS.textMuted,
                opacity: isAvailable ? 1 : 0.5,
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Time Slots Section */}
      <div style={{ borderTop: `1px solid ${BOOKING_COLORS.slotBorder}`, paddingTop: SPACING.lg }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: SPACING.md,
          }}
        >
          <span
            style={{
              ...TYPOGRAPHY.label,
              color: COLORS.textSecondary,
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            Available times
          </span>
          <div style={{ display: 'flex', gap: SPACING.xs }}>
            <button
              onClick={handlePrevDays}
              disabled={!canPrevDays}
              style={{
                width: 28,
                height: 28,
                borderRadius: RADIUS.circle,
                border: 'none',
                backgroundColor: COLORS.iconBg,
                cursor: canPrevDays ? 'pointer' : 'not-allowed',
                opacity: canPrevDays ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
              }}
            >
              ‹
            </button>
            <button
              onClick={handleNextDays}
              disabled={!canNextDays}
              style={{
                width: 28,
                height: 28,
                borderRadius: RADIUS.circle,
                border: 'none',
                backgroundColor: COLORS.iconBg,
                cursor: canNextDays ? 'pointer' : 'not-allowed',
                opacity: canNextDays ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
              }}
            >
              ›
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(3, visibleDays.length)}, 1fr)`,
            gap: SPACING.lg,
          }}
        >
          {visibleDays.map((day) => {
            const dateKey = formatDateKey(day);
            const slots = getTimeSlotsForDate(dateKey);
            const dayName = DAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1];
            const dayNum = day.getDate();

            return (
              <div key={dateKey}>
                <div
                  style={{
                    ...TYPOGRAPHY.label,
                    color: COLORS.textSecondary,
                    fontWeight: 600,
                    marginBottom: SPACING.sm,
                  }}
                >
                  {dayName} {dayNum}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: SPACING.sm,
                  }}
                >
                  {slots.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => handleSlotClick(day, time)}
                      style={{
                        padding: `${SPACING.sm}px ${SPACING.md}px`,
                        borderRadius: RADIUS.md,
                        border: `1px solid ${BOOKING_COLORS.slotBorder}`,
                        backgroundColor: COLORS.white,
                        color: BOOKING_COLORS.availableText,
                        ...TYPOGRAPHY.bodySmall,
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {visibleDays.length === 0 && (
          <p
            style={{
              ...TYPOGRAPHY.bodySmall,
              color: COLORS.textSecondary,
              textAlign: 'center',
              margin: 0,
            }}
          >
            Select an available date to see time slots
          </p>
        )}
      </div>
    </Card>
  );
};
