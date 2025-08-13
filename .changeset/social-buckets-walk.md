---
'@formwerk/core': patch
'@formwerk/devtools': patch
---

Fixes disable html validation config by using a thin wrapper to that Vue does not cast non-provided values as false.
