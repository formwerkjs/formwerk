import { InjectionKey } from 'vue';

export interface SelectionContext<TOption, TValue = TOption> {
  isValueSelected(value: TValue): boolean;
  isMultiple(): boolean;
  toggleValue(value: TValue, force?: boolean): void;
}

export const SelectionContextKey: InjectionKey<SelectionContext<unknown>> = Symbol('SelectionContextKey');
