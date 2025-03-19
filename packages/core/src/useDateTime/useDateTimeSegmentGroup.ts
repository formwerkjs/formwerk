import { InjectionKey, MaybeRefOrGetter, provide, ref, toValue, Ref, onBeforeUnmount, computed } from 'vue';
import { DateTimeSegmentType, TemporalPartial } from './types';
import { hasKeyCode } from '../utils/common';
import { blockEvent } from '../utils/events';
import { Direction, Maybe } from '../types';
import { useEventListener } from '../helpers/useEventListener';
import {
  getSegmentTypePlaceholder,
  isEditableSegmentType,
  isEqualPart,
  isNumericByDefault,
  isOptionalSegmentType,
  segmentTypeToDurationLike,
} from './constants';
import { NumberParserContext, useNumberParser } from '../i18n';
import { isTemporalPartial, isTemporalPartSet, toTemporalPartial } from './temporalPartial';
import { ZonedDateTime, DateFormatter } from '@internationalized/date';

export interface DateTimeSegmentRegistration {
  id: string;
  getType(): DateTimeSegmentType;
  getElem(): HTMLElement | undefined;
}

export interface DateTimeSegmentGroupContext {
  useDateSegmentRegistration(segment: DateTimeSegmentRegistration): {
    parser: NumberParserContext;
    increment(step: number): void;
    decrement(step: number): void;
    setValue(value: number): void;
    getMetadata(): { min: number | null; max: number | null; maxLength: number | null };
    onDone(): void;
    clear(): void;
    isNumeric(): boolean;
    onTouched(): void;
    isLast(): boolean;
    focusNext(): void;
    isLockedByRange(): boolean;
    dispatchEvent(type: string): void;
  };
}

export const DateTimeSegmentGroupKey: InjectionKey<DateTimeSegmentGroupContext> = Symbol('DateTimeSegmentGroupKey');

export interface DateTimeSegmentGroupProps {
  formatter: Ref<DateFormatter>;
  locale: MaybeRefOrGetter<string | undefined>;
  formatOptions: MaybeRefOrGetter<Maybe<Intl.DateTimeFormatOptions>>;
  temporalValue: MaybeRefOrGetter<ZonedDateTime | TemporalPartial>;
  direction?: MaybeRefOrGetter<Direction>;
  controlEl: Ref<HTMLElement | undefined>;
  readonly?: MaybeRefOrGetter<boolean | undefined>;
  min?: MaybeRefOrGetter<Maybe<ZonedDateTime>>;
  max?: MaybeRefOrGetter<Maybe<ZonedDateTime>>;
  onValueChange: (value: ZonedDateTime) => void;
  onTouched: () => void;
  dispatchEvent: (type: string) => void;
}

export function useDateTimeSegmentGroup({
  formatter,
  temporalValue,
  formatOptions,
  direction,
  locale,
  controlEl,
  readonly,
  min,
  max,
  onValueChange,
  onTouched,
  dispatchEvent,
}: DateTimeSegmentGroupProps) {
  const renderedSegments = ref<DateTimeSegmentRegistration[]>([]);
  const parser = useNumberParser(locale, {
    maximumFractionDigits: 0,
    useGrouping: false,
  });

  const { setPart, addToPart } = useDateArithmetic({
    currentDate: temporalValue,
    min,
    max,
  });

  const segments = computed(() => {
    const date = toValue(temporalValue);
    let parts = formatter.value.formatToParts(date.toDate()) as {
      type: DateTimeSegmentType;
      value: string;
    }[];

    if (isTemporalPartial(date)) {
      for (const part of parts) {
        if (!isEditableSegmentType(part.type)) {
          continue;
        }

        if (!isTemporalPartSet(date, part.type)) {
          part.value = getSegmentTypePlaceholder(part.type) ?? part.value;
        }
      }
    }

    if (toValue(readonly)) {
      parts = parts.map(part => {
        return {
          ...part,
          readonly: true,
        };
      });
    }

    return parts;
  });

  function getRequiredParts() {
    return segments.value
      .filter(part => {
        return isEditableSegmentType(part.type) || isOptionalSegmentType(part.type);
      })
      .map(part => part.type);
  }

  function isAllPartsSet(value: TemporalPartial) {
    return segments.value.every(part => {
      if (!isEditableSegmentType(part.type) || isOptionalSegmentType(part.type)) {
        return true;
      }

      return isTemporalPartSet(value, part.type);
    });
  }

  function withAllPartsSet(value: ZonedDateTime) {
    if (isTemporalPartial(value) && isAllPartsSet(value)) {
      return value.copy(); // clones the value and drops the partial flag
    }

    return value;
  }

  function onSegmentDone() {
    focusNextSegment();
  }

  function useDateSegmentRegistration(segment: DateTimeSegmentRegistration) {
    renderedSegments.value.push(segment);
    onBeforeUnmount(() => {
      renderedSegments.value = renderedSegments.value.filter(s => s.id !== segment.id);
    });

    function increment(step: number = 1) {
      const type = segment.getType();
      const date = addToPart(type, step);

      onValueChange(withAllPartsSet(date));
    }

    function decrement(step: number = -1) {
      const type = segment.getType();
      const date = addToPart(type, step);

      onValueChange(withAllPartsSet(date));
    }

    function setValue(value: number) {
      const type = segment.getType();
      const date = setPart(type, value);

      onValueChange(withAllPartsSet(date));
    }

    function isLockedByRange() {
      const type = segment.getType();
      const minDate = toValue(min);
      const maxDate = toValue(max);
      // Can't be locked when either bound is open.
      if (!minDate || !maxDate) {
        return false;
      }

      return isEqualPart(minDate, maxDate, type);
    }

    function getMetadata() {
      const type = segment.getType();
      const date = toValue(temporalValue);
      const maxPartsRecord: Partial<Record<DateTimeSegmentType, number>> = {
        day: date.calendar.getDaysInMonth(date),
        month: date.calendar.getMonthsInYear(date),
        year: 9999,
        hour: toValue(formatOptions)?.hour12 ? 12 : 23,
        minute: 59,
        second: 59,
      };

      const minPartsRecord: Partial<Record<DateTimeSegmentType, number>> = {
        day: 1,
        month: 1,
        year: 0,
        hour: 0,
        minute: 0,
        second: 0,
      };

      const maxLengths: Partial<Record<DateTimeSegmentType, number>> = {
        day: 2,
        month: 2,
        year: 4,
        hour: 2,
        minute: 2,
        second: 2,
      };

      return {
        min: minPartsRecord[type] ?? null,
        max: maxPartsRecord[type] ?? null,
        maxLength: maxLengths[type] ?? null,
      };
    }

    function clear() {
      const type = segment.getType();
      const date = toValue(temporalValue);
      const next = toTemporalPartial(date, !isTemporalPartial(date) ? getRequiredParts() : []);
      next['~fw_temporal_partial'][type] = false;

      onValueChange(next);
    }

    function isNumeric() {
      const type = segment.getType();
      const options = toValue(formatOptions);
      if (type === 'literal') {
        return false;
      }

      const optionFormat = options?.[type];
      if (!optionFormat) {
        return isNumericByDefault(type);
      }

      return optionFormat === 'numeric' || optionFormat === '2-digit';
    }

    function isLast() {
      return renderedSegments.value.at(-1)?.id === segment.id;
    }

    function focusNext() {
      if (isLast()) {
        return;
      }

      focusNextSegment();
    }

    return {
      increment,
      decrement,
      setValue,
      parser,
      onSegmentDone,
      getMetadata,
      onDone: onSegmentDone,
      clear,
      onTouched,
      isLast,
      focusNext,
      isNumeric,
      isLockedByRange,
      dispatchEvent,
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
  currentDate: MaybeRefOrGetter<ZonedDateTime | TemporalPartial>;
  min?: MaybeRefOrGetter<Maybe<ZonedDateTime>>;
  max?: MaybeRefOrGetter<Maybe<ZonedDateTime>>;
}

function useDateArithmetic({ currentDate, min, max }: ArithmeticInit) {
  function clampDate(date: ZonedDateTime) {
    const minDate = toValue(min);
    const maxDate = toValue(max);

    if (minDate && date.compare(minDate) < 0) {
      return toValue(currentDate);
    }

    if (maxDate && date.compare(maxDate) > 0) {
      return toValue(currentDate);
    }

    return date;
  }

  function setPart(part: DateTimeSegmentType, value: number) {
    const date = toValue(currentDate);
    if (!isEditableSegmentType(part)) {
      return date;
    }

    if (part === 'dayPeriod') {
      return date;
    }

    const newDate = date.set({
      [part]: value,
    });

    if (isTemporalPartial(date)) {
      (newDate as TemporalPartial)['~fw_temporal_partial'] = {
        ...date['~fw_temporal_partial'],
        [part]: true,
      };
    }

    return newDate;
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

    if (isTemporalPartial(date)) {
      let newDate: ZonedDateTime | TemporalPartial = date;
      if (isTemporalPartSet(date, part)) {
        newDate = date.add({
          [durationPart]: diff,
        });
      } else {
        newDate =
          part === 'dayPeriod'
            ? date
            : date.set({
                [part]: part === 'year' ? date.year : 1,
              });
      }

      (newDate as TemporalPartial)['~fw_temporal_partial'] = {
        ...date['~fw_temporal_partial'],
        [part]: true,
      };

      return clampDate(newDate);
    }

    // Preserves the day, month, and year when adding to the part so it doesn't overflow.
    const day = date.day;
    const month = date.month;
    const year = date.year;

    return clampDate(
      date
        .add({
          [durationPart]: diff,
        })
        .set({
          day: part !== 'day' && part !== 'weekday' ? day : undefined,
          month: part !== 'month' ? month : undefined,
          year: part !== 'year' ? year : undefined,
        }),
    );
  }

  return {
    setPart,
    addToPart,
  };
}
