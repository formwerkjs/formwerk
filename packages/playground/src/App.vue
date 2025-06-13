<script setup lang="ts">
import { useStepFormFlow } from '@formwerk/core';
import InputText from './components/InputText.vue';
import InputTextArea from './components/InputTextArea.vue';
import z from 'zod';

const {
  formProps,
  nextButtonProps,
  previousButtonProps,
  onDone,
  isLastStep,
  FormStep,
  goToStep,
  isStepActive,
  getStepValue,
} = useStepFormFlow();

const step1 = z.object({
  name: z.string(),
  email: z.string().email(),
});

const step2 = z.object({
  address: z.string(),
});

onDone(data => {
  console.log(data.toObject());
});
</script>

<template>
  <form v-bind="formProps" class="w-full h-full flex flex-col items-center justify-center">
    <div class="flex gap-2 my-8">
      <button
        type="button"
        class="bg-gray-700 p-2 rounded-full aria-selected:bg-emerald-500 hover:bg-gray-500"
        :aria-selected="isStepActive(0)"
        @click="goToStep(0)"
      >
        Go to step 1
      </button>
      <button
        type="button"
        class="bg-gray-700 p-2 rounded-full aria-selected:bg-emerald-500 hover:bg-gray-500"
        :aria-selected="isStepActive(1)"
        @click="goToStep(1)"
      >
        Go to step 2
      </button>
      <button
        type="button"
        class="bg-gray-700 p-2 rounded-full aria-selected:bg-emerald-500 hover:bg-gray-500"
        :aria-selected="isStepActive(2)"
        @click="goToStep(2)"
      >
        Go to step 3
      </button>
    </div>

    <FormStep name="step-1" :schema="step1">
      {{ getStepValue(0) }}

      <InputText name="name" label="Name" />
      <InputText name="email" label="Email" />
    </FormStep>

    <FormStep name="step-2" :schema="step2">
      {{ getStepValue(1) }}

      <InputTextArea name="address" label="Address" />
    </FormStep>

    <FormStep name="step-3">
      {{ getStepValue(2) }}

      <InputText name="city" label="City" />
    </FormStep>

    <div class="mt-10 grid grid-cols-2 gap-4">
      <button class="bg-gray-700 p-2 rounded-md" v-bind="previousButtonProps">⬅️ Previous</button>
      <button class="bg-gray-700 p-2 rounded-md" v-bind="nextButtonProps">
        {{ isLastStep ? 'Submit' : 'Next ➡️' }}
      </button>
    </div>
  </form>
</template>

<style>
button:disabled {
  @apply cursor-not-allowed opacity-50;
}
</style>
