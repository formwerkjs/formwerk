<script setup lang="ts">
import { FormSchema, useForm } from '@formwerk/core';
import InputText from './components/InputText.vue';
import Switch from './components/Switch.vue';
import MultiSlider from './components/MultiSlider.vue';
import Radio from './components/RadioItem.vue';
import RadioGroup from './components/RadioGroup.vue';
import CheckboxGroup from './components/CheckboxGroup.vue';
import CheckboxItem from './components/CheckboxItem.vue';
import InputSearch from './components/InputSearch.vue';
import InputNumber from './components/InputNumber.vue';
import InputSelect from './components/InputSelect.vue';
import OptionGroup from './components/OptionGroup.vue';
import OptionItem from './components/OptionItem.vue';
import FormGroup from './components/FormGroup.vue';
import { ref } from 'vue';

const { handleSubmit } = useForm({
  scrollToInvalidFieldOnSubmit: {
    behavior: 'instant',
    block: 'center',
    inline: 'start',
  },
});

const onSubmit = handleSubmit(data => {
  console.log(data);
});
</script>

<template>
  <div class="flex flex-col gap-[1000px]">
    <InputText name="text" label="Text" required />

    <InputSearch name="search" label="Search" required />

    <button class="bg-blue-500 text-white p-2 rounded-md" @click="onSubmit">Submit</button>
  </div>
</template>
