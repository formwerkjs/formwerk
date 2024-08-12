<template>
  <fieldset v-bind="groupProps">
    <legend v-bind="labelProps">Shipping Address</legend>

    <slot />
  </fieldset>
</template>

<script setup lang="ts">
import { FormGroupProps, useFormGroup } from '@formwerk/core';

const props = defineProps<FormGroupProps>();

const { labelProps, groupProps } = useFormGroup(props);
</script>
