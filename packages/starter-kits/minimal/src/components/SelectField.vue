<script
  setup
  lang="ts"
  generic="
    TValue,
    TOption extends { label: string; value: TValue },
    TGroup extends { label: string; options: TOption[] }
  "
>
import { useSelect, type SelectProps } from '@formwerk/core';
import OptionGroup from './OptionGroup.vue';
import Option from './Option.vue';

interface Props extends SelectProps<TValue> {
  options?: TOption[];
  groups?: TGroup[];
}

const props = defineProps<Props>();

const { triggerProps, popupProps, labelProps, errorMessage, errorMessageProps, descriptionProps } = useSelect(props);
</script>

<template>
  <div class="select-field">
    <p v-bind="labelProps">{{ label }}</p>
    <button v-bind="triggerProps" class="select-trigger">
      {{ label }}

      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
        <path
          d="M184.49,167.51a12,12,0,0,1,0,17l-48,48a12,12,0,0,1-17,0l-48-48a12,12,0,0,1,17-17L128,207l39.51-39.52A12,12,0,0,1,184.49,167.51Zm-96-79L128,49l39.51,39.52a12,12,0,0,0,17-17l-48-48a12,12,0,0,0-17,0l-48,48a12,12,0,0,0,17,17Z"
        ></path>
      </svg>
    </button>

    <div v-bind="popupProps" class="select-popup">
      <!-- You can either pass options as a prop, groups as a prop, or use the slot and inline the OptionGroup and Option components -->
      <slot v-if="!groups && !options" />

      <OptionGroup
        v-else-if="groups"
        v-for="group in groups"
        :key="group.label"
        :label="group.label"
        :options="group.options"
      />

      <Option
        v-else-if="options"
        v-for="option in options"
        :key="option.label"
        :label="option.label"
        :value="option.value"
      />
    </div>

    <p v-if="errorMessage" v-bind="errorMessageProps" class="error-message">{{ errorMessage }}</p>
    <p v-else-if="description" v-bind="descriptionProps">{{ description }}</p>
  </div>
</template>

<style scoped>
/** Your styles here, feel free to override any of this */
.select-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.select-trigger {
  padding: 4px 8px;
  background-color: #fff;
  border: 1px solid #000;
  display: flex;
  align-items: center;
  width: 100%;

  svg {
    width: 16px;
    height: 16px;
    margin-left: auto;
  }
}
</style>
