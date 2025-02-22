<script setup lang="ts">
import DateField from '@/components/DateField.vue';
import Calendar from '@/components/Calendar.vue';
import InputText from '@/components/InputText.vue';
import InputNumber from '@/components/InputNumber.vue';
import InputSelect from '@/components/InputSelect.vue';
import CheckboxGroup from '@/components/CheckboxGroup.vue';
import CheckboxItem from '@/components/CheckboxItem.vue';
import RadioGroup from '@/components/RadioGroup.vue';
import RadioItem from '@/components/RadioItem.vue';
import Switch from '@/components/Switch.vue';
import InputTextArea from '@/components/InputTextArea.vue';
import { createCalendar } from '@internationalized/date';

const calendar = createCalendar('islamic-umalqura');
const min = new Date(2025, 0, 4, 0, 0, 0, 0);
const value = new Date('2025-01-15');
const max = new Date('2025-01-20');

const options = [
  { label: 'Option 1', value: '1' },
  { label: 'Option 2', value: '2' },
  { label: 'Option 3', value: '3' },
];

const handleSubmit = (event: Event) => {
  event.preventDefault();
  const formData = new FormData(event.target as HTMLFormElement);
  console.log(Object.fromEntries(formData));
};
</script>

<template>
  <div class="">
    <h2 class="text-2xl font-bold mb-6">Fields Inside Form</h2>
    <form @submit="handleSubmit" class="space-y-6 mb-12">
      <InputText name="username" label="Username" placeholder="Enter username" />
      <InputNumber name="age" label="Age" :min="0" :max="120" />
      <InputTextArea name="description" label="Description" placeholder="Enter description" />
      <DateField name="birthdate" label="Birth Date" :value="value" :min="min" :max="max" />
      <InputSelect name="country" label="Country" :options="options" />

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

      <Switch name="notifications" label="Enable notifications" />

      <Calendar name="calendar" label="Calendar" />

      <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded">Submit</button>
    </form>
  </div>
</template>
