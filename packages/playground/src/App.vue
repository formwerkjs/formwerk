<template>
  <form class="flex flex-col gap-4">
    <InputText
      name="email"
      label="Email"
      :max-length="10"
      :min-length="3"
      required
      placeholder="Sinners"
      pattern="[0-9]+"
    />

    <InputTextArea
      name="email"
      label="Email"
      :max-length="10"
      :min-length="3"
      required
      placeholder="Sinners"
      pattern="[0-9]+"
    />

    <SwitchInput>Toggle me</SwitchInput>

    <Switch label="Toggle me" />

    <RadioGroup name="radio" label="Radio Vertical (inputs)">
      <InputRadioItem label="Radio 1" value="1" />
      <InputRadioItem label="Radio 2" value="2" />
      <InputRadioItem label="Radio 3" value="3" />
    </RadioGroup>

    <RadioGroup name="radio2" label="Radio Horizontal (inputs)" orientation="horizontal" required>
      <InputRadioItem label="Radio 1" value="1" />
      <InputRadioItem label="Radio 2" value="2" />
      <InputRadioItem label="Radio 3" value="3" />
    </RadioGroup>

    <RadioGroup name="radio2rtl" label="Radio Horizontal (inputs, RTL)" orientation="horizontal" dir="rtl">
      <InputRadioItem label="Radio 1" value="1" />
      <InputRadioItem label="Radio 2" value="2" />
      <InputRadioItem label="Radio 3" value="3" />
    </RadioGroup>

    <RadioGroup name="radio3" label="Radio Items (non-inputs, vertical)" orientation="vertical">
      <RadioItem label="Radio 1" value="1" />
      <RadioItem label="Radio 2" value="2" />
      <RadioItem label="Radio 3" value="3" />
    </RadioGroup>

    <RadioGroup name="radio4" label="Radio Items (non-inputs, horizontal)" orientation="horizontal">
      <RadioItem label="Drink 1" value="1" />
      <RadioItem label="Drink 2" value="2" />
      <RadioItem label="Drink 3" value="3" />
    </RadioGroup>

    <RadioGroup name="radio5" label="Radio Items (non-inputs, horizontal, RTL)" orientation="horizontal" dir="rtl">
      <RadioItem label="Radio 1" value="1" />

      <RadioItem label="Radio 2" value="2" />

      <RadioItem label="Radio 3" value="3" />
    </RadioGroup>

    <pre>{{ model }}</pre>

    <Slider label="Opacity" :min="0" :max="100" :step="2" />

    <MultiSlider label="Opacity" :min="0" :max="100" />

    <button class="bg-blue-500 text-white px-4 py-1.5 rounded-md">KeKL</button>
  </form>

  <InputSearch name="search" label="Search" :min-length="10" @submit="onSearchSubmit" />
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import InputText from './components/InputText.vue';
import InputTextArea from './components/InputTextArea.vue';
import InputSearch from './components/InputSearch.vue';
import SwitchInput from './components/SwitchInput.vue';
import Switch from './components/Switch.vue';
import RadioGroup from './components/RadioGroup.vue';
import InputRadioItem from './components/InputRadioItem.vue';
import RadioItem from './components/RadioItem.vue';
import Slider from './components/Slider.vue';
import MultiSlider from './components/MultiSlider.vue';

const model = ref('');

function onSearchSubmit(value: string) {
  console.log(value);
}
</script>
