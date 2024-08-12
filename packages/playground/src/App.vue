<template>
  <div class="flex flex-col">
    <FormGroup label="Shipping Information">
      <InputText label="deep" name="some.deep.path" />
      <InputText label="arr" name="some.array.0.path" />
    </FormGroup>
  </div>
</template>

<script lang="ts" setup>
import InputText from '@/components/InputText.vue';
import FormGroup from '@/components/FormGroup.vue';
import { useForm, useFormGroup } from '@formwerk/core';
import { defineSchema } from '@formwerk/schema-zod';
import { z } from 'zod';

const form = useForm({
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
