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
  border: 1px solid #e5e7eb;
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
  border-left: 1px solid #e5e7eb;
}

.control-btn {
  padding: 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #6b7280;
  font-size: 0.875rem;
}

.control-btn:hover {
  background: #f3f4f6;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-btn.remove {
  color: #ef4444;
}

.add-btn {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: white;
  color: #374151;
  width: max-content;
  cursor: pointer;
}

.add-btn:hover {
  background: #f3f4f6;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
