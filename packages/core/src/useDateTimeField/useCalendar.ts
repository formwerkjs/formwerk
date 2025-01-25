import { computed, MaybeRefOrGetter, Ref, toValue } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarIdentifier } from './types';
import { normalizeProps } from '../utils/common';
import { Reactivify } from '../types';
import { useDateFormatter, useLocale } from '../i18n';
import { WeekInfo } from '../i18n/getWeekInfo';

interface CalendarProps {
  locale: string;

  calendar: CalendarIdentifier;

  currentDate: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime;
}

export interface CalendarDay {
  value: Temporal.PlainMonthDay;
  dayOfMonth: number;
  isToday: boolean;
  isSelected: boolean;
  isOutsideMonth: boolean;
}

interface CalendarContext {
  locale: Ref<string>;
  weekInfo: Ref<WeekInfo>;
  calendar: Ref<Temporal.Calendar>;
  currentDate: MaybeRefOrGetter<Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime>;
}

export function useCalendar(_props: Reactivify<CalendarProps>) {
  const props = normalizeProps(_props);
  const { weekInfo, locale } = useLocale(props.locale);
  const calendar = computed(() => new Temporal.Calendar(toValue(props.calendar)));
  const context: CalendarContext = {
    weekInfo,
    locale,
    calendar,
    currentDate: props.currentDate,
  };

  const { daysOfTheWeek } = useDaysOfTheWeek(context);
  const { days } = useCalendarDays(context);

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
        long: longFormatter.value.format(current.add({ days: i })),
        short: shortFormatter.value.format(current.add({ days: i })),
        narrow: narrowFormatter.value.format(current.add({ days: i })),
      });
    }

    return days;
  });

  return { daysOfTheWeek };
}

function useCalendarDays({ weekInfo, currentDate, calendar }: CalendarContext) {
  const days = computed<CalendarDay[]>(() => {
    const current = toValue(currentDate);
    const plainCurrent = current.toPlainMonthDay();
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
    const now = Temporal.Now.plainDate(calendar.value);

    return Array.from({ length: gridDays }, (_, i) => {
      const dayOfMonth = firstDay.add({ days: i }).toPlainMonthDay();

      return {
        value: dayOfMonth,
        dayOfMonth: dayOfMonth.day,
        isToday: dayOfMonth.equals(now),
        isSelected: plainCurrent.equals(dayOfMonth),
        isOutsideMonth: dayOfMonth.monthCode !== plainCurrent.monthCode,
      } as CalendarDay;
    });
  });

  return { days };
}
