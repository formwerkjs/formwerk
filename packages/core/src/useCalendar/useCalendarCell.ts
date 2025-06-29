import { Reactivify } from '../types';
import { normalizeProps, useCaptureProps } from '../utils/common';
import { computed, defineComponent, h, inject, shallowRef, toValue } from 'vue';
import { CalendarCellProps, CalendarViewType } from './types';
import { CalendarContextKey } from './constants';
import { createDisabledContext } from '../helpers/createDisabledContext';
import { blockEvent } from '../utils/events';

export function useCalendarCell(_props: Reactivify<CalendarCellProps>) {
  const props = normalizeProps(_props);
  const cellEl = shallowRef<HTMLElement>();
  const calendarCtx = inject(CalendarContextKey, null);
  const isDisabled = createDisabledContext(props.disabled);

  function handlePointerDown(e: PointerEvent) {
    if (isDisabled.value) {
      blockEvent(e);
      return;
    }
  }

  function handleClick(e: MouseEvent) {
    if (isDisabled.value) {
      blockEvent(e);
      return;
    }

    const type = toValue(props.type);
    const nextPanel: CalendarViewType | undefined = type === 'month' ? 'weeks' : type === 'year' ? 'months' : undefined;
    calendarCtx?.setDate(toValue(props.value), nextPanel);
  }

  const cellProps = useCaptureProps(() => {
    const isFocused = toValue(props.focused);

    return {
      onClick: handleClick,
      onPointerdown: handlePointerDown,
      'aria-selected': toValue(props.selected),
      'aria-disabled': isDisabled.value,
      tabindex: isDisabled.value || !isFocused ? '-1' : '0',
    };
  }, cellEl);

  const label = computed(() => toValue(props.label));

  return {
    cellProps,
    label,
    key: computed(() => `${toValue(props.type)}-${toValue(props.value).toString()}`),
  };
}

/**
 * A helper component that renders a calendar cell. You can build your own with `useCalendarCell`.
 */
export const CalendarCell = /*#__PURE__*/ defineComponent({
  name: 'CalendarCell',
  inheritAttrs: true,
  props: ['value', 'selected', 'disabled', 'focused', 'label', 'type', 'monthOfYear', 'year'],
  setup(props) {
    const { cellProps, label, key } = useCalendarCell(props);

    return () =>
      h(
        'span',
        {
          ...cellProps.value,
          key: key.value,
        },
        label.value,
      );
  },
});
