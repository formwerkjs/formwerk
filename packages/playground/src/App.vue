<script setup lang="ts">
import z from 'zod';
import { useForm } from '@formwerk/core';
import FormGroup from '@/components/FormGroup.vue';
import InputText from '@/components/InputText.vue';

const { isDirty } = useForm({
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
    {{ isDirty() }}

    <InputText name="name" label="Your Name" />
    <InputText name="account.name" label="Account Name" />

    <FormGroup name="company" label="Company">
      <InputText name="name" label="Account Name" />
      <InputText name="address" label="Address" />
    </FormGroup>
  </div>
</template>
