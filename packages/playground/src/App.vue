<script setup lang="ts">
import { useFormFlow, FormFlowSegment } from '@formwerk/core';
import InputText from './components/InputText.vue';
import Switch from './components/Switch.vue';
import { z } from 'zod';

const { formProps, nextButtonProps, previousButtonProps, onDone, goTo, currentSegment } = useFormFlow();

const step1 = z.object({
  name: z.string(),
  email: z.string().email(),
});

const step2 = z.object({
  address: z.string(),
  terms: z.boolean(),
});

onDone(data => {
  console.log('done', data.toJSON());
});
</script>

<template>
  <form v-bind="formProps" class="w-full h-full flex flex-col items-center justify-center`">
    <div>
      <h1>Form Wizard</h1>
    </div>

    <div class="mt-4 flex space-x-4 mb-6">
      <button
        type="button"
        :aria-selected="currentSegment === 'info'"
        class="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 aria-selected:bg-emerald-500 aria-selected:text-white"
        @click="goTo('info')"
      >
        Basic Info
      </button>

      <button
        type="button"
        :aria-selected="currentSegment === 'address'"
        @click="goTo('address')"
        class="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 aria-selected:bg-emerald-500 aria-selected:text-white"
      >
        Address
      </button>
    </div>

    <FormFlowSegment :schema="step1" id="info">
      <div>
        <h2>Step 1</h2>
      </div>

      <InputText name="name" label="Name" />
      <InputText name="email" label="Email" />
    </FormFlowSegment>

    <FormFlowSegment :schema="step2" id="address">
      <div>
        <h2>Step 2</h2>
      </div>

      <InputText name="address" label="Address" />
      <Switch name="terms" label="I accept the terms and conditions" />
    </FormFlowSegment>

    <div class="grid grid-cols-2 gap-4">
      <button class="bg-gray-700 p-2 rounded-md" v-bind="previousButtonProps">⬅️ Previous</button>
      <button class="bg-gray-700 p-2 rounded-md" v-bind="nextButtonProps">Next ➡️</button>
    </div>
  </form>
</template>

<style>
button:disabled {
  @apply cursor-not-allowed opacity-50;
}
</style>
