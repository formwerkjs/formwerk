<script setup lang="ts">
import { useForm } from '@formwerk/core';

import z from 'zod';
import InputText from './components/InputText.vue';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

const { values, getValue } = useForm({
  schema,
  initialValues: {
    firstName: 'john',
  },
});
</script>

<template>
  <div class="w-full h-full flex flex-col items-center justify-center`">
    <InputText name="firstName" label="First Name" />
    <InputText name="lastName" label="Last Name" />
    <pre>last name: {{ values.lastName }}</pre>
    <pre>get last name: {{ getValue('lastName') }}</pre>
    <pre>{{ values }}</pre>
  </div>
</template>
