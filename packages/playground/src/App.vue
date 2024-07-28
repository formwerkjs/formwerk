<template>
  <div class="flex gap-4 relative">
    <form class="w-full" @submit="onSubmit">
      <InputText name="firstName" label="First Name" />
      <InputText name="lastName" label="Last Name" />
      <InputText name="email" type="email" label="Email" />

      <button>Submit</button>
    </form>
    <button @click="reset">Reset</button>

    <div class="w-1/3 relative">
      <pre class="max-h-[95vh] overflow-y-auto bg-gray-200 rounded-lg p-4 sticky top-4">{{ values }}</pre>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import InputText from './components/InputText.vue';
import { useForm } from '@formwerk/core';

const { values, handleSubmit, reset } = useForm({
  initialValues: { firstName: 'Abdelrahman', lastName: 'Awad', email: 'awad@awad.dev' },
});

const onSubmit = handleSubmit(vals => {
  console.log('submit', vals);
});
</script>
