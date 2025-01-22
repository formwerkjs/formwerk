<template>
  <div v-bind="groupProps" class="overflow-hidden border rounded-lg border-zinc-500">
    <div class="px-8 py-4 mb-7 bg-zinc-800">
      <h2 v-bind="labelProps" class="text-2xl font-semibold text-white">{{ label }}</h2>
    </div>

    <div class="flex flex-col gap-2 p-8">
      <slot :display-error="displayError" :get-error="getError" :isTouched="isTouched" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { FormGroupProps, useFormGroup } from '@formwerk/core';

const props = defineProps<FormGroupProps>();

const { labelProps, groupProps, getErrors, getError, displayError, getValues, isValid, isDirty, isTouched } =
  useFormGroup(props);
</script>
