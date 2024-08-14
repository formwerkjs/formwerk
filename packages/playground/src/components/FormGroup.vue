<template>
  <fieldset v-bind="groupProps" class="p-2 border border-gray-400 rounded-lg">
    <legend v-bind="labelProps">{{label}}</legend>

    <slot :display-error="displayError" :get-error="getError" />

    <pre class="bg-gray-600 text-white text-xs p-2.5 rounded-lg">Errors: {{getErrors()}}
    </pre>

    <div>values: {{ getValues()}}</div>
    <div>touched: {{ isTouched }}</div>
    <div>dirty: {{ isDirty }}</div>
    <div>valid: {{ isValid }}</div>
  </fieldset>
</template>

<script setup lang="ts">
import { FormGroupProps, useFormGroup } from '@formwerk/core';

const props = defineProps<FormGroupProps>();

const { labelProps, groupProps, getErrors, getError, displayError, getValues, isValid, isDirty, isTouched } = useFormGroup(props);
</script>
