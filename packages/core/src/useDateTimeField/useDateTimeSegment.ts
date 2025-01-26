import { computed, CSSProperties, defineComponent, h, inject, shallowRef, toValue } from 'vue';
import { Reactivify } from '../types';
import { hasKeyCode, normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { DateTimeSegmentGroupKey } from './useDateTimeSegmentGroup';
import { FieldTypePrefixes } from '../constants';
import { blockEvent } from '../utils/events';
import { DateTimeSegmentType } from './types';
import { isEditableSegmentType } from './constants';

export interface DateTimeSegmentProps {
  /**
   * The type of the segment.
   */
  type: DateTimeSegmentType;

  /**
   * The text value of the segment.
   */
  value: string;

  /**
   * Whether the segment is disabled.
   */
  disabled?: boolean;
}

interface DateTimeSegmentDomProps {
  id: string;
  tabindex: number;
  contenteditable: string | undefined;
  'aria-disabled': boolean | undefined;
  'data-segment-type': DateTimeSegmentType;
  style?: CSSProperties;
}

export function useDateTimeSegment(_props: Reactivify<DateTimeSegmentProps>) {
  const props = normalizeProps(_props);
  const id = useUniqId(FieldTypePrefixes.DateTimeSegment);
  const segmentEl = shallowRef<HTMLSpanElement>();
  const segmentGroup = inject(DateTimeSegmentGroupKey, null);
  const isNonEditable = () => toValue(props.disabled) || !isEditableSegmentType(toValue(props.type));

  if (!segmentGroup) {
    throw new Error('DateTimeSegmentGroup is not provided');
  }

  const { increment, decrement } = segmentGroup.useDateSegmentRegistration({
    id,
    getElem: () => segmentEl.value,
    getType: () => toValue(props.type),
  });

  const handlers = {
    onFocus() {},
    onKeydown(evt: KeyboardEvent) {
      if (hasKeyCode(evt, 'ArrowUp')) {
        blockEvent(evt);
        if (!isNonEditable()) {
          increment();
        }
        return;
      }

      if (hasKeyCode(evt, 'ArrowDown')) {
        blockEvent(evt);
        if (!isNonEditable()) {
          decrement();
        }
        return;
      }
    },
  };

  const segmentProps = computed(() => {
    const domProps: DateTimeSegmentDomProps = {
      id,
      tabindex: isNonEditable() ? -1 : 0,
      contenteditable: isNonEditable() ? undefined : 'plaintext-only',
      'aria-disabled': toValue(props.disabled),
      'data-segment-type': toValue(props.type),
      ...handlers,
    };

    if (isNonEditable()) {
      domProps.style = { pointerEvents: 'none' };
    }

    return withRefCapture(domProps, segmentEl);
  });

  return {
    segmentProps,
  };
}

export const DateTimeSegment = defineComponent<DateTimeSegmentProps>({
  name: 'DateTimeSegment',
  props: ['type', 'value', 'disabled'],
  setup(props) {
    const { segmentProps } = useDateTimeSegment(props);

    return () => h('span', segmentProps.value, props.value);
  },
});
