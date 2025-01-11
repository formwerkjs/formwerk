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
    <pre>
      {{ values }}
    </pre>

    <ComboBox
      name="combo"
      label="Combo"
      :options="[
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' },
        { label: 'Option 3', value: 'opt3' },
      ]"
    />

    <button class="bg-blue-500 text-white p-2 rounded-md" @click="onSubmit">Submit</button>
  </div>
</template>
