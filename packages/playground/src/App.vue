<script setup lang="ts">
import { useForm } from '@formwerk/core';
import ComboBox from './components/ComboBox.vue';
import Select from './components/InputSelect.vue';
import OptionItem from './components/OptionItem.vue';

const { handleSubmit, values } = useForm({
  scrollToInvalidFieldOnSubmit: {
    behavior: 'instant',
    block: 'center',
    inline: 'start',
  },
});

const options = [
  { label: 'United States', value: 'us' },
  { label: 'Canada', value: 'ca' },
  { label: 'Mexico', value: 'mx' },
  { label: 'Brazil', value: 'br' },
  { label: 'Argentina', value: 'ar' },
  { label: 'United Kingdom', value: 'uk' },
  { label: 'France', value: 'fr' },
  { label: 'Germany', value: 'de' },
  { label: 'Italy', value: 'it' },
  { label: 'Spain', value: 'es' },
  { label: 'Portugal', value: 'pt' },
  { label: 'Netherlands', value: 'nl' },
  { label: 'Belgium', value: 'be' },
  { label: 'Switzerland', value: 'ch' },
  { label: 'Austria', value: 'at' },
  { label: 'Sweden', value: 'se' },
  { label: 'Norway', value: 'no' },
  { label: 'Denmark', value: 'dk' },
  { label: 'Finland', value: 'fi' },
  { label: 'Russia', value: 'ru' },
  { label: 'China', value: 'cn' },
  { label: 'Japan', value: 'jp' },
  { label: 'South Korea', value: 'kr' },
  { label: 'India', value: 'in' },
  { label: 'Australia', value: 'au' },
  { label: 'New Zealand', value: 'nz' },
  { label: 'South Africa', value: 'za' },
  { label: 'Egypt', value: 'eg' },
  { label: 'Nigeria', value: 'ng' },
  { label: 'Kenya', value: 'ke' },
  { label: 'Saudi Arabia', value: 'sa' },
  { label: 'United Arab Emirates', value: 'ae' },
  { label: 'Turkey', value: 'tr' },
  { label: 'Greece', value: 'gr' },
  { label: 'Poland', value: 'pl' },
  { label: 'Ukraine', value: 'ua' },
  { label: 'Thailand', value: 'th' },
  { label: 'Vietnam', value: 'vn' },
  { label: 'Indonesia', value: 'id' },
  { label: 'Malaysia', value: 'my' },
];

const onNewValue = (value: string) => {
  return { label: value, value: { label: value, value: value } };
};

const onSubmit = handleSubmit(data => {
  console.log(data.toObject());
});
</script>

<template>
  <div class="flex flex-col">
    <ComboBox name="combo" label="Combo" :options="options" @new-value="onNewValue" />

    <ComboBox name="combo2" label="Combo">
      <OptionItem v-for="option in options" :key="option.label" :label="option.label" :value="option" />
    </ComboBox>

    <pre>
      {{ values }}
    </pre>

    <button class="bg-blue-500 text-white p-2 rounded-md" @click="onSubmit">Submit</button>
  </div>
</template>
