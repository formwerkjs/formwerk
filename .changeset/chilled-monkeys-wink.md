---
'@formwerk/core': patch
---

Use consistent API for query/set methods
- `isDirty()`, `isTouched()` and `isValid()` are now methods which can accept an optional path
- `setFieldErrors()` is renamed to `setErrors()`
- `setFieldValue()` is renamed to `setValue()`
- `setFieldTouched()` is renamed to `setTouched()`
