import { computed, InjectionKey, MaybeRefOrGetter, nextTick, provide, ref, Ref, shallowRef, toValue, watch } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CalendarDay, CalendarIdentifier } from './types';
import { hasKeyCode, isButtonElement, normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { Reactivify } from '../types';
import { useDateFormatter, useLocale } from '../i18n';
import { WeekInfo } from '../i18n/getWeekInfo';
import { FieldTypePrefixes } from '../constants';
import { usePopoverController } from '../helpers/usePopoverController';
import { blockEvent } from '../utils/events';

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
  getFocusedDate: () => Temporal.ZonedDateTime;
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
  const { isOpen } = usePopoverController(pickerEl, { disabled: props.disabled });

  function getFocusedOrSelected() {
    if (focusedDay.value) {
      return focusedDay.value;
    }

    return selectedDate.value;
  }

  const context: CalendarContext = {
    weekInfo,
    locale,
    calendar,
    selectedDate,
    getFocusedDate: getFocusedOrSelected,
    setDay: (date: Temporal.ZonedDateTime) => {
      props.onDaySelected?.(date);
    },
    setFocusedDay: async (date: Temporal.ZonedDateTime) => {
      focusedDay.value = date;
      await nextTick();
      focusCurrent();
    },
  };

  const handleKeyDown = useCalendarKeyboard(context);
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

  const pickerHandlers = {
    onKeydown(e: KeyboardEvent) {
      const handled = handleKeyDown(e);
      if (handled) {
        blockEvent(e);
        return;
      }

      if (e.key === 'Escape') {
        isOpen.value = false;
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

function useDaysOfTheWeek({ weekInfo, locale, getFocusedDate }: CalendarContext) {
  const longFormatter = useDateFormatter(locale, { weekday: 'long' });
  const shortFormatter = useDateFormatter(locale, { weekday: 'short' });
  const narrowFormatter = useDateFormatter(locale, { weekday: 'narrow' });

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

function useCalendarDays({ weekInfo, getFocusedDate, calendar, selectedDate }: CalendarContext) {
  const days = computed<CalendarDay[]>(() => {
    const current = toValue(selectedDate);
    const focused = getFocusedDate();
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

interface ShortcutDefinition {
  fn: () => Temporal.ZonedDateTime | undefined;
  type: 'focus' | 'select';
}

export function useCalendarKeyboard(context: CalendarContext) {
  const shortcuts: Partial<Record<string, ShortcutDefinition>> = {
    ArrowLeft: {
      fn: () => context.getFocusedDate().subtract({ days: 1 }),
      type: 'focus',
    },
    ArrowRight: {
      fn: () => context.getFocusedDate().add({ days: 1 }),
      type: 'focus',
    },
    ArrowUp: {
      fn: () => context.getFocusedDate().subtract({ weeks: 1 }),
      type: 'focus',
    },
    ArrowDown: {
      fn: () => context.getFocusedDate().add({ weeks: 1 }),
      type: 'focus',
    },
    Enter: {
      fn: () => context.getFocusedDate(),
      type: 'select',
    },
    PageDown: {
      fn: () => context.getFocusedDate().add({ months: 1 }),
      type: 'focus',
    },
    PageUp: {
      fn: () => context.getFocusedDate().subtract({ months: 1 }),
      type: 'focus',
    },
    Home: {
      fn: () => {
        const current = context.getFocusedDate();
        if (current.day === 1) {
          return current.subtract({ months: 1 }).with({ day: 1 });
        }

        return current.with({ day: 1 });
      },
      type: 'focus',
    },
    End: {
      type: 'focus',
      fn: () => {
        const current = context.getFocusedDate();
        if (current.day === current.daysInMonth) {
          return current.add({ months: 1 }).with({ day: 1 });
        }

        return current.with({ day: current.daysInMonth });
      },
    },
    Escape: {
      type: 'focus',
      fn: () => {
        const selected = toValue(context.selectedDate).toPlainDateTime();
        const focused = context.getFocusedDate().toPlainDateTime();
        if (!selected.equals(focused)) {
          return Temporal.ZonedDateTime.from(toValue(context.selectedDate));
        }

        return undefined;
      },
    },
  };

  function handleKeyDown(e: KeyboardEvent): boolean {
    const shortcut = shortcuts[e.key];
    if (!shortcut) {
      return false;
    }

    const newDate = shortcut.fn();
    if (!newDate) {
      return false;
    }

    if (shortcut.type === 'focus') {
      context.setFocusedDay(newDate);
    } else {
      context.setDay(newDate);
    }

    return true;
  }

  return handleKeyDown;
}
