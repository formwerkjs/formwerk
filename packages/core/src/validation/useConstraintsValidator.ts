import { MaybeRefOrGetter, nextTick, onMounted, Ref, shallowRef, toValue, watchEffect } from 'vue';
import { Maybe } from '../types';
import { useEventListener } from '../helpers/useEventListener';

export interface ConstraintOptions<TValue> {
  value: MaybeRefOrGetter<Maybe<TValue>>;
  source: Ref<Maybe<HTMLElement>>;
}

interface BaseConstraints<TValue> extends ConstraintOptions<TValue> {
  required?: MaybeRefOrGetter<Maybe<boolean>>;
}

interface TextualConstraints extends BaseConstraints<string> {
  type: 'text';
  minLength?: MaybeRefOrGetter<Maybe<number>>;
  maxLength?: MaybeRefOrGetter<Maybe<number>>;
}

interface SelectConstraints extends BaseConstraints<string> {
  type: 'select';
}

interface NumericConstraints extends BaseConstraints<number> {
  type: 'number';
  min?: MaybeRefOrGetter<Maybe<number>>;
  max?: MaybeRefOrGetter<Maybe<number>>;
}

interface DateConstraints extends BaseConstraints<Date> {
  type: 'date';
  min?: MaybeRefOrGetter<Maybe<Date>>;
  max?: MaybeRefOrGetter<Maybe<Date>>;
}

export type Constraints = TextualConstraints | SelectConstraints | NumericConstraints | DateConstraints;

export function useConstraintsValidator(constraints: Constraints) {
  const element = shallowRef<HTMLInputElement>();

  onMounted(() => {
    element.value = document.createElement('input');
    element.value.type = constraints.type === 'select' ? 'text' : constraints.type;
  });

  watchEffect(() => {
    if (!element.value) {
      return;
    }

    element.value.required = toValue(constraints.required) ?? false;

    if (constraints.type === 'text') {
      element.value.setAttribute('minlength', toValue(constraints.minLength)?.toString() ?? '');
      element.value.setAttribute('maxlength', toValue(constraints.maxLength)?.toString() ?? '');

      return;
    }

    if (constraints.type === 'number') {
      element.value.setAttribute('min', toValue(constraints.min)?.toString() ?? '');
      element.value.setAttribute('max', toValue(constraints.max)?.toString() ?? '');

      return;
    }

    if (constraints.type === 'date') {
      const min = toValue(constraints.min);
      const max = toValue(constraints.max);
      element.value.setAttribute('min', min ? dateToString(min) : '');
      element.value.setAttribute('max', max ? dateToString(max) : '');

      return;
    }
  });

  watchEffect(() => {
    if (!element.value) {
      return;
    }

    nextTick(() => {
      element.value?.dispatchEvent(new Event('change'));
    });

    if (constraints.type === 'text' || element.value.type === 'text') {
      const val = toValue(constraints.value);
      element.value.value = String(val ?? '');
      return;
    }

    if (constraints.type === 'number') {
      const val = toValue(constraints.value);
      element.value.value = String(val ?? '');
      return;
    }

    if (constraints.type === 'date') {
      const date = toValue(constraints.value);
      element.value.value = date ? dateToString(date) : '';
    }
  });

  useEventListener(constraints.source, ['blur', 'input'], evt => {
    element.value?.dispatchEvent(new Event(evt.type));
  });

  return {
    element,
  };
}

function dateToString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
