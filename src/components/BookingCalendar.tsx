import React, { useState, useMemo, useEffect } from 'react';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../styles/theme';
import { Card } from './BaseComponents';
import { IconChevronLeft, IconChevronRight, IconUsers } from './Icons';
import { COACH_AVAILABILITY } from '../data/coachAvailability';

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

// Get available date keys for a coach (or union of all coaches when coachId is null)
const getAvailableDateKeys = (coachId: string | null, coachIds: string[]): Set<string> => {
  if (coachId === null) {
    const set = new Set<string>();
    coachIds.forEach((id) => {
      const byDate = COACH_AVAILABILITY[id];
      if (byDate) Object.keys(byDate).forEach((key) => set.add(key));
    });
    return set;
  }
  return new Set(Object.keys(COACH_AVAILABILITY[coachId] || {}));
};

// Get available time slots for a date and coach (or union when coachId is null)
const getAvailableSlotsForDate = (dateKey: string, coachId: string | null, coachIds: string[]): Set<string> => {
  if (coachId === null) {
    const set = new Set<string>();
    coachIds.forEach((id) => {
      const slots = COACH_AVAILABILITY[id]?.[dateKey] || [];
      slots.forEach((t) => set.add(t));
    });
    return set;
  }
  return new Set(COACH_AVAILABILITY[coachId]?.[dateKey] || []);
};

interface CoachInfo {
  id: string;
  name: string;
  tier: string;
  hourlyRate: number;
  avatar?: string;
}

interface BookingCalendarProps {
  coaches: CoachInfo[];
  selectedCoachId: string | null;
  onCoachSelect: (id: string | null) => void;
  onTimeSlotSelect?: (date: Date, time: string) => void;
  onBookSession?: () => void;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  coaches,
  selectedCoachId,
  onCoachSelect,
  onTimeSlotSelect,
  onBookSession,
}) => {
  const coachIds = useMemo(() => coaches.map((c) => c.id), [coaches]);
  const coachSelected = selectedCoachId !== null;
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
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const availableDateKeys = useMemo(
    () => getAvailableDateKeys(selectedCoachId, coachIds),
    [selectedCoachId, coachIds]
  );

  // When coach filter changes, clear selected time if it's no longer available; optionally move date to first available
  useEffect(() => {
    const dateKey = formatDateKey(selectedDate);
    const slots = getAvailableSlotsForDate(dateKey, selectedCoachId, coachIds);
    if (selectedTime && !slots.has(selectedTime)) {
      setSelectedTime(null);
    }
    if (!availableDateKeys.has(dateKey) && availableDateKeys.size > 0) {
      const firstKey = Array.from(availableDateKeys).sort()[0];
      const [y, m, day] = firstKey.split('-').map(Number);
      setSelectedDate(new Date(y, m - 1, day));
      setSelectedTime(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when coach filter changes
  }, [selectedCoachId, coachIds]);

  const isBookDisabled = !coachSelected || !selectedTime;

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
      setSelectedTime(null);
    }
  };

  const handleSlotClick = (date: Date, time: string) => {
    setSelectedTime(time);
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
          marginBottom: SPACING.lg,
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

      {/* Coach badges - horizontal scrollable single row */}
      <div
        className="scrollbar-hide"
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          gap: SPACING.md,
          marginBottom: SPACING.lg,
          overflowX: 'auto',
          overflowY: 'hidden',
          minWidth: 0,
        }}
      >
        {/* All coaches filter */}
        <button
          type="button"
          onClick={() => onCoachSelect(null)}
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: `${SPACING.sm}px ${SPACING.md}px`,
            borderRadius: RADIUS.lg,
            border: `2px solid ${selectedCoachId === null ? COLORS.primary : 'rgba(0,0,0,0.06)'}`,
            backgroundColor: selectedCoachId === null ? COLORS.primaryLight : COLORS.white,
            boxShadow: selectedCoachId === null ? '0 2px 8px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            minWidth: 72,
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: selectedCoachId === null ? COLORS.primaryLight : COLORS.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: SPACING.xs,
              flexShrink: 0,
            }}
          >
            <IconUsers size={18} style={{ color: selectedCoachId === null ? COLORS.primary : COLORS.textSecondary }} />
          </div>
          <span
            style={{
              ...TYPOGRAPHY.label,
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.textPrimary,
              textAlign: 'center',
            }}
          >
            All
          </span>
          <span
            style={{
              ...TYPOGRAPHY.label,
              fontSize: 10,
              fontWeight: 500,
              color: COLORS.textSecondary,
              textAlign: 'center',
            }}
          >
            Any coach
          </span>
        </button>
        {coaches.map((coach) => {
          const isSelected = selectedCoachId === coach.id;
          const initials = coach.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2);
          return (
            <button
              key={coach.id}
              type="button"
              onClick={() => onCoachSelect(coach.id)}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: `${SPACING.sm}px ${SPACING.md}px`,
                borderRadius: RADIUS.lg,
                border: `2px solid ${isSelected ? COLORS.primary : 'rgba(0,0,0,0.06)'}`,
                backgroundColor: isSelected ? COLORS.primaryLight : COLORS.white,
                boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                minWidth: 72,
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: coach.avatar ? 'transparent' : COLORS.primaryLight,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: SPACING.xs,
                  flexShrink: 0,
                }}
              >
                {coach.avatar ? (
                  <img
                    src={coach.avatar}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span
                    style={{
                      ...TYPOGRAPHY.label,
                      fontSize: 11,
                      fontWeight: 600,
                      color: COLORS.primary,
                    }}
                  >
                    {initials}
                  </span>
                )}
              </div>
              <span
                style={{
                  ...TYPOGRAPHY.label,
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  marginBottom: 2,
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {coach.name.split(' ')[0]}
              </span>
              <span
                style={{
                  ...TYPOGRAPHY.label,
                  fontSize: 10,
                  fontWeight: 500,
                  color: COLORS.textSecondary,
                  textAlign: 'center',
                }}
              >
                {coach.tier.replace(' Coach', '')} · ${coach.hourlyRate}/hr
              </span>
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
            const availableSlots = getAvailableSlotsForDate(dateKey, selectedCoachId, coachIds);
            const isAvailable = availableSlots.has(time);
            const isSelected = selectedTime === time;

            return (
              <button
                key={time}
                type="button"
                onClick={() => isAvailable && handleSlotClick(selectedDate, time)}
                disabled={!isAvailable}
                style={{
                  padding: `${SPACING.sm}px ${SPACING.md}px`,
                  borderRadius: RADIUS.md,
                  border: `1px solid ${isSelected ? BOOKING_COLORS.selected : BOOKING_COLORS.slotBorder}`,
                  backgroundColor: isSelected ? BOOKING_COLORS.selected : isAvailable ? COLORS.white : COLORS.iconBg,
                  color: isSelected ? COLORS.white : isAvailable ? BOOKING_COLORS.availableText : COLORS.textMuted,
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

        <button
          type="button"
          onClick={() => !isBookDisabled && onBookSession?.()}
          disabled={isBookDisabled}
          style={{
            width: '100%',
            marginTop: SPACING.lg,
            padding: `${SPACING.sm}px ${SPACING.lg}px`,
            borderRadius: RADIUS.md,
            border: 'none',
            backgroundColor: isBookDisabled ? COLORS.iconBg : COLORS.primary,
            color: isBookDisabled ? COLORS.textMuted : COLORS.textPrimary,
            ...TYPOGRAPHY.bodySmall,
            fontWeight: 600,
            cursor: isBookDisabled ? 'default' : 'pointer',
            boxShadow: isBookDisabled ? 'none' : '0 4px 12px rgba(155, 225, 93, 0.4)',
            opacity: isBookDisabled ? 0.8 : 1,
          }}
        >
          Book Session
        </button>
      </div>
    </Card>
  );
};
