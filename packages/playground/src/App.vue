<template>
  <div class="flex flex-col">
    <InputText label="Test" name="test" />

    <pre>{{ isValid }}</pre>
  </div>
</template>

<script lang="ts" setup>
import InputText from '@/components/InputText.vue';
import { useForm } from '@formwerk/core';
import { defineSchema } from '@formwerk/schema-yup';
import * as yup from 'yup';

const { values, isValid, handleSubmit } = useForm({
  schema: defineSchema(
    yup.object({
      test: yup.string().required(),
    }),
  ),
});

const onSubmit = handleSubmit(values => {
  console.log(values);
});
</script>
