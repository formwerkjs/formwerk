import { computed, nextTick, onMounted, provide, reactive, Ref, ref, toValue, shallowRef } from 'vue';
import { NoSchemaFormProps, useForm } from '../useForm';
import { FormObject, IssueCollection, Path } from '../types';
import { isObject, merge } from '../../../shared/src';
import { cloneDeep, isNullOrUndefined, isSSR, waitForTicks } from '../utils/common';
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
  active: boolean;
}

export function useFormFlow<TInput extends FormObject = FormObject>(_props?: FormFlowProps<TInput>) {
  const currentSegmentId = ref<string>();
  const formElement = shallowRef<HTMLElement>();
  const values = reactive<PartialDeep<TInput>>({} as PartialDeep<TInput>);
  const segmentValuesMap = ref(new Map<string, StepState<TInput>>()) as Ref<Map<string, StepState<TInput>>>;
  const form = useForm(_props);
  const segments = ref<SegmentMetadata[]>([]);
  const isSegmentsStable = ref(false);
  let pendingStep: StepIdentifier | undefined;
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
      let isFirstSegment = segments.value.length === 0;

      segments.value.push({
        id: metadata.id,
        name: () => toValue(metadata.name),
        // The first segment is always visited.
        visited: isFirstSegment,
        submitted: false,
        getValue: () => segmentValuesMap.value.get(metadata.id)?.values,
      });

      // Activate the first segment immediately to ensure SSR/client consistency
      // Fixes SSR hydration mismatch with isActive state
      if (isFirstSegment) {
        currentSegmentId.value = metadata.id;
      }

      // Mark segments as stable after a microtask to ensure all synchronous registrations complete
      // This helps distinguish between "only 1 segment registered so far" vs "only 1 segment total"
      if (!isSegmentsStable.value) {
        nextTick(() => {
          isSegmentsStable.value = true;
        });
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

  const isLastSegment = computed(() => {
    const current = currentSegment.value;
    if (!current) {
      return false;
    }

    const index = currentSegmentIndex.value;
    const total = segments.value.length;

    // If we're on the first segment and only one segment has registered so far,
    // only return true if segments are stable (all registered).
    // This prevents SSR hydration mismatch when segments register incrementally on client.
    if (index === 0 && total === 1 && !isSegmentsStable.value) {
      return false;
    }

    return index === total - 1;
  });

  function resolveRelative(delta: number): SegmentMetadata | null {
    const domSegments = getRenderedSegments();
    let idx = domSegments.findIndex(step => step.active);
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
      return segments.value.map(segment => ({ id: segment.id, active: segment.id === currentSegmentId.value }));
    }

    return Array.from(formElement.value?.querySelectorAll(`[data-form-segment-id]`) || []).map(segment => ({
      id: (segment as HTMLElement).dataset.formSegmentId ?? '',
      active: (segment as HTMLElement).dataset.active === 'true',
    }));
  }

  function getSegmentAt(idx: number): { idx: number; segment: SegmentMetadata } | undefined {
    const domSegments = getRenderedSegments();

    const i = segments.value.findIndex(segment => segment.id === domSegments[idx]?.id);
    if (i === -1) {
      return undefined;
    }

    return {
      idx: i,
      segment: segments.value[i],
    };
  }

  function goTo(
    segmentId: StepIdentifier,
    predicate?: (context: GoToPredicateContext) => boolean,
    userInitiated = false,
  ): boolean {
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

    // Track user-initiated navigation (to be executed after mount completes)
    if (userInitiated) {
      pendingStep = segmentId;
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

  onMounted(async () => {
    // Wait for all onMounted hooks to complete before auto-correcting the active segment
    // also wait one more tick for v-if conditions to resolve and update DOM if any
    await waitForTicks(2);

    // If no user navigation was initiated, set the first available segment as the active segment
    if (!isNullOrUndefined(pendingStep)) {
      const renderedSegments = getRenderedSegments();
      // Prefer first registered segment if it's now available in DOM
      // oxlint-disable-next-line no-unused-expressions
      pendingStep = segments.value.find(segment => segment.id === renderedSegments[0]?.id);
    }

    goTo(pendingStep ?? 0);
  });

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
