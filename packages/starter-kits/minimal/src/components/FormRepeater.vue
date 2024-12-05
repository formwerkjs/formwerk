<script setup lang="ts">
import { useFormRepeater, type FormRepeaterProps } from '@formwerk/core';

const props = defineProps<FormRepeaterProps>();

const { items, addButtonProps, Iteration } = useFormRepeater(props);
</script>

<template>
  <div class="repeater">
    <TransitionGroup name="list">
      <Iteration
        v-for="(key, index) in items"
        :index="index"
        :key="key"
        as="div"
        class="repeater-item"
        v-slot="{ removeButtonProps, moveUpButtonProps, moveDownButtonProps }"
      >
        <div class="repeater-content">
          <slot />
        </div>

        <div class="repeater-controls">
          <button v-bind="moveUpButtonProps" class="control-btn">↑</button>
          <button v-bind="removeButtonProps" class="control-btn remove">×</button>
          <button v-bind="moveDownButtonProps" class="control-btn">↓</button>
        </div>
      </Iteration>
    </TransitionGroup>

    <button v-bind="addButtonProps" class="add-btn" type="button">+ Add Item</button>
  </div>
</template>

<style scoped>
/** Your styles here, feel free to override any of this */
.repeater {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.repeater-item {
  border: 1px solid #000;
  border-radius: 0.375rem;
  display: flex;
  background: white;
}

.repeater-content {
  padding: 0.75rem;
  flex: 1;
}

.repeater-controls {
  display: flex;
  flex-direction: column;
}

/* Transitions */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(1rem);
}

.list-leave-active {
  position: absolute;
}
</style>
