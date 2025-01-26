import { InjectionKey, MaybeRefOrGetter, provide, ref, toValue, Ref, onBeforeUnmount, computed } from 'vue';
import { Temporal, Intl as TemporalIntl } from '@js-temporal/polyfill';
import { DateTimeSegmentType } from './types';
import { hasKeyCode } from '../utils/common';
import { blockEvent } from '../utils/events';
import { Direction, Maybe } from '../types';
import { useEventListener } from '../helpers/useEventListener';
import { isEditableSegmentType, segmentTypeToDurationLike } from './constants';
import { NumberParserContext, useNumberParser } from '../i18n';

export interface DateTimeSegmentRegistration {
  id: string;
  getType(): DateTimeSegmentType;
  getElem(): HTMLElement | undefined;
}

export interface DateTimeSegmentGroupContext {
  useDateSegmentRegistration(segment: DateTimeSegmentRegistration): {
    parser: NumberParserContext;
    increment(): void;
    decrement(): void;
    setValue(value: number): void;

    maxValue(): number | null;
    minValue(): number | null;
  };
}

export const DateTimeSegmentGroupKey: InjectionKey<DateTimeSegmentGroupContext> = Symbol('DateTimeSegmentGroupKey');

export interface DateTimeSegmentGroupProps {
  formatter: Ref<TemporalIntl.DateTimeFormat>;
  locale: MaybeRefOrGetter<string | undefined>;
  formatOptions: MaybeRefOrGetter<Maybe<Intl.DateTimeFormatOptions>>;
  temporalValue: MaybeRefOrGetter<Temporal.ZonedDateTime>;
  direction?: MaybeRefOrGetter<Direction>;
  controlEl: Ref<HTMLElement | undefined>;
  onValueChange: (value: Temporal.ZonedDateTime) => void;
}

export function useDateTimeSegmentGroup({
  formatter,
  temporalValue,
  formatOptions,
  direction,
  locale,
  controlEl,
  onValueChange,
}: DateTimeSegmentGroupProps) {
  const renderedSegments = ref<DateTimeSegmentRegistration[]>([]);
  const parser = useNumberParser(locale, {
    maximumFractionDigits: 0,
    useGrouping: false,
  });

  const { setPart, addToPart } = useDateArithmetic({
    currentDate: temporalValue,
  });

  const segments = computed(() => {
    const date = toValue(temporalValue);

    return formatter.value.formatToParts(date.toPlainDateTime()) as { type: DateTimeSegmentType; value: string }[];
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

    function maxValue() {
      const type = segment.getType();
      const date = toValue(temporalValue);
      const maxPartsRecord: Partial<Record<DateTimeSegmentType, number>> = {
        day: date.daysInMonth,
        month: date.monthsInYear,
        year: 9999,
        hour: toValue(formatOptions)?.hour12 ? 12 : 23,
        minute: 59,
        second: 59,
      };

      return maxPartsRecord[type] ?? null;
    }

    function minValue() {
      const type = segment.getType();
      const minPartsRecord: Partial<Record<DateTimeSegmentType, number>> = {
        day: 1,
        month: 1,
        year: 0,
        hour: 0,
        minute: 0,
        second: 0,
      };

      return minPartsRecord[type] ?? null;
    }

    return {
      increment,
      decrement,
      setValue,
      parser,
      maxValue,
      minValue,
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
  currentDate: MaybeRefOrGetter<Temporal.ZonedDateTime>;
}

function useDateArithmetic({ currentDate }: ArithmeticInit) {
  function setPart(part: DateTimeSegmentType, value: number) {
    const date = toValue(currentDate);
    if (!isEditableSegmentType(part)) {
      return date;
    }

    if (part === 'dayPeriod') {
      return date;
    }

    return date.with({
      [part]: value,
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

  return {
    setPart,
    addToPart,
  };
}
