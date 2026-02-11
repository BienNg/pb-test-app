import React, { useState, useMemo } from 'react';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../styles/theme';
import { Card } from './BaseComponents';
import { IconChevronLeft, IconChevronRight } from './Icons';

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

// Generate all 30-min slots from 6:00 to 21:00
const ALL_TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 6; h <= 21; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 21 && m > 0) break;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
})();

// Mock: available dates (keys) and their available (unbooked) time slots (30-min intervals)
// Slots NOT in this list for a date are considered booked (greyed out)
const MOCK_AVAILABILITY: Record<string, string[]> = {
  '2026-02-05': ['10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'],
  '2026-02-06': ['09:00', '09:30', '11:00', '11:30', '14:00', '14:30'],
  '2026-02-09': ['10:00', '10:30', '13:00', '13:30', '15:00', '15:30'],
  '2026-02-10': ['10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'],
  '2026-02-11': ['10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'],
  '2026-02-12': ['10:00', '10:30', '11:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'],
  '2026-02-13': ['10:00', '10:30', '11:00', '14:00', '14:30'],
  '2026-03-02': ['10:00', '10:30', '13:00', '13:30', '16:00', '16:30'],
  '2026-03-03': ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
  '2026-03-04': ['10:00', '10:30', '14:00', '14:30', '15:00', '15:30'],
  '2026-03-05': ['10:00', '10:30', '13:00', '13:30', '16:00', '16:30'],
  '2026-03-06': ['09:00', '09:30', '10:00', '10:30', '14:00', '14:30'],
};

const getAvailableDateKeys = () => Object.keys(MOCK_AVAILABILITY);

const getAvailableSlotsForDate = (dateKey: string): Set<string> =>
  new Set(MOCK_AVAILABILITY[dateKey] || []);

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
    }
  };

  const handleSlotClick = (date: Date, time: string) => {
    onTimeSlotSelect?.(date, time);
  };

  return (
    <Card style={{ width: '100%', minWidth: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
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
              color: COLORS.textPrimary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconChevronLeft size={18} />
          </button>
          <button
            onClick={handleNextMonth}
            style={{
              width: 32,
              height: 32,
              borderRadius: RADIUS.circle,
              border: 'none',
              backgroundColor: COLORS.iconBg,
              color: COLORS.textPrimary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Day Headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: SPACING.xs,
          marginBottom: SPACING.md,
          minWidth: 0,
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
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: SPACING.xs,
          marginBottom: SPACING.xl,
          minWidth: 0,
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
                minWidth: 0,
                width: '100%',
                maxWidth: '100%',
                border: 'none',
                borderRadius: RADIUS.circle,
                cursor: isAvailable ? 'pointer' : 'default',
                fontSize: 'min(14px, 4vw)',
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

      {/* Time Slots Section - Selected date only, 6am–9pm in 30-min intervals */}
      <div style={{ borderTop: `1px solid ${BOOKING_COLORS.slotBorder}`, paddingTop: SPACING.lg }}>
        <div
          style={{
            ...TYPOGRAPHY.label,
            color: COLORS.textSecondary,
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: SPACING.md,
          }}
        >
          Available times
        </div>

        <div
          style={{
            ...TYPOGRAPHY.label,
            color: COLORS.textSecondary,
            fontWeight: 600,
            marginBottom: SPACING.sm,
          }}
        >
          {DAY_LABELS[selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1]} {selectedDate.getDate()}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: SPACING.sm,
            minWidth: 0,
          }}
        >
          {ALL_TIME_SLOTS.map((time) => {
            const dateKey = formatDateKey(selectedDate);
            const availableSlots = getAvailableSlotsForDate(dateKey);
            const isAvailable = availableSlots.has(time);

            return (
              <button
                key={time}
                type="button"
                onClick={() => isAvailable && handleSlotClick(selectedDate, time)}
                disabled={!isAvailable}
                style={{
                  padding: `${SPACING.sm}px ${SPACING.md}px`,
                  borderRadius: RADIUS.md,
                  border: `1px solid ${BOOKING_COLORS.slotBorder}`,
                  backgroundColor: isAvailable ? COLORS.white : COLORS.iconBg,
                  color: isAvailable ? BOOKING_COLORS.availableText : COLORS.textMuted,
                  ...TYPOGRAPHY.bodySmall,
                  fontWeight: 500,
                  cursor: isAvailable ? 'pointer' : 'default',
                  textAlign: 'center',
                  minWidth: 0,
                  opacity: isAvailable ? 1 : 0.6,
                }}
              >
                {time}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
