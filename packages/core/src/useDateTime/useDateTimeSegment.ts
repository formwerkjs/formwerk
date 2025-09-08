import { computed, CSSProperties, defineComponent, h, inject, nextTick, shallowRef, toValue } from 'vue';
import { Reactivify } from '../types';
import { hasKeyCode, isNullOrUndefined, normalizeProps, useUniqId, useCaptureProps } from '../utils/common';
import { DateTimeSegmentGroupKey } from './useDateTimeSegmentGroup';
import { FieldTypePrefixes } from '../constants';
import { blockEvent } from '../utils/events';
import { DateTimeSegmentType } from './types';
import { getSegmentTypePlaceholder, isEditableSegmentType } from './constants';
import { createDisabledContext } from '../helpers/createDisabledContext';
import { isFirefox } from '../utils/platform';

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

  /**
   * Whether the segment is readonly.
   */
  readonly?: boolean;

  /**
   * Forces the segment to behave strictly as a spin button, preventing any other interactions like input events. Useful for time fields and specific UX needs.
   */
  spinOnly?: boolean;
}

interface DateTimeSegmentDomProps {
  id: string;
  tabindex: number;
  role?: string;
  contenteditable: string | undefined;
  'aria-disabled': boolean | undefined;
  'aria-readonly': boolean | undefined;
  'data-segment-type': DateTimeSegmentType;
  style?: CSSProperties;
  'aria-label'?: string;
  spellcheck?: boolean;
  inputmode?: string;
  autocorrect?: string;
  enterkeyhint?: string;
  autocomplete?: string;
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
}

export function useDateTimeSegment(_props: Reactivify<DateTimeSegmentProps>) {
  const props = normalizeProps(_props);
  const id = useUniqId(FieldTypePrefixes.DateTimeSegment);
  const segmentEl = shallowRef<HTMLSpanElement>();
  const segmentGroup = inject(DateTimeSegmentGroupKey, null);
  const isDisabled = createDisabledContext(props.disabled);

  if (!segmentGroup) {
    throw new Error('DateTimeSegmentGroup is not provided');
  }

  const {
    increment,
    decrement,
    setValue,
    getMetadata,
    onDone,
    parser,
    clear,
    onTouched,
    isLast,
    focusNext,
    isNumeric,
    isLockedByRange,
    dispatchEvent,
  } = segmentGroup.useDateSegmentRegistration({
    id,
    getElem: () => segmentEl.value,
    getType: () => toValue(props.type),
  });

  let currentInput = '';

  function isNonMutable() {
    return (
      !isEditableSegmentType(toValue(props.type)) || isDisabled.value || toValue(props.readonly) || isLockedByRange()
    );
  }

  function isSpinOnly() {
    return !!toValue(props.spinOnly);
  }

  const handlers = {
    onFocus() {
      // Reset the current input when the segment is focused
      currentInput = '';
    },
    onBeforeinput(evt: InputEvent) {
      if (isNonMutable() || isSpinOnly()) {
        blockEvent(evt);
        return;
      }

      // No data,like backspace or whatever
      if (isNullOrUndefined(evt.data)) {
        return;
      }

      blockEvent(evt);
      if (!isNumeric()) {
        return;
      }

      const { min, max, maxLength } = getMetadata();
      const nextValue = currentInput + evt.data;

      const parsed = parser.parse(nextValue);
      if (isNullOrUndefined(min) || isNullOrUndefined(max) || isNullOrUndefined(maxLength)) {
        return;
      }

      if (Number.isNaN(parsed) || parsed > max) {
        return;
      }

      currentInput = nextValue;
      if (segmentEl.value) {
        segmentEl.value.textContent = currentInput;
      }

      // If the current input length is greater than or equal to the max length, or the parsed value is greater than the max value,
      // then we should signal the segment group that this segment is done and it can move to the next segment
      if (currentInput.length >= maxLength || parsed * 10 > max) {
        // When done, if the parsed value is less than the min value, we should set the value to the min value
        if (parsed < min) {
          if (segmentEl.value) {
            segmentEl.value.textContent = min.toString();
          }
        }

        onDone();
      }
    },
    onBlur() {
      onTouched();
      nextTick(() => {
        dispatchEvent('blur');
      });

      if (isSpinOnly()) {
        currentInput = '';
        return;
      }

      const { min, max } = getMetadata();
      if (isNullOrUndefined(min) || isNullOrUndefined(max)) {
        return;
      }

      const parsed = parser.parse(segmentEl.value?.textContent || '');
      if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) {
        setValue(parsed);
      }

      // Reset the current input when the segment is blurred
      currentInput = '';
    },
    onKeydown(evt: KeyboardEvent) {
      if (isNonMutable()) {
        return;
      }

      if (hasKeyCode(evt, 'Enter')) {
        blockEvent(evt);
        focusNext();
        return;
      }

      if (hasKeyCode(evt, 'ArrowUp')) {
        blockEvent(evt);
        if (!isNonMutable()) {
          increment();
        }
        return;
      }

      if (hasKeyCode(evt, 'ArrowDown')) {
        blockEvent(evt);
        if (!isNonMutable()) {
          decrement();
        }
        return;
      }

      if (hasKeyCode(evt, 'Backspace') || hasKeyCode(evt, 'Delete')) {
        blockEvent(evt);
        if (!isNonMutable()) {
          if (currentInput.length > 1) {
            currentInput = currentInput.slice(0, -1);
          } else {
            clear();
            currentInput = '';
          }

          if (segmentEl.value) {
            segmentEl.value.textContent = currentInput || (getSegmentTypePlaceholder(toValue(props.type)) ?? '');
          }
        }
      }
    },
  };

  const segmentProps = useCaptureProps(() => {
    const ceValue = isFirefox() ? 'true' : 'plaintext-only';

    const domProps: DateTimeSegmentDomProps = {
      id,
      tabindex: isNonMutable() ? -1 : 0,
      contenteditable: isNonMutable() || isSpinOnly() ? undefined : ceValue,
      'aria-disabled': isNonMutable(),
      'data-segment-type': toValue(props.type),
      'aria-label': isNonMutable() ? undefined : toValue(props.type),
      'aria-readonly': toValue(props.readonly) ? true : undefined,
      autocorrect: isNonMutable() || isSpinOnly() ? undefined : 'off',
      autocomplete: isNonMutable() || isSpinOnly() ? undefined : 'off',
      spellcheck: isNonMutable() || isSpinOnly() ? undefined : false,
      enterkeyhint: isNonMutable() || isSpinOnly() ? undefined : isLast() ? 'done' : 'next',
      inputmode: isSpinOnly() ? undefined : 'none',
      style: isSpinOnly()
        ? undefined
        : {
            caretColor: 'transparent',
          },
      ...(isSpinOnly() ? { onKeydown: handlers.onKeydown, onBlur: handlers.onBlur } : handlers),
    };

    if (isNumeric()) {
      const { min, max } = getMetadata();
      const value = parser.parse(toValue(props.value));
      domProps.role = 'spinbutton';
      domProps.inputmode = isSpinOnly() ? undefined : 'numeric';
      domProps['aria-valuemin'] = min ?? undefined;
      domProps['aria-valuemax'] = max ?? undefined;
      domProps['aria-valuenow'] = Number.isNaN(value) ? undefined : value;
      domProps['aria-valuetext'] = Number.isNaN(value) ? 'Empty' : value.toString();
    }

    if (isNonMutable() && domProps.style) {
      domProps.style.pointerEvents = 'none';
    }

    return domProps;
  }, segmentEl);

  return {
    key: computed(() => `${id}-${toValue(props.type)}`),
    segmentProps,
  };
}

/**
 * A helper component that renders a datetime segment. You can build your own with `useDateTimeSegment`.
 */
export const DateTimeSegment = /*#__PURE__*/ defineComponent<DateTimeSegmentProps>({
  name: 'DateTimeSegment',
  props: ['type', 'value', 'disabled', 'readonly', 'spinOnly'],
  setup(props) {
    const { segmentProps, key } = useDateTimeSegment(props);

    return () =>
      h(
        'span',
        {
          ...segmentProps.value,
          key: key.value,
        },
        props.value,
      );
  },
});
