import { InjectionKey, MaybeRefOrGetter } from 'vue';
import { GenericFormSchema, Getter } from '../types';

export interface FlowSegmentProps<TSchema extends GenericFormSchema> {
  name?: string;
  schema?: TSchema;
}

export interface SegmentRegistrationMetadata {
  /**
   * The unique ID of the step.
   */
  id: string;

  /**
   * The user given name of the step.
   */
  name: MaybeRefOrGetter<string | undefined>;
}

export interface SegmentMetadata {
  /**
   * The unique ID of the step.
   */
  id: string;

  /**
   * The user given name of the step.
   */
  name: Getter<string | undefined>;

  /**
   * If the step is visited, it means that the step has been activated at least once.
   */
  visited: boolean;

  /**
   * If the step has been submitted or was saved.
   */
  submitted: boolean;

  /**
   * Get the values of the step.
   */
  getValue: () => Record<string, unknown> | undefined;
}

export interface ResolvedSegmentMetadata extends Omit<SegmentMetadata, 'name'> {
  name: string;
}

export interface FormFlowContext {
  isSegmentActive: (segmentId: string) => boolean;
  registerSegment: (metadata: SegmentRegistrationMetadata) => void;
}

export type StepIdentifier = string | number | SegmentMetadata | ResolvedSegmentMetadata;

export const FormFlowContextKey: InjectionKey<FormFlowContext> = Symbol('FormFlowContext');
