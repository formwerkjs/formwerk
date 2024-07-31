import { Schema, Simplify } from 'type-fest';
import { FormObject } from './common';
import { Path } from './paths';

export type TouchedSchema<TForm extends FormObject> = Simplify<Schema<TForm, boolean>>;

export type DisabledSchema<TForm extends FormObject> = Partial<Record<Path<TForm>, boolean>>;