<script setup lang="ts">
import { useId } from 'vue';
import { useComboBox, type ComboBoxProps, useDefaultFilter } from '@formwerk/core';

const props = defineProps<ComboBoxProps<string, string>>();
const id = useId();
const anchorId = `--anchor-${id}`;

const { contains } = useDefaultFilter({
  caseSensitive: false,
});

const {
  buttonProps,
  inputProps,
  labelProps,
  errorMessageProps,
  errorMessage,
  descriptionProps,
  listBoxProps,
  isListEmpty,
} = useComboBox(props, {
  filter: contains,
});
</script>

<template>
  <div class="combobox">
    <div v-bind="labelProps" class="combobox-label">{{ label }}</div>

    <div class="control">
      <input v-bind="inputProps" />

      <button v-bind="buttonProps">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 256 256">
          <path
            d="M181.66,170.34a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-48-48a8,8,0,0,1,11.32-11.32L128,212.69l42.34-42.35A8,8,0,0,1,181.66,170.34Zm-96-84.68L128,43.31l42.34,42.35a8,8,0,0,0,11.32-11.32l-48-48a8,8,0,0,0-11.32,0l-48,48A8,8,0,0,0,85.66,85.66Z"
          ></path>
        </svg>
      </button>
    </div>

    <div v-bind="listBoxProps" popover class="listbox">
      <slot />

      <div v-if="isListEmpty" class="empty-message">No Results</div>
    </div>

    <div v-if="description" v-bind="descriptionProps" class="hint">
      {{ description }}
    </div>

    <div v-if="errorMessage" v-bind="errorMessageProps" class="error">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.combobox {
  --color-text: #333;
  --color-hint: #666;
  --color-focus: #059669;
  --color-error: #f00;
  --color-hover: #eee;
  --color-border: #d4d4d8;

  display: flex;
  flex-direction: column;
  width: max-content;

  .combobox-label {
    color: var(--color-text);
    display: block;
    margin-bottom: 0.25rem;
    font-size: 14px;
    font-weight: 500;
  }

  .control {
    display: flex;
    align-items: center;
    justify-content: space-between;
    /** CSS Anchor Positioning */
    anchor-name: v-bind('anchorId');
    border: 1px solid var(--color-border);
    font-size: 14px;
    color: var(--color-text);
    border-radius: 0.375rem;
    user-select: none;
    cursor: pointer;

    svg {
      margin-left: 4px;
    }

    &:focus {
      outline: none;
      border: 1px solid var(--color-focus);
    }

    button {
      background: transparent;
      border: none;
      cursor: pointer;
    }

    input {
      border: none;
      height: 100%;
      width: 100%;
      outline: none;
      padding: 4px 8px;
      background: transparent;
    }
  }

  .listbox {
    padding: 0;
    inset: auto;
    position: relative;
    background: #fff;
    border: 1px solid #e5e7eb;
    max-height: 40vh;
    opacity: 0;
    border-radius: 6px;
    margin: 0;
    width: 250px;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
    transition:
      display 0.2s allow-discrete,
      opacity 0.2s allow-discrete,
      transform 0.2s allow-discrete,
      overlay 0.2s allow-discrete;

    &:popover-open {
      opacity: 1;
    }

    padding: 8px;

    &:has(.option-group) {
      padding: 0;
    }

    /** CSS Anchor Positioning */
    position-anchor: v-bind('anchorId');
    inset-area: bottom center;
    position-area: bottom center;
    position-try-fallbacks:
      flip-block,
      flip-inline,
      flip-block flip-inline;
    position-try-order: max-height;
    scrollbar-width: thin;
    overflow-y: auto;
    overflow-y: overlay;
    scrollbar-color: rgb(192 192 185) transparent;
  }

  .hint,
  .error {
    margin-top: 0.25rem;
  }

  .error {
    color: var(--color-error);
    display: none;
    font-size: 13px;
  }

  .hint {
    color: var(--color-hint);
    font-size: 13px;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:has(:focus) {
    .hint {
      opacity: 1;
    }
  }

  &:has([aria-invalid='true']) {
    .hint {
      display: none;
    }

    .error {
      display: block;
    }
  }

  .empty-message {
    color: var(--color-text);
    font-size: 13px;
  }
}

@starting-style {
  .listbox:popover-open {
    opacity: 0;
  }
}
</style>
