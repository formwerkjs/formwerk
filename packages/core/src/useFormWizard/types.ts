import { InjectionKey, MaybeRefOrGetter } from 'vue';
import { GenericFormSchema } from '../types';

export interface FormWizardStepProps<TSchema extends GenericFormSchema> {
  id?: string | number;
  schema?: TSchema;
}

export interface FormWizardContext {
  isStepActive: (stepId: string) => boolean;
  registerStep: (staticId: string, userStepId: MaybeRefOrGetter<string | number | undefined>) => void;
}

export const FormWizardContextKey: InjectionKey<FormWizardContext> = Symbol('FormWizardContext');
