import { InjectionKey, MaybeRefOrGetter, provide, ref, toValue, Ref, onBeforeUnmount, computed } from 'vue';
import { DateTimeSegmentType } from './useDateTimeSegment';
import { hasKeyCode } from '../utils/common';
import { blockEvent } from '../utils/events';
import { Direction } from '../types';
import { useEventListener } from '../helpers/useEventListener';

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
  formatter: Ref<Intl.DateTimeFormat>;
  dateValue: MaybeRefOrGetter<Date>;
  direction?: MaybeRefOrGetter<Direction>;
  controlEl: Ref<HTMLElement | undefined>;
  onValueChange: (value: Date) => void;
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
    return formatter.value.formatToParts(toValue(dateValue)) as { type: DateTimeSegmentType; value: string }[];
  });

  function useDateSegmentRegistration(segment: DateTimeSegmentRegistration) {
    renderedSegments.value.push(segment);
    onBeforeUnmount(() => {
      renderedSegments.value = renderedSegments.value.filter(s => s.id !== segment.id);
    });

    function increment() {
      const type = segment.getType();
      const diff = 1;
      const date = addToPart(type, toValue(dateValue), diff);

      onValueChange(date);
    }

    function decrement() {
      const type = segment.getType();
      const diff = -1;
      const date = addToPart(type, toValue(dateValue), diff);

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
    return Array.from(controlEl.value?.querySelectorAll('[data-segment-type]') || []).filter(el => {
      return (el as HTMLElement).tabIndex === 0;
    }) as HTMLElement[];
  }

  function focusNextSegment() {
    const focusedElement = getFocusedSegment()?.getElem();
    if (!focusedElement) {
      return;
    }

    const segmentElements = getSegmentElements();
    const currentIndex = segmentElements.indexOf(focusedElement);
    const nextIndex = currentIndex + 1;
    if (nextIndex < segmentElements.length) {
      segmentElements[nextIndex]?.focus();
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
    if (previousIndex >= 0) {
      segmentElements[previousIndex]?.focus();
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

function addToPart(part: DateTimeSegmentType, currentDate: Date, diff: number) {
  const date = new Date(currentDate.getTime());
  if (part === 'day') {
    date.setDate(date.getDate() + diff);
  }

  if (part === 'month') {
    date.setMonth(date.getMonth() + diff);
  }

  if (part === 'year') {
    date.setFullYear(date.getFullYear() + diff);
  }

  if (part === 'hour') {
    date.setHours(date.getHours() + diff);
  }

  if (part === 'minute') {
    date.setMinutes(date.getMinutes() + diff);
  }

  if (part === 'second') {
    date.setSeconds(date.getSeconds() + diff);
  }

  if (part === 'dayPeriod') {
    date.setHours(date.getHours() + Math.sign(diff) * 12);
  }

  return date;
}
