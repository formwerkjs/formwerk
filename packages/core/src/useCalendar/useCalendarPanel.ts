import { computed, MaybeRefOrGetter, shallowRef, toValue } from 'vue';
import { CalendarContext, CalendarDayCell, CalendarMonthCell, CalendarPanelType, CalendarYearCell } from './types';
import { useDateFormatter } from '../i18n';
import { Temporal } from '@js-temporal/polyfill';
import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';

export interface CalendarDayPanel {
  type: 'day';
  days: CalendarDayCell[];
  daysOfTheWeek: string[];
}

export interface CalendarMonthPanel {
  type: 'month';
  months: CalendarMonthCell[];
}

export interface CalendarYearPanel {
  type: 'year';
  years: CalendarYearCell[];
}

export type CalendarPanel = CalendarDayPanel | CalendarMonthPanel | CalendarYearPanel;

export interface CalendarPanelProps {
  daysOfWeekFormat?: Intl.DateTimeFormatOptions['weekday'];
  monthFormat?: Intl.DateTimeFormatOptions['month'];
  yearFormat?: Intl.DateTimeFormatOptions['year'];
}

export function useCalendarPanel(_props: Reactivify<CalendarPanelProps>, context: CalendarContext) {
  const props = normalizeProps(_props);
  const panelType = shallowRef<CalendarPanelType>('day');
  const { days, daysOfTheWeek } = useCalendarDaysPanel(context, props.daysOfWeekFormat);
  const { months, monthFormatter } = useCalendarMonthsPanel(context, props.monthFormat);
  const { years, yearFormatter } = useCalendarYearsPanel(context, props.yearFormat);

  const currentPanel = computed(() => {
    if (panelType.value === 'day') {
      return {
        type: 'day',
        days: days.value,
        daysOfTheWeek: daysOfTheWeek.value,
      } as CalendarDayPanel;
    }

    if (panelType.value === 'month') {
      return {
        type: 'month',
        months: months.value,
      } as CalendarMonthPanel;
    }

    return {
      type: 'year',
      years: years.value,
    } as CalendarYearPanel;
  });

  function switchPanel(type: CalendarPanelType) {
    panelType.value = type;
  }

  const panelLabel = computed(() => {
    if (panelType.value === 'day') {
      return monthFormatter.value.format(context.getFocusedDate().toPlainDateTime());
    }

    if (panelType.value === 'month') {
      return yearFormatter.value.format(context.getFocusedDate().toPlainDateTime());
    }

    return `${yearFormatter.value.format(years.value[0].value.toPlainDateTime())} - ${yearFormatter.value.format(years.value[years.value.length - 1].value.toPlainDateTime())}`;
  });

  return { currentPanel, switchPanel, panelLabel };
}

function useCalendarDaysPanel(
  { weekInfo, getFocusedDate, calendar, selectedDate, locale, getMinDate, getMaxDate }: CalendarContext,
  daysOfWeekFormat?: MaybeRefOrGetter<Intl.DateTimeFormatOptions['weekday']>,
) {
  const dayFormatter = useDateFormatter(locale, () => ({ weekday: toValue(daysOfWeekFormat) ?? 'short' }));

  const days = computed<CalendarDayCell[]>(() => {
    const current = toValue(selectedDate);
    const focused = getFocusedDate();
    const startOfMonth = focused.with({ day: 1 });

    const firstDayOfWeek = weekInfo.value.firstDay;
    const startDayOfWeek = startOfMonth.dayOfWeek;
    const daysToSubtract = (startDayOfWeek - firstDayOfWeek + 7) % 7;

    // Move to first day of week
    const firstDay = startOfMonth.subtract({ days: daysToSubtract });

    // Always use 6 weeks (42 days) for consistent layout
    const gridDays = 42;
    const now = Temporal.Now.zonedDateTime(calendar.value);
    const minDate = getMinDate();
    const maxDate = getMaxDate();

    return Array.from({ length: gridDays }, (_, i) => {
      const dayOfMonth = firstDay.add({ days: i });
      let disabled = false;

      if (minDate && Temporal.ZonedDateTime.compare(dayOfMonth, minDate) < 0) {
        disabled = true;
      }

      if (maxDate && Temporal.ZonedDateTime.compare(dayOfMonth, maxDate) > 0) {
        disabled = true;
      }

      return {
        value: dayOfMonth,
        label: String(dayOfMonth.day),
        dayOfMonth: dayOfMonth.day,
        isToday: dayOfMonth.equals(now),
        selected: current.equals(dayOfMonth),
        isOutsideMonth: dayOfMonth.monthCode !== focused.monthCode,
        focused: focused.equals(dayOfMonth),
        disabled,
        type: 'day',
      } as CalendarDayCell;
    });
  });

  const daysOfTheWeek = computed(() => {
    let focused = getFocusedDate();
    const daysPerWeek = focused.daysInWeek;
    const firstDayOfWeek = weekInfo.value.firstDay;
    // Get the current date's day of week (0-6)
    const currentDayOfWeek = focused.dayOfWeek;

    // Calculate how many days to go back to reach first day of week
    const daysToSubtract = (currentDayOfWeek - firstDayOfWeek + 7) % 7;

    // Move current date back to first day of week
    focused = focused.subtract({ days: daysToSubtract });

    const days: string[] = [];
    for (let i = 0; i < daysPerWeek; i++) {
      days.push(dayFormatter.value.format(focused.add({ days: i }).toPlainDateTime()));
    }

    return days;
  });

  return { days, daysOfTheWeek, dayFormatter };
}

function useCalendarMonthsPanel(
  { getFocusedDate, locale, selectedDate, getMinDate, getMaxDate }: CalendarContext,
  monthFormat?: MaybeRefOrGetter<Intl.DateTimeFormatOptions['month']>,
) {
  const monthFormatter = useDateFormatter(locale, () => ({ month: toValue(monthFormat) ?? 'long' }));

  const months = computed<CalendarMonthCell[]>(() => {
    const focused = getFocusedDate();
    const current = toValue(selectedDate);
    const minDate = getMinDate();
    const maxDate = getMaxDate();

    return Array.from({ length: focused.monthsInYear }, (_, i) => {
      const date = focused.with({ month: i + 1, day: 1 });
      let disabled = false;

      if (minDate && minDate.month < date.month) {
        disabled = true;
      }

      if (maxDate && maxDate.month > date.month) {
        disabled = true;
      }

      const cell: CalendarMonthCell = {
        type: 'month',
        label: monthFormatter.value.format(date.toPlainDateTime()),
        value: date,
        monthOfYear: date.month,
        selected: date.month === current.month && date.year === current.year,
        focused: focused.monthCode === date.monthCode && focused.year === date.year,
        disabled,
      };

      return cell;
    });
  });

  return { months, monthFormatter };
}

function useCalendarYearsPanel(
  { getFocusedDate, locale, selectedDate, getMinDate, getMaxDate }: CalendarContext,
  yearFormat?: MaybeRefOrGetter<Intl.DateTimeFormatOptions['year']>,
) {
  const yearFormatter = useDateFormatter(locale, () => ({ year: toValue(yearFormat) ?? 'numeric' }));

  const years = computed<CalendarYearCell[]>(() => {
    const focused = getFocusedDate();
    const current = toValue(selectedDate);
    const minDate = getMinDate();
    const maxDate = getMaxDate();

    return Array.from({ length: 9 }, (_, i) => {
      const startYear = Math.floor(focused.year / 9) * 9;
      const date = focused.with({ year: startYear + i, month: 1, day: 1 });
      let disabled = false;

      if (minDate && minDate.year < date.year) {
        disabled = true;
      }

      if (maxDate && maxDate.year > date.year) {
        disabled = true;
      }

      const cell: CalendarYearCell = {
        type: 'year',
        label: yearFormatter.value.format(date.toPlainDateTime()),
        value: date,
        year: date.year,
        selected: date.year === current.year,
        focused: focused.year === date.year,
        disabled,
      };

      return cell;
    });
  });

  return { years, yearFormatter };
}
