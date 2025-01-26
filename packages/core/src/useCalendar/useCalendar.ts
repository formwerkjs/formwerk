import { computed, InjectionKey, MaybeRefOrGetter, provide, Ref, toValue } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarDay, CalendarIdentifier } from './types';
import { normalizeProps } from '../utils/common';
import { Reactivify } from '../types';
import { useDateFormatter, useLocale } from '../i18n';
import { WeekInfo } from '../i18n/getWeekInfo';

export interface CalendarProps {
  /**
   * The locale to use for the calendar.
   */
  locale?: string;

  /**
   * The current date to use for the calendar.
   */
  currentDate?: Temporal.ZonedDateTime;

  /**
   * The callback to call when a day is selected.
   */
  onDaySelected?: (day: Temporal.ZonedDateTime) => void;

  /**
   * The calendar type to use for the calendar, e.g. `gregory`, `islamic-umalqura`, etc.
   */
  calendar?: CalendarIdentifier;
}

interface CalendarContext {
  locale: Ref<string>;
  weekInfo: Ref<WeekInfo>;
  calendar: Ref<CalendarIdentifier>;
  currentDate: MaybeRefOrGetter<Temporal.ZonedDateTime>;
  setDay: (date: Temporal.ZonedDateTime) => void;
}

export const CalendarContextKey: InjectionKey<CalendarContext> = Symbol('CalendarContext');

export function useCalendar(_props: Reactivify<CalendarProps, 'onDaySelected'> = {}) {
  const props = normalizeProps(_props, ['onDaySelected']);
  const { weekInfo, locale, calendar } = useLocale(props.locale, {
    calendar: () => toValue(props.calendar),
  });

  const currentDate = computed(() => toValue(props.currentDate) ?? Temporal.Now.zonedDateTime(calendar.value));

  const context: CalendarContext = {
    weekInfo,
    locale,
    calendar,
    currentDate,
    setDay: (date: Temporal.ZonedDateTime) => {
      props.onDaySelected?.(date);
    },
  };

  const { daysOfTheWeek } = useDaysOfTheWeek(context);
  const { days } = useCalendarDays(context);

  provide(CalendarContextKey, context);

  return {
    calendar,
    days,
    daysOfTheWeek,
  };
}

function useDaysOfTheWeek({ weekInfo, locale, currentDate }: CalendarContext) {
  const longFormatter = useDateFormatter(locale, { weekday: 'long' });
  const shortFormatter = useDateFormatter(locale, { weekday: 'short' });
  const narrowFormatter = useDateFormatter(locale, { weekday: 'narrow' });

  const daysOfTheWeek = computed(() => {
    let current = toValue(currentDate);
    const daysPerWeek = current.daysInWeek;
    const firstDayOfWeek = weekInfo.value.firstDay;
    // Get the current date's day of week (0-6)
    const currentDayOfWeek = current.dayOfWeek;

    // Calculate how many days to go back to reach first day of week
    const daysToSubtract = (currentDayOfWeek - firstDayOfWeek + 7) % 7;

    // Move current date back to first day of week
    current = current.subtract({ days: daysToSubtract });

    const days: {
      long: string;
      short: string;
      narrow: string;
    }[] = [];
    for (let i = 0; i < daysPerWeek; i++) {
      days.push({
        long: longFormatter.value.format(current.add({ days: i }).toPlainDateTime()),
        short: shortFormatter.value.format(current.add({ days: i }).toPlainDateTime()),
        narrow: narrowFormatter.value.format(current.add({ days: i }).toPlainDateTime()),
      });
    }

    return days;
  });

  return { daysOfTheWeek };
}

function useCalendarDays({ weekInfo, currentDate, calendar }: CalendarContext) {
  const days = computed<CalendarDay[]>(() => {
    const current = toValue(currentDate);
    const startOfMonth = current.with({ day: 1 });

    const firstDayOfWeek = weekInfo.value.firstDay;
    const startDayOfWeek = startOfMonth.dayOfWeek;
    const daysToSubtract = (startDayOfWeek - firstDayOfWeek + 7) % 7;

    // Move to first day of week
    const firstDay = startOfMonth.subtract({ days: daysToSubtract });

    // Calculate total days needed to fill grid
    const daysInMonth = startOfMonth.daysInMonth;
    const totalDays = daysInMonth + daysToSubtract;
    const remainingDays = 7 - (totalDays % 7);
    const gridDays = totalDays + (remainingDays === 7 ? 0 : remainingDays);
    const now = Temporal.Now.zonedDateTime(calendar.value);

    return Array.from({ length: gridDays }, (_, i) => {
      const dayOfMonth = firstDay.add({ days: i });

      return {
        value: dayOfMonth,
        dayOfMonth: dayOfMonth.day,
        isToday: dayOfMonth.equals(now),
        isSelected: current.equals(dayOfMonth),
        isOutsideMonth: dayOfMonth.monthCode !== current.monthCode,
      } as CalendarDay;
    });
  });

  return { days };
}
