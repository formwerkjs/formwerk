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

const value = ref(['One', 'Three']);

type Step = 'One' | 'Two' | 'Three';

const stops: Step[] = ['One', 'Two', 'Three'];
</script>

<template>
  <h2 class="text-2xl font-bold text-white">Registration Form</h2>

  <MultiSlider v-model="value" :options="stops" />

  {{ value }}
  <button>Submit</button>
</template>
