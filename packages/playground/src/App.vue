<script setup lang="ts">
import { FormSchema, useForm } from '@formwerk/core';
import InputText from './components/InputText.vue';
import Switch from './components/Switch.vue';
import Slider from './components/Slider.vue';
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

const { handleSubmit, values } = useForm<
  FormSchema<{
    name: string;
    email: string;
    subscribe: boolean;
    plan: string;
    preferences: string[];
  }>
>();

const value = ref('One');
const onSubmit = handleSubmit(data => {
  console.log(data.toObject());
  value.value = 'Two';
});

type Step = 'One' | 'Two' | 'Three';

const stops: Step[] = ['One', 'Two', 'Three'];
</script>

<template>
  <form class="flex flex-col gap-4 w-full" novalidate @submit="onSubmit">
    <h2 class="text-2xl font-bold text-white">Registration Form</h2>

    <Slider v-model="value" :stops="stops" />

    {{ value }}

    <button>Submit</button>
  </form>
</template>
