import { computed, MaybeRefOrGetter, nextTick, onMounted, provide, reactive, ref, shallowRef, toValue } from 'vue';
import { Simplify } from 'type-fest';
import { FormProps, FormReturns, useForm } from '../useForm';
import { FormObject } from '../types';
import { merge } from '../../../shared/src';
import { cloneDeep, isFormElement, withRefCapture } from '../utils/common';
import { useControlButtonProps } from '../helpers/useControlButtonProps';
import { FormFlowContextKey } from './types';
import { asConsumableData, ConsumableData } from '../useForm/useFormActions';
import { createEventDispatcher } from '../utils/events';

type SchemalessFormProps<TInput extends FormObject> = Simplify<Omit<FormProps<any, TInput>, 'schema'>>;

export interface FormFlowProps<TInput extends FormObject> extends SchemalessFormProps<TInput> {
  /**
   * The label for the next button. Will be used if the button has no text content.
   */
  nextLabel?: string;

  /**
   * The label for the previous button. Will be used if the button has no text content.
   */
  previousLabel?: string;

  /**
   * The form to use for the flow. If not provided, a new form context will be created.
   */
  form?: FormReturns;
}

type SegmentIdPair = [string, MaybeRefOrGetter<string | number | undefined>];

export function useFormFlow<
  SegmentId extends number | string = number | string,
  TInput extends FormObject = FormObject,
>(_props?: FormFlowProps<TInput>) {
  const _currentSegment = shallowRef<string>();
  const _currentSegmentIndex = ref(0);
  const formElement = ref<HTMLElement>();
  const values = reactive<TInput>({} as TInput);
  const segmentValuesMap = new Map<string, TInput>();
  const form = _props?.form ?? useForm(_props);
  const segments = shallowRef<SegmentIdPair[]>([]);
  const isLastSegment = computed(() => _currentSegmentIndex.value >= segments.value.length - 1);

  const [dispatchDone, onDone] = createEventDispatcher<ConsumableData<TInput>>('done');
  const [dispatchActiveSegmentChange, onActiveSegmentChange] =
    createEventDispatcher<ConsumableData<TInput>>('activeSegmentChange');

  function beforeSegmentChange(applyChange: () => void) {
    if (_currentSegment.value) {
      merge(values, cloneDeep(form.values));
      segmentValuesMap.set(_currentSegment.value, cloneDeep(form.values) as TInput);
      dispatchActiveSegmentChange(asConsumableData(cloneDeep(values) as TInput));
    }

    applyChange();
  }

  const next = form.handleSubmit(async () => {
    if (isLastSegment.value) {
      dispatchDone(asConsumableData(cloneDeep(values) as TInput));
      return;
    }

    beforeSegmentChange(() => {
      moveRelative(1);
    });
  });

  function previous() {
    beforeSegmentChange(() => {
      moveRelative(-1);
    });
  }

  const nextButtonProps = useControlButtonProps(btn => ({
    'aria-label': btn?.textContent ? undefined : (_props?.nextLabel ?? 'Next'),
    type: 'submit',
    tabindex: '0',
    disabled: _currentSegmentIndex.value >= segments.value.length - 1 || toValue(_props?.disabled),
    onClick: isFormElement(formElement.value) ? undefined : next,
  }));

  const previousButtonProps = useControlButtonProps(btn => ({
    'aria-label': btn?.textContent ? undefined : (_props?.previousLabel ?? 'Previous'),
    tabindex: '0',
    disabled: _currentSegmentIndex.value === 0 || toValue(_props?.disabled),
    onClick: previous,
  }));

  provide(FormFlowContextKey, {
    isSegmentActive: (segmentId: string) => _currentSegment.value === segmentId,
    registerSegment: (staticId, userId) => segments.value.push([staticId, userId]),
  });

  function onSubmit(e: Event) {
    e.preventDefault();
    if (toValue(_props?.disabled)) {
      return;
    }

    next();
  }

  const formProps = computed(() => {
    const isForm = isFormElement(formElement.value);

    return withRefCapture(
      {
        novalidate: isForm ? true : undefined,
        onSubmit: isForm ? onSubmit : undefined,
      },
      formElement,
    );
  });

  async function moveRelative(delta: number) {
    const steps = Array.from(formElement.value?.querySelectorAll(`[data-form-segment-id]`) || []) as HTMLElement[];
    let idx = steps.findIndex(step => step.dataset.active);
    if (idx === -1) {
      idx = 0;
    }

    const newSegmentIndex = idx + delta;

    if (newSegmentIndex < 0 || newSegmentIndex >= steps.length) {
      return;
    }

    if (steps[newSegmentIndex]) {
      _currentSegment.value = steps[newSegmentIndex].dataset.formSegmentId;
      _currentSegmentIndex.value = newSegmentIndex;
    }

    restoreSegmentValues();
  }

  async function restoreSegmentValues() {
    await nextTick();
    // restore field values
    if (_currentSegment.value && segmentValuesMap.has(_currentSegment.value)) {
      form.setValues(segmentValuesMap.get(_currentSegment.value) as TInput, { behavior: 'replace' });
    }
  }

  onMounted(() => {
    moveRelative(0);
  });

  function goTo(segmentId: SegmentId) {
    const segments = Array.from(formElement.value?.querySelectorAll(`[data-form-segment-id]`) || []) as HTMLElement[];
    const idx = segments.findIndex(segment => segment.dataset.formSegmentUserId === String(segmentId));

    if (idx === -1 || !segments[idx]) {
      return;
    }

    beforeSegmentChange(() => {
      _currentSegment.value = segments[idx].dataset.formSegmentId;
      _currentSegmentIndex.value = idx;

      restoreSegmentValues();
    });
  }

  const currentSegment = computed(() => {
    // Make sure to register it as a dependency
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    _currentSegment.value;

    const segment = segments.value.find(segment => segment[0] === _currentSegment.value);
    if (segment) {
      return toValue(segment[1]) ?? segment[0];
    }

    return undefined;
  });

  return {
    /**
     * Combined values of all segments.
     */
    values,

    /**
     * Get the error for the current segment.
     */
    getError: form.getError,

    /**
     * Get all errors for the current segment.
     */
    getErrors: form.getErrors,

    /**
     * Whether current active segment is dirty, or a specific field in the current active segment.
     */
    isDirty: form.isDirty,

    /**
     * Whether the current active segment is touched, or a specific field in the current active segment.
     */
    isTouched: form.isTouched,

    /**
     * Whether the current segment is the last segment, useful for stepped forms and form wizards.
     */
    isLastSegment,

    /**
     *
     */
    formElement,

    /**
     * Props to bind to the form flow element, either a form or any other HTML element.
     */
    formProps,

    /**
     * Props to bind to the next button.
     */
    nextButtonProps,

    /**
     * Props to bind to the previous button.
     */
    previousButtonProps,

    /**
     * The ID of the current segment.
     */
    currentSegment,

    /**
     * Activates the next segment in the flow. Useful for stepped forms and form wizards.
     */
    next,

    /**
     * Activates the previous segment in the flow. Useful for stepped forms and form wizards.
     */
    previous,

    /**
     * Registers a callback to be called when the form is done.
     */
    onDone,

    /**
     * Activates the specified segment given its ID.
     */
    goTo,

    /**
     * Registers a callback to be called when the active segment changes.
     */
    onActiveSegmentChange,
  };
}
