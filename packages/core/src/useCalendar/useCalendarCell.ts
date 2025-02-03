import { Reactivify } from '../types';
import { normalizeProps, withRefCapture } from '../utils/common';
import { CalendarContextKey } from './useCalendar';
import { computed, defineComponent, h, inject, shallowRef, toValue } from 'vue';
import { CalendarDay } from './types';

export function useCalendarCell(_props: Reactivify<CalendarDay>) {
  const props = normalizeProps(_props);
  const cellEl = shallowRef<HTMLElement>();
  const calendarCtx = inject(CalendarContextKey, null);

  function handleClick() {
    calendarCtx?.setDay(toValue(props.value));
  }

  const cellProps = computed(() => {
    return withRefCapture(
      {
        key: toValue(props.value).toString(),
        onClick: handleClick,
        'aria-selected': toValue(props.selected),
        'aria-disabled': toValue(props.disabled),
        tabindex: toValue(props.disabled) || !toValue(props.focused) ? '-1' : '0',
      },
      cellEl,
    );
  });

  return {
    cellProps,
  };
}

export const CalendarCell = defineComponent({
  props: ['value', 'dayOfMonth', 'isToday', 'selected', 'isOutsideMonth', 'disabled', 'focused'],
  setup(props) {
    const { cellProps } = useCalendarCell(props);

    return () => h('span', cellProps.value, String(props.dayOfMonth));
  },
});
