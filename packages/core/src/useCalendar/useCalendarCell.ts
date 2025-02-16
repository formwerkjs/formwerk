import { Reactivify } from '../types';
import { normalizeProps, withRefCapture } from '../utils/common';
import { computed, defineComponent, h, inject, shallowRef, toValue } from 'vue';
import { CalendarCellProps, CalendarViewType } from './types';
import { CalendarContextKey } from './constants';
import { createDisabledContext } from '../helpers/createDisabledContext';

export function useCalendarCell(_props: Reactivify<CalendarCellProps>) {
  const props = normalizeProps(_props);
  const cellEl = shallowRef<HTMLElement>();
  const calendarCtx = inject(CalendarContextKey, null);
  const isDisabled = createDisabledContext(props.disabled);

  function handleClick() {
    if (isDisabled.value) {
      return;
    }

    const type = toValue(props.type);
    const nextPanel: CalendarViewType | undefined = type === 'month' ? 'weeks' : type === 'year' ? 'months' : undefined;
    calendarCtx?.setDate(toValue(props.value), nextPanel);
  }

  const cellProps = computed(() => {
    const isFocused = toValue(props.focused);

    return withRefCapture(
      {
        key: toValue(props.value).toString(),
        onClick: isDisabled.value ? undefined : handleClick,
        'aria-selected': toValue(props.selected),
        'aria-disabled': isDisabled,
        tabindex: isDisabled.value || !isFocused ? '-1' : '0',
      },
      cellEl,
    );
  });

  const label = computed(() => toValue(props.label));

  return {
    cellProps,
    label,
  };
}

export const CalendarCell = defineComponent({
  name: 'CalendarCell',
  inheritAttrs: true,
  props: ['value', 'selected', 'disabled', 'focused', 'label', 'type', 'monthOfYear', 'year'],
  setup(props) {
    const { cellProps, label } = useCalendarCell(props);

    return () => h('span', cellProps.value, label.value);
  },
});
