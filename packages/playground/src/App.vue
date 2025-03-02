<script setup lang="ts">
import DateField from '@/components/DateField.vue';
import InputText from '@/components/InputText.vue';
import InputNumber from '@/components/InputNumber.vue';
import InputSelect from '@/components/InputSelect.vue';
import CheckboxGroup from '@/components/CheckboxGroup.vue';
import CheckboxItem from '@/components/CheckboxItem.vue';
import RadioGroup from '@/components/RadioGroup.vue';
import RadioItem from '@/components/RadioItem.vue';
import Switch from '@/components/Switch.vue';
import InputTextArea from '@/components/InputTextArea.vue';
import { ref } from 'vue';
import AllForm from './components/AllForm.vue';
import Slider from './components/Slider.vue';

const min = new Date(2025, 0, 4, 0, 0, 0, 0);
const value = new Date('2025-01-15');
const max = new Date('2025-01-20');

const options = [
  { label: 'Option 1', value: '1' },
  { label: 'Option 2', value: '2' },
  { label: 'Option 3', value: '3' },
];

const isNotificationsEnabled = ref(false);
</script>

<template>
  <div class="">
    <InputSelect name="country" label="Country" required :options="options" />

    <!-- <h2 class="text-2xl font-bold mb-6">Fields Outside Form</h2>
    <InputText name="username" label="Username" placeholder="Enter username" />
    <InputNumber name="age" label="Age" :min="0" :max="120" />
    <InputTextArea name="description" label="Description" placeholder="Enter description" />
    <DateField name="birthdate" label="Birth Date" :value="value" :min="min" :max="max" />

    <CheckboxGroup name="hobbies" label="Hobbies">
      <CheckboxItem name="hobbies" value="reading" label="Reading" />
      <CheckboxItem name="hobbies" value="gaming" label="Gaming" />
      <CheckboxItem name="hobbies" value="coding" label="Coding" />
    </CheckboxGroup>

    <RadioGroup name="gender" label="Gender">
      <RadioItem name="gender" value="male" label="Male" />
      <RadioItem name="gender" value="female" label="Female" />
      <RadioItem name="gender" value="other" label="Other" />
    </RadioGroup>

    <Switch name="notifications" label="Enable notifications" v-model="isNotificationsEnabled" />

    <InputText
      v-if="isNotificationsEnabled"
      name="notificationName"
      label="Notification name"
      placeholder="Enter notification name"
    /> -->

    <!-- <AllForm /> -->
  </div>
</template>
