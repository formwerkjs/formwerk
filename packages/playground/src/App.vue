<template>
  <div class="flex flex-col">
    <InputText label="Email" name="email" type="email" :schema="defineSchema(z.string().email())" />
    <InputText label="Full Name" name="fullName" />

  <FormGroup name="address" label="Shipping Address" :schema="groupSchema">
    <InputText label="Address Line 1" name="street" />

    <div class="grid grid-cols-3 gap-4">
      <InputText label="City" name="city" />
      <InputText label="State" name="state" />
    <InputText label="Zip" name="zip" />
    </div>
  </FormGroup>

    {{values }}

    <button @click="onSubmit">Submit</button>
  </div>
</template>

<script lang="ts" setup>
import InputText from '@/components/InputText.vue';
import FormGroup from '@/components/FormGroup.vue';
import { useForm } from '@formwerk/core';
import { defineSchema } from '@formwerk/schema-zod';
import { z } from 'zod';

const groupSchema = defineSchema(z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),

  zip: z.preprocess((v) => Number(v), z.number().lte(1000).gte(100)),
}));

const { getErrors, values, handleSubmit } = useForm({
  schema: defineSchema(
    z.object({
      fullName: z.string().min(1),
    }),
  ),
});

const onSubmit = handleSubmit(values => {
  console.log(values);
});
</script>
