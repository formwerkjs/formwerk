import { InjectionKey } from 'vue';
import { CalendarContext } from './types';

export const CalendarContextKey: InjectionKey<CalendarContext> = Symbol('CalendarContext');

export const YEAR_CELLS_COUNT = 9;

export const MONTHS_COLUMNS_COUNT = 3;

export const YEARS_COLUMNS_COUNT = 3;
