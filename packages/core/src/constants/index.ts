export const FieldTypePrefixes = {
  NumberField: 'nf',
  TextField: 'tf',
  Switch: 'sw',
  Checkbox: 'cb',
  CheckboxGroup: 'cbg',
  RadioButton: 'rb',
  RadioButtonGroup: 'rbg',
  Slider: 'sl',
  SearchField: 'sf',
  FormGroup: 'fg',
  Select: 'se',
  Option: 'opt',
  OptionGroup: 'og',
  Form: 'f',
  SliderThumb: 'st',
  FormRepeater: 'fr',
} as const;

export const NOOP = () => {};

export const SCHEMA_BATCH_MS = 10;

export const version = '__VERSION__';
