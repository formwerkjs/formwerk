import { InjectionKey } from 'vue';
import { CalendarContext } from './types';

export const CalendarContextKey: InjectionKey<CalendarContext> = Symbol('CalendarContext');
