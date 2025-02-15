import { computed, nextTick, provide, Ref, ref, shallowRef, toValue, watch } from 'vue';
import { CalendarContext, CalendarPanelType } from './types';
import { hasKeyCode, normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { Maybe, Reactivify } from '../types';
import { useLocale } from '../i18n';
import { FieldTypePrefixes } from '../constants';
import { usePopoverController } from '../helpers/usePopoverController';
import { blockEvent } from '../utils/events';
import { useLabel } from '../a11y';
import { useControlButtonProps } from '../helpers/useControlButtonProps';
import { CalendarContextKey, MONTHS_COLUMNS_COUNT, YEAR_CELLS_COUNT, YEARS_COLUMNS_COUNT } from './constants';
import { CalendarPanel, useCalendarPanel } from './useCalendarPanel';
import { Calendar, ZonedDateTime, now, toCalendar } from '@internationalized/date';

export interface CalendarProps {
  /**
   * The locale to use for the calendar.
   */
  locale?: string;

  /**
   * The current date to use for the calendar.
   */
  currentDate?: ZonedDateTime;

  /**
   * The callback to call when a day is selected.
   */
  onDaySelected?: (day: ZonedDateTime) => void;

  /**
   * The calendar type to use for the calendar, e.g. `gregory`, `islamic-umalqura`, etc.
   */
  calendar?: Calendar;

  /**
   * Whether the calendar is disabled.
   */
  disabled?: boolean;

  /**
   * The label for the next month button.
   */
  nextMonthButtonLabel?: string;

  /**
   * The label for the previous month button.
   */
  previousMonthButtonLabel?: string;

  /**
   * The minimum date to use for the calendar.
   */
  minDate?: Maybe<ZonedDateTime>;

  /**
   * The maximum date to use for the calendar.
   */
  maxDate?: Maybe<ZonedDateTime>;

  /**
   * The format options for the days of the week.
   */
  daysOfWeekFormat?: Intl.DateTimeFormatOptions['weekday'];

  /**
   * The format options for the month.
   */
  monthFormat?: Intl.DateTimeFormatOptions['month'];

  /**
   * The format options for the year.
   */
  yearFormat?: Intl.DateTimeFormatOptions['year'];
}

export function useCalendar(_props: Reactivify<CalendarProps, 'onDaySelected'> = {}) {
  const props = normalizeProps(_props, ['onDaySelected']);
  const calendarId = useUniqId(FieldTypePrefixes.Calendar);
  const gridId = `${calendarId}-g`;
  const pickerEl = ref<HTMLElement>();
  const gridEl = ref<HTMLElement>();
  const calendarLabelEl = ref<HTMLElement>();
  const { weekInfo, locale, calendar, timeZone } = useLocale(props.locale, {
    calendar: () => toValue(props.calendar),
  });

  const selectedDate = computed(() => toValue(props.currentDate) ?? toCalendar(now(toValue(timeZone)), calendar.value));
  const focusedDay = shallowRef<ZonedDateTime>();
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
    timeZone,
    getSelectedDate: () => selectedDate.value,
    getFocusedDate: getFocusedOrSelected,
    setDate: (date: ZonedDateTime, panel?: CalendarPanelType) => {
      props.onDaySelected?.(date);
      if (panel) {
        switchPanel(panel);
      } else if (currentPanel.value.type === 'day') {
        // Automatically close the calendar when a day is selected
        isOpen.value = false;
      }
    },
    setFocusedDate: async (date: ZonedDateTime) => {
      focusedDay.value = date;
      await nextTick();
      focusCurrent();
    },
    getMinDate: () => toValue(props.minDate),
    getMaxDate: () => toValue(props.maxDate),
  };

  provide(CalendarContextKey, context);

  const { currentPanel, switchPanel, panelLabel } = useCalendarPanel(
    {
      daysOfWeekFormat: props.daysOfWeekFormat,
      monthFormat: props.monthFormat,
      yearFormat: props.yearFormat,
    },
    context,
  );

  const handleKeyDown = useCalendarKeyboard(context, currentPanel);
  const buttonProps = useControlButtonProps(() => ({
    onClick: () => {
      isOpen.value = true;
    },
  }));

  const pickerHandlers = {
    onKeydown(e: KeyboardEvent) {
      const handled = handleKeyDown(e);
      if (handled) {
        blockEvent(e);
        return;
      }

      if (hasKeyCode(e, 'Escape')) {
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
      switchPanel('day');
      return;
    }

    if (!focusedDay.value) {
      focusedDay.value = selectedDate.value.copy();
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

  const nextPanelButtonProps = useControlButtonProps(() => ({
    id: `${calendarId}-next`,
    onClick: () => {
      if (currentPanel.value.type === 'day') {
        context.setFocusedDate(context.getFocusedDate().add({ months: 1 }));
        return;
      }

      if (currentPanel.value.type === 'month') {
        context.setFocusedDate(context.getFocusedDate().add({ years: 1 }));
        return;
      }

      context.setFocusedDate(currentPanel.value.years[currentPanel.value.years.length - 1].value.add({ years: 1 }));
    },
  }));

  const previousPanelButtonProps = useControlButtonProps(() => ({
    id: `${calendarId}-previous`,
    onClick: () => {
      if (currentPanel.value.type === 'day') {
        context.setFocusedDate(context.getFocusedDate().subtract({ months: 1 }));
        return;
      }

      if (currentPanel.value.type === 'month') {
        context.setFocusedDate(context.getFocusedDate().subtract({ years: 1 }));
        return;
      }

      context.setFocusedDate(currentPanel.value.years[0].value.subtract({ years: 1 }));
    },
  }));

  const { labelProps: monthYearLabelBaseProps } = useLabel({
    targetRef: gridEl,
    for: gridId,
    label: panelLabel,
  });

  const panelLabelProps = computed(() => {
    return withRefCapture(
      {
        ...monthYearLabelBaseProps.value,
        'aria-live': 'polite' as const,
        tabindex: '-1',
        onClick: () => {
          if (currentPanel.value.type === 'day') {
            switchPanel('month');

            return;
          }

          if (currentPanel.value.type === 'month') {
            switchPanel('year');
            return;
          }
        },
      },
      calendarLabelEl,
    );
  });

  const panelGridProps = computed(() => {
    const panelType = currentPanel.value.type;
    const columns =
      panelType === 'day'
        ? currentPanel.value.weekDays.length
        : panelType === 'month'
          ? MONTHS_COLUMNS_COUNT
          : YEARS_COLUMNS_COUNT;

    return withRefCapture(
      {
        id: `${calendarId}-g`,
        role: 'grid',
        style: {
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
        },
      },
      gridEl,
    );
  });

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
     * The props for the grid element that displays the panel values.
     */
    panelGridProps,
    /**
     * The props for the button element.
     */
    buttonProps,
    /**
     * The current date.
     */
    selectedDate,
    /**
     * The focused date.
     */
    focusedDate: focusedDay,
    /**
     * The current panel.
     */
    currentPanel,
    /**
     * Switches the current panel from day to month or year.
     */
    switchPanel,
    /**
     * The props for the panel label element.
     */
    panelLabelProps,
    /**
     * The props for the next panel values button. if it is a day panel, the button will move the panel to the next month. If it is a month panel, the button will move the panel to the next year. If it is a year panel, the button will move the panel to the next set of years.
     */
    nextPanelButtonProps,
    /**
     * The props for the previous panel values button. If it is a day panel, the button will move the panel to the previous month. If it is a month panel, the button will move the panel to the previous year. If it is a year panel, the button will move the panel to the previous set of years.
     */
    previousPanelButtonProps,
    /**
     * The label for the current panel. If it is a day panel, the label will be the month and year. If it is a month panel, the label will be the year. If it is a year panel, the label will be the range of years currently being displayed.
     */
    panelLabel,
  };
}

interface ShortcutDefinition {
  fn: () => ZonedDateTime | undefined;
  type: 'focus' | 'select';
}

export function useCalendarKeyboard(context: CalendarContext, currentPanel: Ref<CalendarPanel>) {
  function withCheckedBounds(fn: () => ZonedDateTime | undefined) {
    const date = fn();
    if (!date) {
      return undefined;
    }

    const minDate = context.getMinDate();
    const maxDate = context.getMaxDate();

    if (date && ((minDate && date.compare(minDate) < 0) || (maxDate && date.compare(maxDate) > 0))) {
      return undefined;
    }

    return date;
  }

  function getIncrement(direction: 'up' | 'down' | 'left' | 'right') {
    const panelType = currentPanel.value.type;
    if (panelType === 'day') {
      if (direction === 'up' || direction === 'down') {
        return { weeks: 1 };
      }

      return { days: 1 };
    }

    if (panelType === 'month') {
      if (direction === 'up' || direction === 'down') {
        return { months: 3 };
      }

      return { months: 1 };
    }

    if (direction === 'up' || direction === 'down') {
      return { years: 3 };
    }

    return { years: 1 };
  }

  const shortcuts: Partial<Record<string, ShortcutDefinition>> = {
    ArrowLeft: {
      fn: () => context.getFocusedDate().subtract(getIncrement('left')),
      type: 'focus',
    },
    ArrowRight: {
      fn: () => context.getFocusedDate().add(getIncrement('right')),
      type: 'focus',
    },
    ArrowUp: {
      fn: () => context.getFocusedDate().subtract(getIncrement('up')),
      type: 'focus',
    },
    ArrowDown: {
      fn: () => context.getFocusedDate().add(getIncrement('down')),
      type: 'focus',
    },
    Enter: {
      fn: () => context.getFocusedDate(),
      type: 'select',
    },
    PageDown: {
      fn: () => {
        const type = currentPanel.value.type;
        if (type === 'day') {
          return context.getFocusedDate().add({ months: 1 });
        }

        if (type === 'month') {
          return context.getFocusedDate().add({ years: 1 });
        }

        return context.getFocusedDate().add({ years: YEAR_CELLS_COUNT });
      },
      type: 'focus',
    },
    PageUp: {
      fn: () => {
        const type = currentPanel.value.type;
        if (type === 'day') {
          return context.getFocusedDate().subtract({ months: 1 });
        }

        if (type === 'month') {
          return context.getFocusedDate().subtract({ years: 1 });
        }

        return context.getFocusedDate().subtract({ years: YEAR_CELLS_COUNT });
      },
      type: 'focus',
    },
    Home: {
      fn: () => {
        const current = context.getFocusedDate();
        const type = currentPanel.value.type;
        if (type === 'day') {
          if (current.day === 1) {
            return current.subtract({ months: 1 }).set({ day: 1 });
          }

          return current.set({ day: 1 });
        }

        if (type === 'month') {
          if (current.month === 1) {
            return current.subtract({ years: 1 }).set({ month: 1 });
          }

          return current.set({ month: 1 });
        }

        return current.set({ year: current.year - YEAR_CELLS_COUNT });
      },
      type: 'focus',
    },
    End: {
      type: 'focus',
      fn: () => {
        const type = currentPanel.value.type;
        const current = context.getFocusedDate();
        if (type === 'day') {
          if (current.day === current.calendar.getDaysInMonth(current)) {
            return current.add({ months: 1 }).set({ day: 1 });
          }

          return current.set({ day: current.calendar.getDaysInMonth(current) });
        }

        if (type === 'month') {
          if (current.month === current.calendar.getMonthsInYear(current)) {
            return current.add({ years: 1 }).set({ month: 1 });
          }

          return current.set({ month: current.calendar.getMonthsInYear(current) });
        }

        return current.set({ year: current.year + YEAR_CELLS_COUNT });
      },
    },
    Escape: {
      type: 'focus',
      fn: () => {
        const selected = context.getSelectedDate();
        const focused = context.getFocusedDate();
        if (selected.compare(focused) !== 0) {
          return context.getSelectedDate();
        }

        return undefined;
      },
    },
  };

  function handleKeyDown(e: KeyboardEvent): boolean {
    const shortcut = shortcuts[e.code];
    if (!shortcut) {
      return false;
    }

    const newDate = withCheckedBounds(shortcut.fn);
    if (!newDate) {
      return false;
    }

    if (shortcut.type === 'focus') {
      context.setFocusedDate(newDate);
    } else {
      const panelType = currentPanel.value.type;
      context.setDate(newDate, panelType === 'year' ? 'month' : panelType === 'month' ? 'day' : undefined);
    }

    return true;
  }

  return handleKeyDown;
}
