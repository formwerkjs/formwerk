---
'@formwerk/core': minor
---

Use consistent API for query/set methods
- `isDirty()`, `isTouched()` and `isValid()` are now methods which can accept an optional path
- `getFieldValue()` is renamed to `getValue()`
- `setFieldErrors()` is renamed to `setErrors()`
- `setFieldValue()` is renamed to `setValue()`
- `setFieldTouched()` is renamed to `setTouched()`
- `getFieldvalue()` is renamed to `getValue()`
- `getFieldErrors()` is renmaed to `getErrors()`
    - `getErrors()` now only returns an array of errors as `string[]`
