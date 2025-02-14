<script setup lang="ts">
import { useFormRepeater, type FormRepeaterProps } from '@formwerk/core';

const props = defineProps<FormRepeaterProps>();

const { items, addButtonProps, Iteration } = useFormRepeater(props);
</script>

<template>
  <div class="repeater-container">
    <TransitionGroup name="list">
      <Iteration
        v-for="(key, index) in items"
        :index="index"
        :key="key"
        as="div"
        class="repeater-item"
        v-slot="{ removeButtonProps, moveUpButtonProps, moveDownButtonProps }"
      >
        <div class="repeater-item-content">
          <slot :index="index" />
        </div>

        <div class="bg-zinc-800 ml-auto px-1.5 flex flex-col items-center justify-center gap-2">
          <button
            v-bind="moveUpButtonProps"
            class="w-6 h-6 group disabled:opacity-50 disabled:text-zinc-400 text-emerald-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class="fill-current">
              <path
                d="M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z"
              ></path>
            </svg>
          </button>

          <button
            v-bind="removeButtonProps"
            class="w-6 h-6 group disabled:opacity-50 disabled:text-zinc-400 text-red-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" class="fill-current">
              <path
                d="M216,48H40a12,12,0,0,0,0,24h4V208a20,20,0,0,0,20,20H192a20,20,0,0,0,20-20V72h4a12,12,0,0,0,0-24ZM188,204H68V72H188ZM76,20A12,12,0,0,1,88,8h80a12,12,0,0,1,0,24H88A12,12,0,0,1,76,20Z"
              ></path>
            </svg>
          </button>

          <button
            v-bind="moveDownButtonProps"
            class="w-6 h-6 group disabled:opacity-50 disabled:text-zinc-400 text-emerald-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="fill-current" viewBox="0 0 256 256">
              <path
                d="M208.49,152.49l-72,72a12,12,0,0,1-17,0l-72-72a12,12,0,0,1,17-17L116,187V40a12,12,0,0,1,24,0V187l51.51-51.52a12,12,0,0,1,17,17Z"
              ></path>
            </svg>
          </button>
        </div>
      </Iteration>
    </TransitionGroup>

    <button
      v-bind="addButtonProps"
      class="bg-zinc-900 gap-2 flex items-center max-w-max font-medium text-white py-2 px-4 rounded-sm"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 fill-current text-zinc-400" viewBox="0 0 256 256">
        <path
          d="M128,24A104,104,0,1,0,232,128,104.13,104.13,0,0,0,128,24Zm40,112H136v32a8,8,0,0,1-16,0V136H88a8,8,0,0,1,0-16h32V88a8,8,0,0,1,16,0v32h32a8,8,0,0,1,0,16Z"
        ></path>
      </svg>

      Add
    </button>
  </div>
</template>

<style scoped>
@reference "../style.css";

.repeater-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.repeater-item {
  @apply border border-zinc-500 overflow-hidden max-w-md rounded-lg shadow-sm bg-zinc-700;
  display: flex;
  gap: 12px;

  .repeater-item-buttons {
    @apply bg-zinc-800;
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    flex-direction: column;
  }

  .repeater-item-content {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
}

.list-move, /* apply transition to moving elements */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.list-leave-to {
  opacity: 0;
}

/* ensure leaving items are taken out of layout flow so that moving
   animations can be calculated correctly. */
.list-leave-active {
  height: 0;
}
</style>
