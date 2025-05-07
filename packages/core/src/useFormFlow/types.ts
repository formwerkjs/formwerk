import { InjectionKey, MaybeRefOrGetter } from 'vue';
import { GenericFormSchema } from '../types';

export interface FlowSegmentProps<TSchema extends GenericFormSchema> {
  id?: string | number;
  schema?: TSchema;
}

export interface FormFlowContext {
  isSegmentActive: (segmentId: string) => boolean;
  registerSegment: (staticId: string, userSegmentId: MaybeRefOrGetter<string | number | undefined>) => void;
}

export const FormFlowContextKey: InjectionKey<FormFlowContext> = Symbol('FormFlowContext');
