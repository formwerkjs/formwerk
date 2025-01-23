<script setup lang="ts">
import z from 'zod';
import { useForm } from '@formwerk/core';
import FormGroup from '@/components/FormGroup.vue';
import InputText from '@/components/InputText.vue';

useForm({
  schema: z.object({
    name: z.string(),
    test: z.object({
      name: z.string(),
      company: z.object({
        name: z.string(),
        address: z.string(),
      }),
    }),
  }),
});
</script>

<template>
  <div class="flex flex-col w-1/2 gap-4">
    <InputText name="name" label="Your Name" />
    <FormGroup name="test" label="Company">
      <InputText name="name" label="Account Name" />

      <FormGroup name="company" label="Company">
        <InputText name="name" label="Account Name" />
        <InputText name="address" label="Address" />
      </FormGroup>
    </FormGroup>
  </div>
</template>
