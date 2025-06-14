import { computed, toValue } from 'vue';
import { useControlButtonProps } from '../helpers/useControlButtonProps';
import { cloneDeep, isFormElement, warn, withRefCapture } from '../utils/common';
import { asConsumableData, ConsumableData } from '../useForm/useFormActions';
import { createEventDispatcher } from '../utils/events';
import { FormObject, MaybeAsync } from '../types';
import { FormFlowProps, useFormFlow } from './useFormFlow';
import { FormFlowSegment } from './useFlowSegment';
import { ResolvedSegmentMetadata, SegmentMetadata } from './types';
import { PartialDeep } from 'type-fest';
import { resolveSegmentMetadata } from './utils';

export interface StepFormFlowProps<TInput extends FormObject> extends FormFlowProps<TInput> {
  /**
   * The label for the next button. Will be used if the button has no text content.
   */
  nextLabel?: string;

  /**
   * The label for the previous button. Will be used if the button has no text content.
   */
  previousLabel?: string;
}

type StepResolver<TInput extends FormObject> = (
  ctx: StepResolveContext<TInput>,
) => MaybeAsync<SegmentMetadata | ResolvedSegmentMetadata | string | number | null | void>;

export interface StepResolveContext<TInput extends FormObject> {
  currentStep: ResolvedSegmentMetadata;
  currentIndex: number;
  visitedSteps: ResolvedSegmentMetadata[];
  isLastStep: boolean;
  steps: ResolvedSegmentMetadata[];
  values: PartialDeep<TInput>;
  direction: 'next' | 'previous';
  next(): MaybeAsync<SegmentMetadata | null>;
  previous(): MaybeAsync<SegmentMetadata | null>;
}

export function useStepFormFlow<TInput extends FormObject>(props?: StepFormFlowProps<TInput>) {
  const { form, ...flow } = useFormFlow(props);
  let stepResolver: StepResolver<TInput> | null = null;
  const [dispatchDone, onDone] = createEventDispatcher<ConsumableData<TInput>>('done');

  function onSubmit(e: Event) {
    e.preventDefault();
    if (toValue(props?.disabled)) {
      return;
    }

    next();
  }

  const formProps = computed(() => {
    const isForm = isFormElement(flow.formElement.value);

    return withRefCapture(
      {
        novalidate: isForm ? true : undefined,
        onSubmit: isForm ? onSubmit : undefined,
      },
      flow.formElement,
    );
  });

  function createStepResolverContext(direction: 'next' | 'previous'): StepResolveContext<TInput> {
    const current = flow.currentSegment.value;
    if (!current) {
      if (__DEV__) {
        warn(
          'There is no current step resolved, maybe you are trying to resolve a step before the first step is resolved?',
        );
      }

      return {
        currentStep: {
          id: '',
          name: '',
          visited: false,
          submitted: false,
          getValue: () => undefined,
        },
        currentIndex: 0,
        visitedSteps: [],
        isLastStep: false,
        steps: [],
        values: {} as PartialDeep<TInput>,
        direction,
        next: () => null,
        previous: () => null,
      };
    }

    const resolvedSteps = flow.segments.value.map(resolveSegmentMetadata);

    return {
      currentStep: current,
      currentIndex: flow.currentSegmentIndex.value,
      steps: resolvedSteps,
      visitedSteps: resolvedSteps.filter(segment => segment.visited),
      isLastStep: flow.isLastSegment.value,
      values: flow.values as PartialDeep<TInput>,
      direction,
      next: () => flow.resolveRelative(1),
      previous: () => flow.resolveRelative(-1),
    };
  }

  function defaultNext() {
    if (flow.isLastSegment.value) {
      flow.saveValues();
      dispatchDone(asConsumableData(cloneDeep(flow.values) as TInput));
      return;
    }

    flow.moveRelative(1);
  }

  const next = form.handleSubmit(async () => {
    if (!stepResolver) {
      return defaultNext();
    }

    await stepResolver(createStepResolverContext('next'));
  });

  async function previous() {
    if (!stepResolver) {
      flow.moveRelative(-1);
      return;
    }

    await stepResolver(createStepResolverContext('previous'));
  }

  const nextButtonProps = useControlButtonProps(btn => ({
    'aria-label': btn?.textContent ? undefined : (props?.nextLabel ?? 'Next'),
    type: 'submit',
    tabindex: '0',
    disabled: toValue(props?.disabled),
    onClick: isFormElement(flow.formElement.value) ? undefined : next,
  }));

  const previousButtonProps = useControlButtonProps(btn => ({
    'aria-label': btn?.textContent ? undefined : (props?.previousLabel ?? 'Previous'),
    tabindex: '0',
    disabled: flow.currentSegmentIndex.value === 0 || toValue(props?.disabled),
    onClick: previous,
  }));

  function goToStep(segmentId: number | string) {
    flow.goTo(segmentId, ({ segments, index, relativeDistance }) => {
      // Going backward is always allowed.
      if (relativeDistance < 0) {
        return true;
      }

      // If same step, don't allow the jump.
      if (relativeDistance === 0) {
        return false;
      }

      // Check if all segments up to the target segment have state, otherwise we don't allow the jump.
      return segments.slice(0, index + 1).every(segment => {
        return segment.visited;
      });
    });
  }

  function isCurrentStep(segmentId: number | string) {
    if (typeof segmentId === 'number') {
      return segmentId === flow.currentSegmentIndex.value;
    }

    return segmentId === flow.currentSegment.value?.name;
  }

  function getStepValue(segmentId: number | string) {
    return flow.getSegmentValues(segmentId);
  }

  function onBeforeStepResolve(resolver: StepResolver<TInput>) {
    stepResolver = resolver;
  }

  return {
    ...form,

    /**
     * Activates the given step in the flow, if the step does not exist it won't have an effect.
     * It also won't proceed to next steps if they have never been activated before.
     */
    goToStep,

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
     * Whether the current step is the last step in the flow.
     */
    isLastStep: flow.isLastSegment,

    /**
     * The current step in the flow.
     */
    currentStep: flow.currentSegment,

    /**
     * Activates the step in the flow, if it is already at the last step it will trigger the `onDone` handler.
     */
    next,

    /**
     * Activates the previous step in the flow if available.
     */
    previous,

    /**
     * A callback to be called when the all the steps are completed and the form is submitted.
     */
    onDone,

    /**
     * The FormStep component to be used within the form flow.
     */
    FormStep: FormFlowSegment,

    /**
     * Whether the given step is active (i.e. the current step).
     */
    isCurrentStep,

    /**
     * Gets the values of a step.
     */
    getStepValue,

    /**
     * A callback to be called before a step is resolved.
     */
    onBeforeStepResolve,
  };
}
