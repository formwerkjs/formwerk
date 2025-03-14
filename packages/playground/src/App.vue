<script setup lang="ts">
import z from 'zod';
import DateField from '@/components/DateField.vue';
import Calendar from '@/components/Calendar.vue';
import InputText from '@/components/InputText.vue';
import FormGroup from '@/components/FormGroup.vue';
import { createCalendar, IslamicUmalquraCalendar } from '@internationalized/date';
import { useForm } from '@formwerk/core';
const calendar = createCalendar('islamic-umalqura');

// You need to be careful with the time component of the date object.
// JS date objects fills the date time with the current time component.

const schema = z.object({
  company: z.string(),
  employee: z.object({
    name: z.string().nonempty(),
    email: z.string().email(),
  }),
});
const { values, ...form } = useForm({
  schema,
});

const reset = () => {
  form.reset('company', { values: { company: 'Reset Company' } });
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <pre>{{ values }}</pre>
    <button @click="reset">Reset</button>
    <InputText label="Company" name="company" />
    <FormGroup label="Employee" name="employee">
      <InputText label="Name" name="name" />
      <InputText label="Email" name="email" />
    </FormGroup>
  </div>
</template>
