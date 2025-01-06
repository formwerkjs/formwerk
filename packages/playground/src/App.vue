<script setup lang="ts">
import { useForm } from '@formwerk/core';
import { ref } from 'vue';
import CustomField from './components/CustomField.vue';

const { handleSubmit, values } = useForm({
  scrollToInvalidFieldOnSubmit: {
    behavior: 'instant',
    block: 'center',
    inline: 'start',
  },
});

const onSubmit = handleSubmit(data => {
  console.log(data.toObject());
});
</script>

<template>
  <div class="flex flex-col">
    <CustomField name="custom" label="Custom Field" />

    <pre>{{ values }}</pre>

    <button class="bg-blue-500 text-white p-2 rounded-md" @click="onSubmit">Submit</button>
  </div>
</template>
