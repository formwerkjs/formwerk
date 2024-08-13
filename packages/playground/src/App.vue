<template>
  <div class="flex flex-col">
    <!-- <FormGroup v-slot="{ groupProps, labelProps }">
      <div v-bind="groupProps">
        <div v-bind="labelProps">Shipping Address</div>

        <InputText label="deep" name="deep.path" />
        <InputText label="arr" name="array.0.path" />
      </div>
    </FormGroup> -->

    <InputText label="Email" name="email" type="email" :schema="defineSchema(z.string().email())" />
    <InputText label="Other" name="other" required />

    <button @click="onSubmit">Submit</button>

    <pre>{{ values }}</pre>
    <pre>{{ getErrors() }}</pre>
  </div>
</template>

<script lang="ts" setup>
import InputText from '@/components/InputText.vue';
// import FormGroup from '@/components/FormGroup.vue';
import { useForm, useFormGroup } from '@formwerk/core';
import { defineSchema } from '@formwerk/schema-zod';
import { z } from 'zod';

// const { FormGroup } = useFormGroup({ name: 'some.deep', label: 'Shipping Information' });

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
