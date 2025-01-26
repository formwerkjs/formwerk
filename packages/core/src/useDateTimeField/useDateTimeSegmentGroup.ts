import { InjectionKey, MaybeRefOrGetter, provide, ref, toValue, Ref, onBeforeUnmount, computed } from 'vue';
import { Temporal, Intl as TemporalIntl } from '@js-temporal/polyfill';
import { DateTimeSegmentType, TemporalValue } from './types';
import { hasKeyCode } from '../utils/common';
import { blockEvent } from '../utils/events';
import { Direction } from '../types';
import { useEventListener } from '../helpers/useEventListener';
import { isEditableSegmentType, segmentTypeToDurationLike } from './constants';
import { CalendarIdentifier } from '../useCalendar';

export interface DateTimeSegmentRegistration {
  id: string;
  getType(): DateTimeSegmentType;
  getElem(): HTMLElement | undefined;
}

export interface DateTimeSegmentGroupContext {
  useDateSegmentRegistration(segment: DateTimeSegmentRegistration): {
    increment(): void;
    decrement(): void;
    setValue(value: number): void;
  };
}

export const DateTimeSegmentGroupKey: InjectionKey<DateTimeSegmentGroupContext> = Symbol('DateTimeSegmentGroupKey');

export interface DateTimeSegmentGroupProps {
  formatter: Ref<TemporalIntl.DateTimeFormat>;
  calendar: MaybeRefOrGetter<CalendarIdentifier>;
  timeZone: MaybeRefOrGetter<string>;
  dateValue: MaybeRefOrGetter<TemporalValue>;
  direction?: MaybeRefOrGetter<Direction>;
  controlEl: Ref<HTMLElement | undefined>;
  onValueChange: (value: TemporalValue) => void;
}

export function useDateTimeSegmentGroup({
  formatter,
  dateValue,
  direction,
  controlEl,
  calendar,
  timeZone,
  onValueChange,
}: DateTimeSegmentGroupProps) {
  const renderedSegments = ref<DateTimeSegmentRegistration[]>([]);
  const { setPart, addToPart } = useDateArithmetic({
    currentDate: dateValue,
    calendar: calendar,
    timeZone: timeZone,
  });

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
      const date = addToPart(type, 1);

      onValueChange(date);
    }

    function decrement() {
      const type = segment.getType();
      const date = addToPart(type, -1);

      onValueChange(date);
    }

    function setValue(value: number) {
      const type = segment.getType();
      const date = setPart(type, value);

      onValueChange(date);
    }

    return {
      increment,
      decrement,
      setValue,
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

interface ArithmeticInit {
  currentDate: MaybeRefOrGetter<TemporalValue>;
  calendar: MaybeRefOrGetter<CalendarIdentifier>;
  timeZone: MaybeRefOrGetter<string>;
}

function useDateArithmetic({ calendar, timeZone, currentDate }: ArithmeticInit) {
  function setPart(part: DateTimeSegmentType, value: number) {
    let date = toValue(currentDate);

    if (!isEditableSegmentType(part)) {
      return date;
    }

    if (part === 'dayPeriod') {
      return addToPart(part, Math.sign(value));
    }

    const durationPart = segmentTypeToDurationLike(part);
    if (!durationPart) {
      return date;
    }

    if (date instanceof Temporal.Instant) {
      date = date.toZonedDateTime({
        timeZone: toValue(timeZone),
        calendar: toValue(calendar),
      });
    }

    return date.with({
      [durationPart]: value,
    });
  }

  function addToPart(part: DateTimeSegmentType, diff: number) {
    const date = toValue(currentDate);

    if (!isEditableSegmentType(part)) {
      return date;
    }

    if (part === 'dayPeriod') {
      diff = diff * 12;
    }

    const durationPart = segmentTypeToDurationLike(part);
    if (!durationPart) {
      return date;
    }

    // Preserves the day, month, and year when adding to the part so it doesn't overflow.
    if (date instanceof Temporal.ZonedDateTime || date instanceof Temporal.PlainDateTime) {
      const day = date.day;
      const month = date.month;
      const year = date.year;

      return date
        .add({
          [durationPart]: diff,
        })
        .with({
          day: part !== 'day' && part !== 'weekday' ? day : undefined,
          month: part !== 'month' ? month : undefined,
          year: part !== 'year' ? year : undefined,
        });
    }

    return date.add({
      [durationPart]: diff,
    });
  }

  return {
    setPart,
    addToPart,
  };
}
