import { InjectionKey, MaybeRefOrGetter, provide, ref, toValue, Ref, onBeforeUnmount, computed } from 'vue';
import { Temporal, Intl as TemporalIntl } from '@js-temporal/polyfill';
import { DateTimeSegmentType, TemporalDate } from './types';
import { hasKeyCode } from '../utils/common';
import { blockEvent } from '../utils/events';
import { Direction } from '../types';
import { useEventListener } from '../helpers/useEventListener';
import { isEditableSegmentType, segmentTypeToDurationLike } from './constants';

export interface DateTimeSegmentRegistration {
  id: string;
  getType(): DateTimeSegmentType;
  getElem(): HTMLElement | undefined;
}

export interface DateTimeSegmentGroupContext {
  useDateSegmentRegistration(segment: DateTimeSegmentRegistration): {
    increment(): void;
    decrement(): void;
  };
}

export const DateTimeSegmentGroupKey: InjectionKey<DateTimeSegmentGroupContext> = Symbol('DateTimeSegmentGroupKey');

export interface DateTimeSegmentGroupProps {
  formatter: Ref<TemporalIntl.DateTimeFormat>;
  dateValue: MaybeRefOrGetter<TemporalDate>;
  direction?: MaybeRefOrGetter<Direction>;
  controlEl: Ref<HTMLElement | undefined>;
  onValueChange: (value: TemporalDate) => void;
}

export function useDateTimeSegmentGroup({
  formatter,
  dateValue,
  direction,
  controlEl,
  onValueChange,
}: DateTimeSegmentGroupProps) {
  const renderedSegments = ref<DateTimeSegmentRegistration[]>([]);
  const segments = computed(() => {
    let date = toValue(dateValue);
    if (date instanceof Temporal.ZonedDateTime) {
      date = date.toPlainDateTime();
    }

    return formatter.value.formatToParts(date) as { type: DateTimeSegmentType; value: string }[];
  });

  function useDateSegmentRegistration(segment: DateTimeSegmentRegistration) {
    renderedSegments.value.push(segment);
    onBeforeUnmount(() => {
      renderedSegments.value = renderedSegments.value.filter(s => s.id !== segment.id);
    });

    function increment() {
      const type = segment.getType();
      const date = addToPart(type, toValue(dateValue), 1);

      onValueChange(date);
    }

    function decrement() {
      const type = segment.getType();
      const date = addToPart(type, toValue(dateValue), -1);

      onValueChange(date);
    }

    return {
      increment,
      decrement,
    };
  }

  function focusBasedOnDirection(evt: KeyboardEvent) {
    const dir = toValue(direction) ?? 'ltr';
    if (hasKeyCode(evt, 'ArrowLeft')) {
      return dir === 'ltr' ? focusPreviousSegment() : focusNextSegment();
    }

    if (hasKeyCode(evt, 'ArrowRight')) {
      return dir === 'ltr' ? focusNextSegment() : focusPreviousSegment();
    }
  }

  function getFocusedSegment() {
    return renderedSegments.value.find(s => s.getElem() === document.activeElement);
  }

  function getSegmentElements() {
    return Array.from(controlEl.value?.querySelectorAll('[data-segment-type]') || []);
  }

  function focusNextSegment() {
    const focusedElement = getFocusedSegment()?.getElem();
    if (!focusedElement) {
      return;
    }

    const segmentElements = getSegmentElements();
    const currentIndex = segmentElements.indexOf(focusedElement);
    const nextIndex = currentIndex + 1;
    for (let i = nextIndex; i < segmentElements.length; i++) {
      const element = segmentElements[i] as HTMLElement;
      if (element.tabIndex === 0) {
        element.focus();
        return;
      }
    }
  }

  function focusPreviousSegment() {
    const focusedElement = getFocusedSegment()?.getElem();
    if (!focusedElement) {
      return;
    }

    const segmentElements = getSegmentElements();
    const currentIndex = segmentElements.indexOf(focusedElement);
    const previousIndex = currentIndex - 1;
    for (let i = previousIndex; i >= 0; i--) {
      const element = segmentElements[i] as HTMLElement;
      if (element.tabIndex === 0) {
        element.focus();
        return;
      }
    }
  }

  function onKeydown(evt: KeyboardEvent) {
    if (hasKeyCode(evt, 'ArrowLeft') || hasKeyCode(evt, 'ArrowRight')) {
      blockEvent(evt);
      focusBasedOnDirection(evt);
      return;
    }
  }

  useEventListener(controlEl, 'keydown', onKeydown);

  provide(DateTimeSegmentGroupKey, {
    useDateSegmentRegistration,
  });

  return {
    segments,
    useDateSegmentRegistration,
  };
}

function addToPart(part: DateTimeSegmentType, currentDate: TemporalDate, diff: number) {
  if (!isEditableSegmentType(part)) {
    return currentDate;
  }

  if (part === 'dayPeriod') {
    diff = diff * 12;
  }

  const durationPart = segmentTypeToDurationLike(part);
  if (!durationPart) {
    return currentDate;
  }

  return currentDate.add({
    [durationPart]: diff,
  });
}
