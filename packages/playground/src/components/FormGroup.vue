<template>
  <div v-bind="groupProps" class="overflow-hidden border rounded-lg border-zinc-500">
    <div class="px-8 py-4 mb-7 bg-zinc-800">
      <h2 v-bind="labelProps" class="text-2xl font-semibold text-white">{{ label }}</h2>
    </div>

    {{ { isDirty, isTouched } }}

    <div class="flex flex-col gap-2 p-8">
      <slot :get-error="getError" :isTouched="isTouched" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { FormGroupProps, useFormGroup } from '@formwerk/core';

const props = defineProps<FormGroupProps>();

const { labelProps, groupProps, getError, isDirty, isTouched } = useFormGroup(props);
</script>
