import { computed, defineComponent, h, inject, shallowRef, toValue } from 'vue';
import { Reactivify } from '../types';
import { hasKeyCode, normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { DateTimeSegmentGroupKey } from './useDateTimeSegmentGroup';
import { FieldTypePrefixes } from '../constants';
import { blockEvent } from '../utils/events';
import { DateTimeSegmentType } from './types';
import { NON_EDITABLE_SEGMENT_TYPES } from './constants';

export interface DateTimeSegmentProps {
  /**
   * The type of the segment.
   */
  type: DateTimeSegmentType;

  /**
   * The text value of the segment.
   */
  value: string;
}

export function useDateTimeSegment(_props: Reactivify<DateTimeSegmentProps>) {
  const props = normalizeProps(_props);
  const id = useUniqId(FieldTypePrefixes.DateTimeSegment);
  const segmentEl = shallowRef<HTMLSpanElement>();
  const segmentGroup = inject(DateTimeSegmentGroupKey, null);
  const isNonEditable = () => NON_EDITABLE_SEGMENT_TYPES.includes(toValue(props.type));

  if (!segmentGroup) {
    throw new Error('DateTimeSegmentGroup is not provided');
  }

  const { increment, decrement } = segmentGroup.useDateSegmentRegistration({
    id,
    getElem: () => segmentEl.value,
    getType: () => toValue(props.type),
  });

  const handlers = {
    onKeydown(evt: KeyboardEvent) {
      if (isNonEditable()) {
        blockEvent(evt);
        return;
      }

      if (hasKeyCode(evt, 'ArrowUp')) {
        blockEvent(evt);
        increment();
        return;
      }

      if (hasKeyCode(evt, 'ArrowDown')) {
        blockEvent(evt);
        decrement();
        return;
      }
    },
  };

  const segmentProps = computed(() => {
    return withRefCapture(
      {
        id,
        tabindex: isNonEditable() ? '-1' : '0',
        contenteditable: isNonEditable() ? undefined : 'plaintext-only',
        'data-segment-type': toValue(props.type),
        ...handlers,
      },
      segmentEl,
    );
  });

  return {
    segmentProps,
  };
}

export const DateTimeSegment = defineComponent<DateTimeSegmentProps>({
  name: 'DateTimeSegment',
  props: ['type', 'value'],
  setup(props) {
    const { segmentProps } = useDateTimeSegment(props);

    return () => h('span', segmentProps.value, props.value);
  },
});
