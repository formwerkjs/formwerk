import { computed, nextTick, provide, reactive, Ref, ref, toValue, shallowRef } from 'vue';
import { NoSchemaFormProps, useForm } from '../useForm';
import { FormObject, IssueCollection, Path } from '../types';
import { isObject, merge } from '../../../shared/src';
import { cloneDeep, isSSR } from '../utils/common';
import { FormFlowContextKey, SegmentMetadata, SegmentRegistrationMetadata, StepIdentifier } from './types';
import { asConsumableData, ConsumableData } from '../useForm/useFormActions';
import { createEventDispatcher } from '../utils/events';
import { PartialDeep } from 'type-fest';
import { resolveSegmentMetadata } from './utils';

type SchemalessFormProps<TInput extends FormObject> = NoSchemaFormProps<TInput>;

export type FormFlowProps<TInput extends FormObject> = SchemalessFormProps<TInput>;

interface StepState<TValues> {
  values: PartialDeep<TValues>;
  issues: IssueCollection<Path<TValues>>[];
}

export interface GoToPredicateContext {
  segment: SegmentMetadata;
  segments: SegmentMetadata[];
  index: number;
  relativeDistance: number;
}

export interface RenderedSegment {
  id: string;
}

export function useFormFlow<TInput extends FormObject = FormObject>(_props?: FormFlowProps<TInput>) {
  const currentSegmentId = ref<string>();
  const formElement = shallowRef<HTMLElement>();
  const values = reactive<PartialDeep<TInput>>({} as PartialDeep<TInput>);
  const segmentValuesMap = ref(new Map<string, StepState<TInput>>()) as Ref<Map<string, StepState<TInput>>>;
  const form = useForm(_props);
  const segments = ref<SegmentMetadata[]>([]);

  const rawCurrentSegment = computed(() => segments.value.find(segment => segment.id === currentSegmentId.value));

  const [dispatchActiveSegmentChange, onActiveSegmentChange] = createEventDispatcher<{
    data: ConsumableData<TInput>;
    oldSegment: SegmentMetadata;
    newSegment: SegmentMetadata;
  }>('activeSegmentChange');

  function beforeSegmentChange(nextSegment: SegmentMetadata, applyChange: () => void) {
    const currentSegment = rawCurrentSegment.value;
    if (currentSegment) {
      saveValues();
      dispatchActiveSegmentChange({
        data: asConsumableData(cloneDeep(values) as TInput),
        oldSegment: currentSegment,
        newSegment: nextSegment,
      });
    }

    applyChange();
    nextSegment.visited = true;
  }

  function saveValues() {
    const currentSegment = rawCurrentSegment.value;
    if (!currentSegment) {
      return;
    }

    merge(values, cloneDeep(form.values));
    segmentValuesMap.value.set(currentSegment.id, {
      values: cloneDeep(form.values),
      issues: form.getIssues() as IssueCollection<Path<TInput>>[],
    });

    currentSegment.submitted = true;
  }

  provide(FormFlowContextKey, {
    isSegmentActive: (segmentId: string) => rawCurrentSegment.value?.id === segmentId,
    registerSegment: (metadata: SegmentRegistrationMetadata) => {
      segments.value.push({
        id: metadata.id,
        name: () => toValue(metadata.name),
        // The first segment is always visited.
        visited: segments.value.length === 0,
        submitted: false,
        getValue: () => segmentValuesMap.value.get(metadata.id)?.values,
      });

      // Activate the first segment if there is only one by default
      // Fixes SSR #231
      if (segments.value.length === 1) {
        currentSegmentId.value = metadata.id;
      }
    },
  });

  const currentSegment = computed(() => {
    const curr = rawCurrentSegment.value;
    if (!curr) {
      return null;
    }

    return resolveSegmentMetadata(curr);
  });

  const currentSegmentIndex = computed(() => {
    const current = currentSegment.value;
    if (!current) {
      return -1;
    }

    return getRenderedSegments().findIndex(segment => segment.id === current.id);
  });

  const isLastSegment = computed(() => currentSegmentIndex.value === segments.value.length - 1);

  function resolveRelative(delta: number): SegmentMetadata | null {
    const domSegments = Array.from(
      formElement.value?.querySelectorAll(`[data-form-segment-id]`) || [],
    ) as HTMLElement[];
    let idx = domSegments.findIndex(step => step.dataset.active);
    if (idx === -1) {
      idx = 0;
    }

    const newSegmentIndex = idx + delta;
    if (newSegmentIndex < 0 || newSegmentIndex >= domSegments.length) {
      return null;
    }

    return segments.value[newSegmentIndex] ?? null;
  }

  async function restoreSegmentValues() {
    await nextTick();
    const currentSegment = rawCurrentSegment.value;
    // restore field values
    if (currentSegment && hasState(currentSegment.id)) {
      const state = segmentValuesMap.value.get(currentSegment.id) as StepState<TInput>;
      if (state) {
        form.setValues(state.values, { behavior: 'replace' });
        form.setErrors(state.issues);
      }
    }
  }

  function getRenderedSegments(): RenderedSegment[] {
    if (isSSR) {
      return segments.value.map(segment => ({ id: segment.id }));
    }

    return Array.from(formElement.value?.querySelectorAll(`[data-form-segment-id]`) || []).map(segment => ({
      id: (segment as HTMLElement).dataset.formSegmentId ?? '',
    }));
  }

  function getSegmentAt(idx: number): { idx: number; segment: SegmentMetadata } | undefined {
    const domSegments = getRenderedSegments();

    const i = segments.value.findIndex(segment => segment.id === domSegments[idx].id);
    if (i === -1) {
      return undefined;
    }

    return {
      idx: i,
      segment: segments.value[i],
    };
  }

  function goTo(segmentId: StepIdentifier, predicate?: (context: GoToPredicateContext) => boolean): boolean {
    const currentIdx = currentSegmentIndex.value;

    let idx = -1;
    // Converts indices to strings to give it a little tolerance.
    if (typeof segmentId === 'number') {
      const segment = getSegmentAt(segmentId);
      if (segment) {
        idx = segment.idx;
      }
    } else if (isObject<SegmentMetadata>(segmentId)) {
      idx = segments.value.findIndex(segment => segment.id === segmentId.id);
    } else {
      idx = segments.value.findIndex(segment => toValue(segment.name) === segmentId);
    }

    if (idx === -1 || !segments.value[idx]) {
      return false;
    }

    if (
      predicate &&
      !predicate({
        segment: segments.value[idx],
        index: idx,
        relativeDistance: idx - currentIdx,
        segments: segments.value,
      })
    ) {
      return false;
    }

    beforeSegmentChange(segments.value[idx], () => {
      currentSegmentId.value = segments.value[idx].id;

      restoreSegmentValues();
    });

    return true;
  }

  function hasState(segmentId: number | string) {
    return segmentValuesMap.value.has(String(segmentId));
  }

  function getSegmentValues(segmentId: string | number): PartialDeep<TInput> {
    let idx = -1;
    if (typeof segmentId === 'number') {
      const segment = getSegmentAt(segmentId);
      if (segment) {
        idx = segment.idx;
      }
    } else {
      idx = segments.value.findIndex(segment => toValue(segment.name) === segmentId);
    }

    const segment = segments.value[idx];
    if (!segment) {
      return {} as PartialDeep<TInput>;
    }

    return segmentValuesMap.value.get(segment.id)?.values ?? ({} as PartialDeep<TInput>);
  }

  function moveRelative(delta: number) {
    const next = resolveRelative(delta);
    if (next) {
      goTo(next);
    }
  }

  return {
    form,

    /**
     * Combined values of all segments.
     */
    values,

    /**
     * Whether the current segment is the last segment, useful for stepped forms and form wizards.
     */
    isLastSegment,

    /**
     *
     */
    formElement,

    /**
     * Activates the specified segment given its ID.
     */
    goTo,

    /**
     * Registers a callback to be called when the active segment changes.
     */
    onActiveSegmentChange,

    /**
     * Resolves the step that is relative to the current step by the given delta.
     */
    resolveRelative,

    /**
     * Moves the form flow relative to the current step by the given delta.
     */
    moveRelative,

    /**
     * Whether the segment has a state.
     */
    hasState,

    /**
     * Returns the DOM segments.
     */
    getRenderedSegments,

    /**
     * The segments.
     */
    segments,

    /**
     * The current segment.
     */
    currentSegment,

    /**
     * The index of the current segment.
     */
    currentSegmentIndex,

    /**
     * Saves the values of the current segment.
     */
    saveValues,

    /**
     * Gets the values of a segment.
     */
    getSegmentValues,
  };
}
