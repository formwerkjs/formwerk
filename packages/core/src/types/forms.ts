import { Schema, Simplify } from 'type-fest';
import { FormObject } from './common';

export type TouchedSchema<TForm extends FormObject> = Simplify<Schema<TForm, boolean>>;
