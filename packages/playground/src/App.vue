<script setup lang="ts">
import { useFormWizard, FormWizardStep } from '@formwerk/core';
import InputText from './components/InputText.vue';
import Switch from './components/Switch.vue';

const { wizardProps, nextButtonProps, previousButtonProps } = useFormWizard();
</script>

<template>
  <div v-bind="wizardProps" class="w-full h-full flex flex-col items-center justify-center`">
    <div>
      <h1>Form Wizard</h1>
    </div>

    <FormWizardStep>
      <div>
        <h2>Step 1</h2>
      </div>

      <InputText name="name" label="Name" />
      <InputText name="email" label="Email" />
    </FormWizardStep>

    <FormWizardStep>
      <div>
        <h2>Step 2</h2>
      </div>

      <InputText name="address" label="Address" />
      <Switch name="terms" label="I accept the terms and conditions" />
    </FormWizardStep>

    <div class="grid grid-cols-2 gap-4">
      <button class="bg-gray-700 p-2 rounded-md" v-bind="previousButtonProps">⬅️ Previous</button>
      <button class="bg-gray-700 p-2 rounded-md" v-bind="nextButtonProps">Next ➡️</button>
    </div>
  </div>
</template>
