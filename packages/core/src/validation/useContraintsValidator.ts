import { MaybeRefOrGetter, onMounted, Ref, shallowRef, toValue, watchEffect } from 'vue';
import { Maybe } from '../types';
import { useEventListener } from '../helpers/useEventListener';

export interface ConstraintOptions<TValue> {
  value: MaybeRefOrGetter<TValue>;
  source: Ref<Maybe<HTMLElement>>;
}

interface BaseConstraints extends ConstraintOptions<unknown> {
  required?: MaybeRefOrGetter<Maybe<boolean>>;
}

interface TextualConstraints extends BaseConstraints {
  type: 'text';
  minLength?: MaybeRefOrGetter<Maybe<number>>;
  maxLength?: MaybeRefOrGetter<Maybe<number>>;
}

interface SelectConstraints extends BaseConstraints {
  type: 'select';
}

interface NumericConstraints extends BaseConstraints {
  type: 'number';
  min?: MaybeRefOrGetter<Maybe<number>>;
  max?: MaybeRefOrGetter<Maybe<number>>;
}

interface DateConstraints extends BaseConstraints {
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
    }

    if (constraints.type === 'number') {
      element.value.setAttribute('min', toValue(constraints.min)?.toString() ?? '');
      element.value.setAttribute('max', toValue(constraints.max)?.toString() ?? '');
    }

    if (constraints.type === 'date') {
      element.value.setAttribute('min', toValue(constraints.min)?.toISOString() ?? '');
      element.value.setAttribute('max', toValue(constraints.max)?.toISOString() ?? '');
    }
  });

  watchEffect(() => {
    if (!element.value) {
      return;
    }

    const val = toValue(constraints.value);
    if (constraints.type === 'text' || element.value.type === 'text') {
      element.value.value = String(val ?? '');
    }

    if (constraints.type === 'number') {
      element.value.value = String(val ?? '');
    }

    if (constraints.type === 'date') {
      element.value.value = val ? new Date(String(val)).toISOString() : '';
    }
  });

  useEventListener(constraints.source, ['change', 'blur', 'input'], evt => {
    element.value?.dispatchEvent(new Event(evt.type));
  });

  return {
    element,
  };
}
