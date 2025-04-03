import { InjectionKey } from 'vue';
import { GenericFormSchema } from '../types';

export interface FormWizardStepProps<TSchema extends GenericFormSchema> {
  schema?: TSchema;
}

export interface FormWizardContext {
  isStepActive: (stepId: string) => boolean;
}

export const FormWizardContextKey: InjectionKey<FormWizardContext> = Symbol('FormWizardContext');
