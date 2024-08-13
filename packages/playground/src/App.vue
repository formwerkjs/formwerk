<template>
  <div class="flex flex-col">
    <FormGroup v-slot="{ groupProps, labelProps }">
      <div v-bind="groupProps">
        <div v-bind="labelProps">Shipping Address</div>

        <InputText label="deep" name="deep.path" />
        <InputText label="arr" name="array.0.path" />
      </div>
    </FormGroup>

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

const { FormGroup } = useFormGroup({ name: 'some.deep', label: 'Shipping Information' });

const { getErrors, values } = useForm({
  schema: defineSchema(
    z.object({
      some: z.object({
        deep: z.object({
          path: z.string().min(1, 'REQUIRED'),
        }),
        array: z.array(
          z.object({
            path: z.string().min(1, 'REQUIRED'),
          }),
        ),
      }),
    }),
  ),
});
</script>
