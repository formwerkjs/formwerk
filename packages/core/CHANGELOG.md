# @formwerk/core

## 0.11.5

### Patch Changes

- 33dde11: Fixes disable html validation config by using a thin wrapper to that Vue does not cast non-provided values as false.
- Updated dependencies [33dde11]
  - @formwerk/devtools@0.11.5

## 0.11.4

### Patch Changes

- c7a12dd: fix: move step visibility condition to render fn
- 81e650d: fix: hide the form step root element when inactive
  - @formwerk/devtools@0.11.4

## 0.11.3

### Patch Changes

- b4786e5: fix(useFileField): reset isDragging on file drop
  - @formwerk/devtools@0.11.3

## 0.11.2

### Patch Changes

- c68d13a: feat: expose currentIndex to the composable
  - @formwerk/devtools@0.11.2

## 0.11.1

### Patch Changes

- 99e3f1e: feat: add wait signal to step resolver for external control
- e1b6538: fix: mark swiches default false value as low priority
- 545c4e2: feat: exported several internal types for public use
  - @formwerk/devtools@0.11.1

## 0.11.0

### Minor Changes

- 5b95c4b: feat: added stepped form flow

### Patch Changes

- @formwerk/devtools@0.11.0

## 0.10.7

### Patch Changes

- 3fc878d: revert - fix(types): should be able to infer values from initial values
- 844f315: fix: ensure correct container type is set in path utility
- 3fc878d: fix(types): infer values from initial values and schema
  - @formwerk/devtools@0.10.7

## 0.10.6

### Patch Changes

- 9544540: fix: pass timezone value to date field calendar props
  - @formwerk/devtools@0.10.6

## 0.10.5

### Patch Changes

- 8ce63d2: fix: prefer current value over form initial value when init field #169
  - @formwerk/devtools@0.10.5

## 0.10.4

### Patch Changes

- 15b54e9: fix(validation): properly combine validation sources from fields, forms, groups
- 016a8a3: fix: prefer overrwrites when mass setting values closes #164
  - @formwerk/devtools@0.10.4

## 0.10.3

### Patch Changes

- 575ecfe: fix: set touched for otp fields #162
  - @formwerk/devtools@0.10.3

## 0.10.2

### Patch Changes

- 25f64a4: fix: invalid dates errors with seconds and HTML validation in time fields
- Updated dependencies [66ce83b]
  - @formwerk/devtools@0.10.2

## 0.10.1

### Patch Changes

- 942b7ff: feat: added spinOnly prop for DateTimeSegments
- 98055e9: feat: expose `validate` function on all fields #157
- bfd2219: fix(types): should be able to infer form values from initial values
- 6fc35fd: Expand the form reset function
  - @formwerk/devtools@0.10.1

## 0.10.0

### Minor Changes

- 672c8f4: feat: implement file field

### Patch Changes

- 34f129d: feat: implement the time field
- 672c8f4: feat: added support for picker mode
- cbe9394: refactor: remove some disabled context redundencies
- c49b072: feat: overload set errors to set multiple errors at once closes #149
  - @formwerk/devtools@0.10.0

## 0.9.2

### Patch Changes

- c7b99a3: fix: wait for next tick before setting otp slot value closes #151
  - @formwerk/devtools@0.9.2

## 0.9.1

### Patch Changes

- bb84a08: fix: correctly detect nested paths for error reporting closes #150
  - @formwerk/devtools@0.9.1

## 0.9.0

### Minor Changes

- 873bbae: feat: add OTP Field

### Patch Changes

- @formwerk/devtools@0.9.0

## 0.8.4

### Patch Changes

- 43b4a7c: feat: expose the picker el in usePicker
- 6ed644c: feat(bundle): added PURE annotations for exported helper components
- 080eff3: fix: apply keys externally on calendar and segment components
  - @formwerk/devtools@0.8.4

## 0.8.3

### Patch Changes

- df355c5: fix: handle enter key on android firefox
- c3f2be2: fix: negative signs affecting number parsing with date segments
- ce583ea: feat: implement HTML constraint validator
- 8a27ecc: fix: prevent date segments from having invalid min value
- e969bb7: fix: use true as contenteditable value on firefox
- 38a039d: feat: added useFormContext to inject parent forms
- accc2e8: feat: added handleReset fn
- a764650: fix: initialize known date segments and disable locked ones
- bb01448: fix(types): default checkbox value prop type to boolean
- Updated dependencies [c6e1853]
  - @formwerk/devtools@0.8.3

## 0.8.2

### Patch Changes

- 04fb9d7: fix: combobox label for attribute binding
- b2b5297: fix: label "for" attribute should be only for form elements
- 07357e9: fix: change time placeholders to dashes since it is more common
- d34984c: feat: initial devtools support
- 80634bb: feat: expose "getIssues" on useForm
- Updated dependencies [d34984c]
  - @formwerk/devtools@0.8.2

## 0.8.1

### Patch Changes

- 4a9be13: fix: return Promise<void> instead of Promise<unknown>

## 0.8.0

### Minor Changes

- 20001c5: feat: implement useDateTimeField

## 0.7.0

### Minor Changes

- f4f4384: Use consistent API for query/set methods
  - `isDirty()`, `isTouched()` and `isValid()` are now methods which can accept an optional path
  - `getFieldValue()` is renamed to `getValue()`
  - `setFieldErrors()` is renamed to `setErrors()`
  - `setFieldValue()` is renamed to `setValue()`
  - `setFieldTouched()` is renamed to `setTouched()`
  - `getFieldvalue()` is renamed to `getValue()`
  - `getFieldErrors()` is renmaed to `getErrors()`
    - `getErrors()` now only returns an array of error messages as `string[]`

### Patch Changes

- 3c955de: fix: track dirty state manually
- e873ea0: feat: expose getError, getValue, getErrors on form groups

## 0.6.6

### Patch Changes

- eabaac6: fix: add autocomplete to useTextField

## 0.6.5

### Patch Changes

- d1e5013: Enhance getErrors function to filter errors by path if provided. We also check for path prefix errors if no direct path errors exist.

## 0.6.4

### Patch Changes

- ba8616a: fix: avoid on input elements when using label element

## 0.6.3

### Patch Changes

- 272ad5c: Add group awareness to setInPath
- a33b351: allow nesting form groups
- dac9149: fix: propagate validation upwards in nested groups

## 0.6.2

### Patch Changes

- db5b16c: fix: prefer initial values inferring from schema rather than itself
- 8b5056c: feat(combobox): added the ability to reject new values
- 697f921: fix(combobox,select): activedecendant should highlight the focused not the selected
- 698ea26: fix(combobox): readonly should not allow value mutation
- ff7164a: fix(combobox): prevent creating new options on blur
- 3bdc80d: feat(combobox): added openOnFocus prop

## 0.6.1

### Patch Changes

- 7d16bd2: fix: useCustomField validation not running form schema

## 0.6.0

### Minor Changes

- eb2f547: feat: implement useComboBox
- cbb5b23: feat: Implement `useCustomField` closes #96

### Patch Changes

- 10ba736: fix: only scroll the option into view if it is not visible
- 6b83ee2: feat: Expose the validate function on custom fields

## 0.5.1

### Patch Changes

- c9c5b1e: fix: use deep ref for selectedOptions reactivity closes #100

## 0.5.0

### Minor Changes

- 145bc46: feat: add `isSubmitAttempted` to `useForm`
- 67cc35c: feat: Add `wasSubmitted` to `useForm`
- 898b804: feat: add `submitAttemptsCount` to `useForm`
- b3950ce: feat: adding `submitErrors` and `submitErrorMessage` in `useFormField`. `getSubmitError` and `getSubmitErrors' in 'useForm'.

## 0.4.0

### Minor Changes

- bf710e4: feat!: disabled fields no longer particpate in form validation state

### Patch Changes

- c6d8352: chore(bundle): chore: externalize standard schema and klona properly

## 0.3.1

### Patch Changes

- 4f21ebf: fix: do not apply hold or click events for right mouse buttons

## 0.3.0

### Minor Changes

- 9760517: feat(forms): implement scroll to first error

### Patch Changes

- dbaf982: feat: expose useLocale composable
- ef35098: fix: auto handle trigger button props for selects

## 0.2.2

### Patch Changes

- 78491b4: fix(slider): handle touch events for the slider
- 253da9b: chore: upgrade standard-schema spec to beta.4

## 0.2.1

### Patch Changes

- 3bb3ca5: docs: added comment for type props
- 6590dba: fix: add bounds check to move, swap and insert ops
- 9c0975f: feat: added ability to set valuetext for slider thumbs

## 0.2.0

### Minor Changes

- 3846584: feat: implement slider discrete values
- bbba9bf: feat: implement disabled form tree
- f39a332: feat: added toObject and make toJSON produce valid JSON output

### Patch Changes

- bd2adac: feat: added selectedOption and selectedOptions helpers

## 0.1.27

### Patch Changes

- e5c4a82: fix: disallow focus from disabled select trigger
- e0e11e9: fix: disallow focus from disabled switches

## 0.1.26

### Patch Changes

- 07d8f23: feat: add aria-disabled on trigger select props
- 729364a: feat: bump support for standard schema beta 4
- 8f053c3: fix(types): Make slider constrains numberish for consistency
- 7c4dcf8: fix(types): ensure produced field bindings are type safe

## 0.1.25

### Patch Changes

- 765f3c7: feat: exported FormSchema utility type
- eb6ab81: feat: add standard schema support

## 0.1.24

### Patch Changes

- 452b2dc: feat: warn if HTML validation language does not match configured language
- 3c9be6f: feat: expose formattedText from useNumberField
- 6e8f396: fix: avoid referencing window without SSR check
- 194cb14: fix: slider thumb data to return empty object instead of null
- 97a1cb9: feat: change isOpen to isPopoup open in useSelect
- 6c5cb5f: feat: drop support for indices path and only use dot paths
- 20cc8a9: fix: added value and placeholder props to useSelect
- 80364a3: feat: expose and rename element refs to els for consistency

## 0.1.23

### Patch Changes

- 0f7f05e: feat: make configuration reactive
- e4c8a99: feat: add detectDirection config
- 0da6b62: chore: added export entry for types

## 0.1.22

### Patch Changes

- 07584bf: fix: include cjs and mjs files in dist while publishing

## 0.1.21

### Patch Changes

- 1f13a5f: fix: avoid checking for File or Blob instances in SSR
- ba8771e: chore: rename package outputs

## 0.1.20

### Patch Changes

- 9c9b235: fix: ensure buttons props adapt to the element type
- e822e3f: feat: implement mouse wheel behavior for number field
- 159d86a: fix: form group getValues type should be of input type
- 94fe184: fix: add proper exports in package.json for all packages
- 3878bd2: feat: implement hidden field composable/component

## 0.1.19

### Patch Changes

- 00f920b: fix: expose iteration with root element cababilities to allow animation
- 03e74ec: feat: remove Repeat component API in favor of a singular API

## 0.1.18

### Patch Changes

- f9d9416: feat: add isFieldDirty to useForm
- 2a8e808: feat: add form repeater implementation
- 3759cc1: feat: reset re-validates by default
- 05ecda4: feat: drop inline groups
- 8ce260b: refactor: rename `mode` to `behavior` with setValue

## 0.1.17

### Patch Changes

- 4f70409: fix: skip disabled options from the focus order
- 591f7c4: fix: add novalidate to the formProps
- b01a6ce: fix: re-apply validationMessage after top-level validations are done

## 0.1.16

### Patch Changes

- 23c2f6d: fix: prevent popup opening when disabled

## 0.1.15

### Patch Changes

- 68b4d97: fix: handle disabled and readonly select states

## 0.1.14

### Patch Changes

- 0dd3d8e: fix: prevent thumb focus if disabled
- 2fb6f90: fix: slider vertical orientation thumb positioning

## 0.1.13

### Patch Changes

- 61a0ec0: feat: expose error message props on slider ecosystem
- 6523ba9: fix: run validation when thumb value changes
- 4205a69: fix: avoid reading validation state from grouped checkboxes or radios if a sibling is valid
- 90b0102: feat: add useThumbMetadata composable
- 419eeff: fix: adjust how thumbs are being registered in sliders
- ba4e329: fix: disable slider value changes when readonly or disabled
- 9d612aa: fix: add disableHtmlValidation on checkbox groups

## 0.1.12

### Patch Changes

- 0274c1f: fix: ensure validation is run on keydown for radios and checkboxes
- 59de4fd: feat(checkboxes): add ability to change group state
- 8a4aae1: fix: remove orientation prop from checkboxes
- 7a7c226: feat: add standalone prop to opt checkboxes out of the group

## 0.1.11

### Patch Changes

- c5ce5a1: fix: validate switches on click if custom
- 68775ed: feat: individual checkboxes should not report error message if in group
- 4cdde34: fix: readonly and disabled search fields are not clearable
- 4d2efc6: feat: add isGrouped state for checkboxes
- 16faf37: feat: add clear button label prop to useSearchField
- 14425a9: fix: switches readonly and disabled interaction prevention

## 0.1.10

### Patch Changes

- 90baccc: fix: radio focus navigation not wrapping around edges

## 0.1.9

### Patch Changes

- dc9cc4e: fix: navigating radios around disabled items

## 0.1.8

### Patch Changes

- d3f51a7: fix: readonly should not allow selection for checked
- b545643: fix: use click events to update validity for radios

## 0.1.7

### Patch Changes

- 33a630d: fix: readonly should prevent value mutation on radio and checkboxes
- 44a0bcd: fix: radio and checkboxes isDisabled state

## 0.1.6

### Patch Changes

- 7dc0e69: feat: allow non-button elements for spin buttons
- 1f9f28f: fix: disable number spin buttons if it is either disabled or readonly
- 2017403: fix: multi-input validity support for radio

## 0.1.5

### Patch Changes

- 0ce56e1: chore: upgrade dependencies and reduce vue minimum version
- f89c2c5: fix: use value prop to init textual fields values

## 0.1.4

### Patch Changes

- 2ebb2b7: fix: radio items no validating on multiple interactions

## 0.1.3

### Patch Changes

- be87654: feat: export version constant
- ff28d3d: fix: validation should trigger on grouped components changes
- c680f7f: fix: labels and descriptions aria are applied when their elements/values exist

## 0.1.2

### Patch Changes

- 056fda1: fix: include klona in output

## 0.1.1

### Patch Changes

- 0d551e5: feat: rename listbox props to popupProps

## 0.1.0

### Minor Changes

- 4634ea5: Initial internal test release
