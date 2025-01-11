<script setup lang="ts">
import { useForm } from '@formwerk/core';
import ComboBox from './components/ComboBox.vue';
import Select from './components/InputSelect.vue';

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
    <Select
      name="select"
      label="Select"
      multiple
      :options="[
        { label: 'Option 1', value: 'Option 1' },
        { label: 'Option 2', value: 'Option 2' },
        { label: 'Option 3', value: 'Option 3' },
      ]"
    />
    <ComboBox name="combo" label="Combo" :options="['Option 1', 'Option 2', 'Option 3']" />

    <button class="bg-blue-500 text-white p-2 rounded-md" @click="onSubmit">Submit</button>
  </div>
</template>
