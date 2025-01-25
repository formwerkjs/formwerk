import { computed, defineComponent, h, inject, shallowRef, toValue } from 'vue';
import { Reactivify } from '../types';
import { normalizeProps, useUniqId, withRefCapture } from '../utils/common';
import { DateTimeSegmentGroupKey } from './useDateTimeSegmentGroup';
import { FieldTypePrefixes } from '../constants';

/**
 * lib.es2017.intl.d.ts
 */
export type DateTimeSegmentType =
  | 'day'
  | 'dayPeriod'
  | 'era'
  | 'hour'
  | 'literal'
  | 'minute'
  | 'month'
  | 'second'
  | 'timeZoneName'
  | 'weekday'
  | 'year';

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
  const isLiteral = () => toValue(props.type) === 'literal';

  if (!segmentGroup) {
    throw new Error('DateTimeSegmentGroup is not provided');
  }

  segmentGroup.useDateSegmentRegistration({
    id,
    getElem: () => segmentEl.value,
    getType: () => toValue(props.type),
  });

  const segmentProps = computed(() => {
    return withRefCapture(
      {
        id,
        tabindex: isLiteral() ? '-1' : '0',
        contenteditable: isLiteral() ? undefined : 'plaintext-only',
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
