import { computed, InjectionKey, MaybeRefOrGetter, nextTick, provide, ref, Ref, shallowRef, toValue, watch } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarDay, CalendarIdentifier } from './types';
import { hasKeyCode, isButtonElement, normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { Reactivify } from '../types';
import { useDateFormatter, useLocale } from '../i18n';
import { WeekInfo } from '../i18n/getWeekInfo';
import { FieldTypePrefixes } from '../constants';
import { usePopoverController } from '../helpers/usePopoverController';

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

  /**
   * Whether the calendar is disabled.
   */
  disabled?: boolean;
}

interface CalendarContext {
  locale: Ref<string>;
  weekInfo: Ref<WeekInfo>;
  calendar: Ref<CalendarIdentifier>;
  selectedDate: MaybeRefOrGetter<Temporal.ZonedDateTime>;
  focusedDay: Ref<Temporal.ZonedDateTime | undefined>;
  setDay: (date: Temporal.ZonedDateTime) => void;
  setFocusedDay: (date: Temporal.ZonedDateTime) => void;
}

export const CalendarContextKey: InjectionKey<CalendarContext> = Symbol('CalendarContext');

export function useCalendar(_props: Reactivify<CalendarProps, 'onDaySelected'> = {}) {
  const props = normalizeProps(_props, ['onDaySelected']);
  const calendarId = useUniqId(FieldTypePrefixes.Calendar);
  const pickerEl = ref<HTMLElement>();
  const gridEl = ref<HTMLElement>();
  const buttonEl = ref<HTMLElement>();
  const { weekInfo, locale, calendar } = useLocale(props.locale, {
    calendar: () => toValue(props.calendar),
  });

  const selectedDate = computed(() => toValue(props.currentDate) ?? Temporal.Now.zonedDateTime(calendar.value));
  const focusedDay = shallowRef<Temporal.ZonedDateTime>();

  const context: CalendarContext = {
    weekInfo,
    locale,
    calendar,
    selectedDate,
    focusedDay,
    setDay: (date: Temporal.ZonedDateTime) => {
      props.onDaySelected?.(date);
    },
    setFocusedDay: async (date: Temporal.ZonedDateTime) => {
      focusedDay.value = date;
      await nextTick();
      focusCurrent();
    },
  };

  const { daysOfTheWeek } = useDaysOfTheWeek(context);
  const { days } = useCalendarDays(context);

  const buttonProps = computed(() => {
    const isBtn = isButtonElement(buttonEl.value);

    return withRefCapture(
      {
        type: isBtn ? ('button' as const) : undefined,
        role: isBtn ? undefined : 'button',
        tabindex: '-1',
        onClick: () => {
          isOpen.value = true;
        },
      },
      buttonEl,
    );
  });

  const getFocusedOrSelected = () => {
    if (focusedDay.value) {
      return focusedDay.value;
    }

    return selectedDate.value;
  };
  const { isOpen } = usePopoverController(pickerEl, { disabled: props.disabled });

  const pickerHandlers = {
    onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        isOpen.value = false;
        return;
      }

      if (hasKeyCode(e, 'ArrowLeft')) {
        e.preventDefault();
        context.setFocusedDay(getFocusedOrSelected().subtract({ days: 1 }));
        return;
      }

      if (hasKeyCode(e, 'ArrowRight')) {
        e.preventDefault();
        context.setFocusedDay(getFocusedOrSelected().add({ days: 1 }));
        return;
      }

      if (hasKeyCode(e, 'ArrowUp')) {
        e.preventDefault();
        context.setFocusedDay(getFocusedOrSelected().subtract({ weeks: 1 }));
        return;
      }

      if (hasKeyCode(e, 'ArrowDown')) {
        e.preventDefault();
        context.setFocusedDay(getFocusedOrSelected().add({ weeks: 1 }));
        return;
      }

      if (hasKeyCode(e, 'Tab')) {
        isOpen.value = false;
        return;
      }
    },
  };

  function focusCurrent() {
    const currentlySelected = gridEl.value?.querySelector('[tabindex="0"]') as HTMLElement | null;
    if (currentlySelected) {
      currentlySelected.focus();
      return;
    }
  }

  watch(isOpen, async value => {
    if (!value) {
      focusedDay.value = undefined;
      return;
    }

    if (!focusedDay.value) {
      focusedDay.value = Temporal.ZonedDateTime.from(selectedDate.value);
    }

    await nextTick();
    focusCurrent();
  });

  const pickerProps = computed(() => {
    return withRefCapture(
      {
        id: calendarId,
        ...pickerHandlers,
      },
      pickerEl,
    );
  });

  const gridProps = computed(() => {
    return withRefCapture(
      {
        id: `${calendarId}-g`,
        role: 'grid',
      },
      gridEl,
    );
  });

  provide(CalendarContextKey, context);

  return {
    /**
     * Whether the calendar is open.
     */
    isOpen,
    /**
     * The props for the picker element.
     */
    pickerProps,
    /**
     * The props for the grid element.
     */
    gridProps,
    /**
     * The props for the button element.
     */
    buttonProps,
    /**
     * The current date.
     */
    selectedDate,
    /**
     * The grid element.
     */
    gridEl,
    /**
     * The days of the week.
     */
    daysOfTheWeek,
    /**
     * The days of the month.
     */
    days,
  };
}

function useDaysOfTheWeek({ weekInfo, locale, focusedDay, selectedDate }: CalendarContext) {
  const longFormatter = useDateFormatter(locale, { weekday: 'long' });
  const shortFormatter = useDateFormatter(locale, { weekday: 'short' });
  const narrowFormatter = useDateFormatter(locale, { weekday: 'narrow' });

  const daysOfTheWeek = computed(() => {
    let focused = toValue(focusedDay) ?? toValue(selectedDate);
    const daysPerWeek = focused.daysInWeek;
    const firstDayOfWeek = weekInfo.value.firstDay;
    // Get the current date's day of week (0-6)
    const currentDayOfWeek = focused.dayOfWeek;

    // Calculate how many days to go back to reach first day of week
    const daysToSubtract = (currentDayOfWeek - firstDayOfWeek + 7) % 7;

    // Move current date back to first day of week
    focused = focused.subtract({ days: daysToSubtract });

    const days: {
      long: string;
      short: string;
      narrow: string;
    }[] = [];
    for (let i = 0; i < daysPerWeek; i++) {
      days.push({
        long: longFormatter.value.format(focused.add({ days: i }).toPlainDateTime()),
        short: shortFormatter.value.format(focused.add({ days: i }).toPlainDateTime()),
        narrow: narrowFormatter.value.format(focused.add({ days: i }).toPlainDateTime()),
      });
    }

    return days;
  });

  return { daysOfTheWeek };
}

function useCalendarDays({ weekInfo, focusedDay, calendar, selectedDate }: CalendarContext) {
  const days = computed<CalendarDay[]>(() => {
    const current = toValue(selectedDate);
    const focused = toValue(focusedDay) ?? current;
    const startOfMonth = focused.with({ day: 1 });

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
        selected: current.equals(dayOfMonth),
        isOutsideMonth: dayOfMonth.monthCode !== focused.monthCode,
        focused: focused.equals(dayOfMonth),
        // TODO: Figure out when to disable days
        disabled: false,
      } as CalendarDay;
    });
  });

  return { days };
}
