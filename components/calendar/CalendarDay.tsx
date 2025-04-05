'use client';

import { styled } from '@mui/material/styles';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { DateTime } from 'luxon';
import { VacationBooking, Holiday } from '@/types';

// Styled components
const DayContainer = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== 'isWeekend' &&
    prop !== 'isCurrentMonth' &&
    prop !== 'isToday' &&
    prop !== 'isHoliday' &&
    prop !== 'isVacation' &&
    prop !== 'holidayType' &&
    prop !== 'isHalfDay',
})<{
  isWeekend?: boolean;
  isCurrentMonth?: boolean;
  isToday?: boolean;
  isHoliday?: boolean;
  isVacation?: boolean;
  holidayType?: 'bank' | 'provincial' | 'federal' | null;
  isHalfDay?: boolean;
}>(
  ({
    theme,
    isWeekend,
    isCurrentMonth,
    isToday,
    isHoliday,
    isVacation,
    holidayType,
    isHalfDay,
  }) => ({
    height: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(0.5),
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
    backgroundColor: isToday
      ? theme.palette.primary.light + '33'
      : isHoliday
        ? holidayType === 'bank'
          ? theme.palette.warning.light + '33'
          : theme.palette.secondary.light + '22'
        : isWeekend
          ? theme.palette.grey[50]
          : 'transparent',
    color: !isCurrentMonth ? theme.palette.text.disabled : 'inherit',
    border: isToday ? `1px solid ${theme.palette.primary.main}` : 'none',
    // Full-day vacation styling
    ...(isVacation &&
      !isHalfDay && {
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: theme.palette.success.light + '33',
          zIndex: 0,
          pointerEvents: 'none',
        },
      }),
    // Half-day vacation styling
    ...(isVacation &&
      isHalfDay && {
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '50%',
          background: `linear-gradient(135deg, ${theme.palette.success.light}33 50%, transparent 50%)`,
          zIndex: 0,
          pointerEvents: 'none',
        },
      }),
  }),
);

const DayNumber = styled(Typography)(({ theme }) => ({
  fontSize: theme.typography.body2.fontSize,
  fontWeight: theme.typography.fontWeightMedium,
  marginBottom: theme.spacing(1),
  zIndex: 1,
  position: 'relative',
}));

const EventChip = styled(Chip)(({ theme }) => ({
  marginBottom: theme.spacing(0.5),
  fontSize: '0.75rem',
  height: 24,
  zIndex: 1,
  position: 'relative',
}));

// Types of vacation indicators
const HalfDayIndicator = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  right: 0,
  padding: '1px 4px',
  backgroundColor: theme.palette.info.main,
  color: theme.palette.info.contrastText,
  fontSize: '0.6rem',
  borderBottomLeftRadius: theme.shape.borderRadius,
  zIndex: 2,
}));

interface CalendarDayProps {
  day: DateTime;
  currentMonth: number;
  vacations: VacationBooking[];
  holiday?: Holiday | null;
}

export default function CalendarDay({
  day,
  currentMonth,
  vacations,
  holiday,
}: CalendarDayProps) {
  // Helper functions
  const isWeekend = day.weekday > 5; // 6 = Saturday, 7 = Sunday in Luxon
  const isCurrentMonth = day.month === currentMonth;
  const isToday = day.hasSame(DateTime.local(), 'day');

  // Check if any vacation is a half-day
  const isHalfDay = vacations.some((vacation) => vacation.is_half_day);

  // Get the half-day portion if applicable
  const halfDayPortion =
    isHalfDay && vacations.find((v) => v.is_half_day)?.half_day_portion;

  // Holiday type for color coding
  const holidayType = holiday?.type
    ? holiday.type.includes('bank')
      ? 'bank'
      : 'provincial' // Default to provincial if type exists but isn't bank
    : null;

  // Format vacation label with half-day information
  const getVacationLabel = (vacation: VacationBooking) => {
    if (vacation.is_half_day) {
      return `Half-day (${vacation.half_day_portion})`;
    }
    return 'Vacation';
  };

  // Get holiday label with type
  const getHolidayLabel = () => {
    if (!holiday) return '';

    // Use more descriptive labels for holiday types
    const typeLabel =
      holiday.type.includes('bank')
        ? 'Bank Holiday (non-bookable)'
        : 'Provincial Holiday (informational)';

    return `${holiday.name} (${typeLabel})`;
  };

  return (
    <DayContainer
      isWeekend={isWeekend}
      isCurrentMonth={isCurrentMonth}
      isToday={isToday}
      isHoliday={!!holiday}
      isVacation={vacations.length > 0}
      holidayType={holidayType}
      isHalfDay={isHalfDay}
    >
      <DayNumber variant="body2">{day.toFormat('d')}</DayNumber>

      {isHalfDay && <HalfDayIndicator>{halfDayPortion}</HalfDayIndicator>}

      {holiday && (
        <Tooltip title={getHolidayLabel()}>
          <EventChip
            size="small"
            label={holiday.name}
            color={holiday.type.includes('bank') ? 'warning' : 'secondary'}
            variant="outlined"
          />
        </Tooltip>
      )}

      {vacations.map((vacation) => (
        <Tooltip key={vacation.id} title={getVacationLabel(vacation)}>
          <EventChip
            size="small"
            label={vacation.is_half_day ? 'Half-day' : 'Vacation'}
            color="success"
            variant={vacation.is_half_day ? 'outlined' : 'filled'}
          />
        </Tooltip>
      ))}
    </DayContainer>
  );
}
