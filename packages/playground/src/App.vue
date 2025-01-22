<script setup lang="ts">
import z from 'zod';
import { useForm } from '@formwerk/core';
import FormGroup from '@/components/FormGroup.vue';
import InputText from '@/components/InputText.vue';

const schema = z.object({
  name: z.string(),
  company: z.object({
    name: z.string(),
    address: z.string(),
  }),
});

const { values, displayError, ...form } = useForm({ schema });

const markNameAsTouched = () => {
  // form.setFieldTouched('account', true);
  // form.setFieldTouched('account.name', true);
};
</script>

<template>
  <div class="flex flex-col w-1/2 gap-4">
    <pre>{{ values }}</pre>
    <InputText name="name" label="Your Name" />
    <FormGroup name="company" label="Company">
      <InputText name="name" label="Account Name" />
      <InputText name="address" label="Address" />
    </FormGroup>
  </div>
</template>
