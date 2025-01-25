import { Reactivify } from '../types';
import { normalizeProps } from '../utils/common';
import { CalendarContextKey } from './useCalendar';
import { computed, defineComponent, h, inject, toValue } from 'vue';
import { CalendarDay } from './types';

export function useCalendarCell(_props: Reactivify<CalendarDay>) {
  const props = normalizeProps(_props);
  const calendarCtx = inject(CalendarContextKey, null);
  if (!calendarCtx) {
    throw new Error('Calendar context not found');
  }

  const cellProps = computed(() => ({
    key: toValue(props.value).toString(),
    onClick() {
      calendarCtx.setDay(toValue(props.value));
    },
  }));

  return {
    cellProps,
  };
}

export const CalendarCell = defineComponent({
  props: ['value', 'dayOfMonth', 'isToday', 'isSelected', 'isOutsideMonth'],
  setup(props) {
    const { cellProps } = useCalendarCell(props);

    return () => h('span', cellProps.value, String(props.dayOfMonth));
  },
});
