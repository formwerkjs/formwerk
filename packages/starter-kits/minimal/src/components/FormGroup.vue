<script setup lang="ts">
import { type FormGroupProps, useFormGroup } from '@formwerk/core';

const props = defineProps<FormGroupProps>();

const { groupProps, labelProps } = useFormGroup(props);
</script>

<template>
  <div class="form-group" v-bind="groupProps">
    <p v-if="label" class="group-label" v-bind="labelProps">{{ label }}</p>

    <slot />
  </div>
</template>

<style scoped>
/** Your styles here, feel free to override any of this */
.form-group {
  .group-label {
    font-size: 1.25rem;
    font-weight: 600;
  }
}
</style>
