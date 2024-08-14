<template>
  <div class="flex flex-col">
  <FormGroup name="group1" label="Group 1">
    <InputText label="Email" name="email" type="email" :schema="defineSchema(z.string().email())" />
    <InputText label="Other" name="other" required />
  </FormGroup>

    <FormGroup name="group2" label="Group 2" class="mt-6">
      <InputText label="Email" name="email" type="email" :schema="defineSchema(z.string().email())" />
      <InputText label="Other" name="other" required />
    </FormGroup>


    <button @click="onSubmit">Submit</button>
  </div>
</template>

<script lang="ts" setup>
import InputText from '@/components/InputText.vue';
import FormGroup from '@/components/FormGroup.vue';
import { useForm } from '@formwerk/core';
import { defineSchema } from '@formwerk/schema-zod';
import { z } from 'zod';


const { getErrors, values, handleSubmit } = useForm({
  schema: defineSchema(
    z.object({
      other: z.string().min(3),
    }),
  ),
});

const onSubmit = handleSubmit(values => {
  console.log(values);
});
</script>
