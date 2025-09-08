import { computed, inject, nextTick, provide, Ref, shallowRef, toValue, watch } from 'vue';
import { CalendarContext, CalendarViewType } from './types';
import { hasKeyCode, normalizeProps, useCaptureProps, useUniqId } from '../utils/common';
import { ControlProps, Maybe, Reactivify } from '../types';
import { useLocale } from '../i18n';
import { FieldTypePrefixes } from '../constants';
import { blockEvent } from '../utils/events';
import { useLabel } from '../a11y';
import { useControlButtonProps } from '../helpers/useControlButtonProps';
import { CalendarContextKey, YEAR_CELLS_COUNT } from './constants';
import { CalendarView, useCalendarView } from './useCalendarView';
import { Calendar, ZonedDateTime, now, toCalendar } from '@internationalized/date';
import { FieldState, resolveFieldState } from '../useFormField';
import { fromDateToCalendarZonedDateTime, useTemporalStore } from '../useDateTime/useTemporalStore';
import { PickerContextKey } from '../usePicker';
import { createDisabledContext } from '../helpers/createDisabledContext';
import { useVModelProxy } from '../reactivity/useVModelProxy';
import { useConstraintsValidator, useInputValidity } from '../validation';
import { useFieldControllerContext } from '../useFormField/useFieldController';
import { registerField } from '@formwerk/devtools';

export interface CalendarControlProps extends ControlProps<Date | undefined> {
  /**
   * The locale to use for the calendar.
   */
  locale?: string;

  /**
   * The calendar type to use for the calendar, e.g. `gregory`, `islamic-umalqura`, etc.
   */
  calendar?: Calendar;

  /**
   * The time zone to use for the calendar.
   */
  timeZone?: string;

  /**
   * Whether the calendar is readonly.
   */
  readonly?: boolean;

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
  min?: Maybe<Date>;

  /**
   * The maximum date to use for the calendar.
   */
  max?: Maybe<Date>;

  /**
   * The format option for the days of the week.
   */
  weekDayFormat?: Intl.DateTimeFormatOptions['weekday'];

  /**
   * The format option for the month.
   */
  monthFormat?: Intl.DateTimeFormatOptions['month'];

  /**
   * The format option for the year.
   */
  yearFormat?: Intl.DateTimeFormatOptions['year'];

  /**
   * The available views to switch to and from in the calendar.
   */
  allowedViews?: CalendarViewType[];

  /**
   * The field state to use for the calendar.
   */
  field?: FieldState<Date | undefined>;
}

export function useCalendarControl(_props: Reactivify<CalendarControlProps, 'field' | 'schema' | '_field'>) {
  const props = normalizeProps(_props, ['field', 'schema', '_field']);
  const { weekInfo, locale, calendar, timeZone, direction } = useLocale(props.locale, {
    calendar: () => toValue(props.calendar),
    timeZone: () => toValue(props.timeZone),
  });

  const pickerContext = inject(PickerContextKey, null);
  const calendarId = useUniqId(FieldTypePrefixes.Calendar);
  const gridId = `${calendarId}-g`;
  const calendarEl = shallowRef<HTMLElement>();
  const gridEl = shallowRef<HTMLElement>();
  const calendarLabelEl = shallowRef<HTMLElement>();
  const field = props.field ?? resolveFieldState<Date | undefined>(props);
  const controller = useFieldControllerContext(props);
  const { model, setModelValue } = useVModelProxy(field);

  const temporalValue = useTemporalStore({
    calendar: calendar,
    timeZone: timeZone,
    locale: locale,
    model: {
      get: () => model.value,
      set: value => setModelValue(value ?? undefined),
    },
  });

  // If no overarching field is provided, then the calendar will be promoted to a full form field.
  // Happens if no date field is controlling the calendar, but the calendar is used as a child of a form field.
  if (!props.field) {
    const { element } = useConstraintsValidator({
      type: 'date',
      value: model,
      source: calendarEl,
      required: props.required,
    });

    useInputValidity({ field, inputEl: element });

    controller?.registerControl({
      getControlId: () => calendarId,
      getControlElement: () => calendarEl.value,
    });
  }

  const isDisabled = field.isDisabled ?? createDisabledContext(props.disabled);
  const selectedDate = computed(() => temporalValue.value ?? toCalendar(now(toValue(timeZone)), calendar.value));
  const focusedDay = shallowRef<ZonedDateTime>();

  function getFocusedOrSelected() {
    if (focusedDay.value) {
      return focusedDay.value;
    }

    return selectedDate.value;
  }

  const min = computed(() => fromDateToCalendarZonedDateTime(toValue(props.min), calendar.value, timeZone.value));
  const max = computed(() => fromDateToCalendarZonedDateTime(toValue(props.max), calendar.value, timeZone.value));

  const context: CalendarContext = {
    weekInfo,
    locale,
    calendar,
    timeZone,
    getSelectedDate: () => selectedDate.value,
    getFocusedDate: getFocusedOrSelected,
    setDate,
    setFocusedDate: async (date: ZonedDateTime) => {
      if (isDisabled.value || toValue(props.readonly)) {
        return;
      }

      focusedDay.value = date;
      await nextTick();
      focusCurrent();
    },
    getMinDate: () => min.value,
    getMaxDate: () => max.value,
  };

  provide(CalendarContextKey, context);

  const {
    currentView,
    setView,
    viewLabel: gridLabel,
  } = useCalendarView(
    {
      weekDayFormat: props.weekDayFormat,
      monthFormat: props.monthFormat,
      yearFormat: props.yearFormat,
    },
    context,
  );

  function setDate(date: ZonedDateTime, view?: CalendarViewType) {
    if (isDisabled.value || toValue(props.readonly)) {
      return;
    }

    temporalValue.value = date;
    focusedDay.value = date;
    if (view) {
      setView(view);
    } else if (currentView.value.type === 'weeks') {
      // Automatically close the calendar when a day is selected
      pickerContext?.close();
    }
  }

  const handleKeyDown = useCalendarKeyboard(context, currentView);

  const pickerHandlers = {
    onKeydown(e: KeyboardEvent) {
      const handled = handleKeyDown(e);
      if (handled) {
        blockEvent(e);
        return;
      }

      if (hasKeyCode(e, 'Escape')) {
        pickerContext?.close();
      }

      if (hasKeyCode(e, 'Tab')) {
        pickerContext?.close();
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

  watch(
    () => pickerContext?.isOpen(),
    async value => {
      if (pickerContext && !value) {
        focusedDay.value = undefined;
        setView('weeks');
        return;
      }

      if (!focusedDay.value) {
        focusedDay.value = selectedDate.value.copy();
      }

      await nextTick();
      focusCurrent();
    },
    { immediate: true },
  );

  const calendarProps = useCaptureProps(() => {
    return {
      id: calendarId,
      ...pickerHandlers,
      role: 'application',
      dir: direction.value,
    };
  }, calendarEl);

  const nextButtonProps = useControlButtonProps(() => ({
    id: `${calendarId}-next`,
    'aria-label': 'Next',
    disabled: isDisabled.value || toValue(props.readonly),
    onClick: () => {
      if (currentView.value.type === 'weeks') {
        context.setFocusedDate(context.getFocusedDate().add({ months: 1 }));
        return;
      }

      if (currentView.value.type === 'months') {
        context.setFocusedDate(context.getFocusedDate().add({ years: 1 }));
        return;
      }

      context.setFocusedDate(currentView.value.years[currentView.value.years.length - 1].value.add({ years: 1 }));
    },
  }));

  const previousButtonProps = useControlButtonProps(() => ({
    id: `${calendarId}-previous`,
    'aria-label': 'Previous',
    disabled: isDisabled.value || toValue(props.readonly),
    onClick: () => {
      if (currentView.value.type === 'weeks') {
        context.setFocusedDate(context.getFocusedDate().subtract({ months: 1 }));
        return;
      }

      if (currentView.value.type === 'months') {
        context.setFocusedDate(context.getFocusedDate().subtract({ years: 1 }));
        return;
      }

      context.setFocusedDate(currentView.value.years[0].value.subtract({ years: 1 }));
    },
  }));

  const { labelProps: monthYearLabelBaseProps, labelledByProps } = useLabel({
    targetRef: gridEl,
    for: gridId,
    label: gridLabel,
  });

  function isAllowedView(view: CalendarViewType) {
    return toValue(props.allowedViews)?.includes(view) ?? true;
  }

  const gridLabelProps = useCaptureProps(() => {
    return {
      ...monthYearLabelBaseProps.value,
      'aria-live': 'polite' as const,
      tabindex: '-1',
      onClick: () => {
        if (isDisabled.value || toValue(props.readonly)) {
          return;
        }

        if (currentView.value.type === 'weeks') {
          if (isAllowedView('months')) {
            setView('months');
          }

          return;
        }

        if (currentView.value.type === 'months') {
          if (isAllowedView('years')) {
            setView('years');
          }

          return;
        }
      },
    };
  }, calendarLabelEl);

  const gridProps = useCaptureProps(() => {
    return {
      id: gridId,
      role: 'grid',
      ...labelledByProps.value,
    };
  }, gridEl);

  if (__DEV__) {
    // If it is its own field, we should register it with devtools.
    if (!props.field) {
      registerField(field, 'Calendar');
    }
  }

  return {
    /**
     * The id of the calendar element.
     */
    controlId: calendarId,

    /**
     * The props for the calendar element.
     */
    calendarProps,
    /**
     * The props for the grid element that displays the panel values.
     */
    gridProps,

    /**
     * The current date.
     */
    selectedDate,
    /**
     * The focused date.
     */
    focusedDate: focusedDay,
    /**
     * The current view.
     */
    currentView,
    /**
     * Switches the current view (e.g: weeks, months, years)
     */
    setView,
    /**
     * The props for the panel label element.
     */
    gridLabelProps,
    /**
     * The props for the next panel values button. if it is a day panel, the button will move the panel to the next month. If it is a month panel, the button will move the panel to the next year. If it is a year panel, the button will move the panel to the next set of years.
     */
    nextButtonProps,
    /**
     * The props for the previous panel values button. If it is a day panel, the button will move the panel to the previous month. If it is a month panel, the button will move the panel to the previous year. If it is a year panel, the button will move the panel to the previous set of years.
     */
    previousButtonProps,
    /**
     * The label for the current panel. If it is a day panel, the label will be the month and year. If it is a month panel, the label will be the year. If it is a year panel, the label will be the range of years currently being displayed.
     */
    gridLabel,

    /**
     * The field state.
     */
    field,
  };
}

interface ShortcutDefinition {
  fn: () => ZonedDateTime | undefined;
  type: 'focus' | 'select';
}

export function useCalendarKeyboard(context: CalendarContext, currentPanel: Ref<CalendarView>) {
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
    if (panelType === 'weeks') {
      if (direction === 'up' || direction === 'down') {
        return { weeks: 1 };
      }

      return { days: 1 };
    }

    if (panelType === 'months') {
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
        if (type === 'weeks') {
          return context.getFocusedDate().add({ months: 1 });
        }

        if (type === 'months') {
          return context.getFocusedDate().add({ years: 1 });
        }

        return context.getFocusedDate().add({ years: YEAR_CELLS_COUNT });
      },
      type: 'focus',
    },
    PageUp: {
      fn: () => {
        const type = currentPanel.value.type;
        if (type === 'weeks') {
          return context.getFocusedDate().subtract({ months: 1 });
        }

        if (type === 'months') {
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
        if (type === 'weeks') {
          if (current.day === 1) {
            return current.subtract({ months: 1 }).set({ day: 1 });
          }

          return current.set({ day: 1 });
        }

        if (type === 'months') {
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
        if (type === 'weeks') {
          if (current.day === current.calendar.getDaysInMonth(current)) {
            return current.add({ months: 1 }).set({ day: 1 });
          }

          return current.set({ day: current.calendar.getDaysInMonth(current) });
        }

        if (type === 'months') {
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
      context.setDate(newDate, panelType === 'years' ? 'months' : panelType === 'months' ? 'weeks' : undefined);
    }

    return true;
  }

  return handleKeyDown;
}
