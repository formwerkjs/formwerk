<script setup lang="ts" generic="TOptionValue, TOptionItem extends { label: string; value: TOptionValue }">
import { useOptionGroup, type OptionGroupProps } from '@formwerk/core';
import Option from './Option.vue';

interface Props extends OptionGroupProps {
  options?: TOptionItem[];
}

const props = defineProps<Props>();

const { groupProps, labelProps } = useOptionGroup(props);
</script>

<template>
  <div class="option-group" v-bind="groupProps">
    <p v-bind="labelProps">{{ label }}</p>

    <div class="option-group-options">
      <slot v-if="!options" />

      <template v-else>
        <Option v-for="option in options" :key="option.label" :label="option.label" :value="option.value" />
      </template>
    </div>
  </div>
</template>

<style scoped>
/** Your styles here, feel free to override any of this */
.option-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
