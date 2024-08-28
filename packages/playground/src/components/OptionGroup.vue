<template>
  <div v-bind="groupProps" class="">
    <p v-bind="labelProps" class="bg-gray-600 text-white px-2 py-1 select-none sticky top-0">{{ label }}</p>

    <div class="px-1 flex flex-col gap-0.5 py-1">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { OptionGroupProps, useOptionGroup } from '@formwerk/core';

interface TheProps extends OptionGroupProps {
  label: string;
}

const props = defineProps<TheProps>();

const { labelProps, groupProps } = useOptionGroup(props);
</script>
