<template>
  <form class="flex gap-4">
    <div class="w-1/2 flex flex-col gap-4">
      <InputText
        v-model="form.email"
        name="email"
        label="Email"
        :max-length="10"
        :min-length="3"
        required
        placeholder="Sinners"
        pattern="[0-9]+"
      />

      <InputTextArea
        v-model="form.area"
        name="email"
        label="Email"
        :max-length="10"
        :min-length="3"
        required
        placeholder="Sinners"
        pattern="[0-9]+"
      />

      <InputNumber v-model="form.amount" name="number" label="amount" :max="10" :min="3" required placeholder="nani" />

      <SwitchInput v-model="form.switch">Toggle me</SwitchInput>
      <Switch label="Toggle me" v-model="form.switch" />

      <SwitchInput v-model="form.interestingSwitch" :true-value="false" :false-value="true">Toggle me</SwitchInput>
      <Switch label="Toggle me" v-model="form.interestingSwitch" :true-value="false" :false-value="true" />

      <RadioGroup v-model="form.radio" name="radio" label="Radio Vertical (inputs)">
        <InputRadioItem label="Radio 1" value="1" />
        <InputRadioItem label="Radio 2" value="2" />
        <InputRadioItem label="Radio 3" value="3" />
      </RadioGroup>

      <RadioGroup
        v-model="form.radio2"
        name="radio2"
        label="Radio Horizontal (inputs)"
        orientation="horizontal"
        required
      >
        <InputRadioItem label="Radio 1" value="1" />
        <InputRadioItem label="Radio 2" value="2" />
        <InputRadioItem label="Radio 3" value="3" />
      </RadioGroup>

      <RadioGroup
        v-model="form.radio2rtl"
        name="radio2rtl"
        label="Radio Horizontal (inputs, RTL)"
        orientation="horizontal"
        dir="rtl"
      >
        <InputRadioItem label="Radio 1" value="1" />
        <InputRadioItem label="Radio 2" value="2" />
        <InputRadioItem label="Radio 3" disabled value="3" />
      </RadioGroup>

      <RadioGroup v-model="form.radio3" name="radio3" label="Radio Items (non-inputs, vertical)" orientation="vertical">
        <RadioItem label="Radio 1" value="1" />
        <RadioItem label="Radio 2" value="2" />
        <RadioItem label="Radio 3" value="3" />
      </RadioGroup>

      <RadioGroup
        v-model="form.radio4"
        name="radio4"
        label="Radio Items (non-inputs, horizontal)"
        orientation="horizontal"
      >
        <RadioItem label="Drink 1" value="1" />
        <RadioItem label="Drink 2" value="2" />
        <RadioItem label="Drink 3" value="3" />
      </RadioGroup>

      <RadioGroup
        v-model="form.radio5"
        name="radio5"
        label="Radio Items (non-inputs, horizontal, RTL)"
        orientation="horizontal"
        dir="rtl"
      >
        <RadioItem label="Radio 1" value="1" />
        <RadioItem label="Radio 2" value="2" />
        <RadioItem label="Radio 3" disabled value="3" />
      </RadioGroup>

      <Slider v-model="form.opacity" label="Opacity" :min="0" :max="100" />

      <Slider v-model="form.opacity" dir="rtl" label="Opacity RTL" :min="0" :max="100" />

      <MultiSlider v-model="form.opacity2" label="Opacity Multiple" :min="0" :max="100" />

      <MultiSlider v-model="form.opacity2" dir="rtl" label="Opacity Multiple RTL" :min="0" :max="100" />

      <Slider v-model="form.opacity3" label="Opacity" :min="0" :max="100" :step="2" orientation="vertical" />

      <MultiSlider v-model="form.opacity4" label="Opacity" :min="0" :max="100" orientation="vertical" />

      <CheckboxGroup v-model="form.checkboxGroup1" name="checkbox" label="Checkbox Group">
        <CheckboxItem label="Checkbox 1" true-value="1" />
        <CheckboxItem label="Checkbox 2" true-value="2" />
        <CheckboxItem label="Checkbox 3" disabled true-value="3" />
      </CheckboxGroup>

      <CheckboxItem label="Standalone Box" indeterminate v-model="form.checkboxSolo1" />

      <CheckboxGroup v-model="form.checkboxGroup2" name="checkbox" label="Checkbox Group (Inputs)">
        <CheckboxInput label="Checkbox 1" true-value="1" />
        <CheckboxInput label="Checkbox 2" true-value="2" />
        <CheckboxInput label="Checkbox 3" disabled true-value="3" />
      </CheckboxGroup>

      <CheckboxInput label="Standalone Input Box" :true-value="'lil'" indeterminate v-model="form.checkboxSolo2" />

      <button class="mt-9 bg-blue-500 text-white px-4 py-1.5 rounded-md">KeKL</button>
    </div>

    <div class="w-1/2 bg-gray-200 rounded-lg p-4">
      <pre>{{ form }}</pre>
    </div>
  </form>

  <InputSearch name="search" label="Search" :min-length="10" @submit="onSearchSubmit" />
</template>

<script lang="ts" setup>
import { reactive } from 'vue';
import InputText from './components/InputText.vue';
import InputNumber from './components/InputNumber.vue';
import InputTextArea from './components/InputTextArea.vue';
import InputSearch from './components/InputSearch.vue';
import SwitchInput from './components/SwitchInput.vue';
import Switch from './components/Switch.vue';
import RadioGroup from './components/RadioGroup.vue';
import InputRadioItem from './components/InputRadioItem.vue';
import RadioItem from './components/RadioItem.vue';
import Slider from './components/Slider.vue';
import MultiSlider from './components/MultiSlider.vue';
import CheckboxGroup from './components/CheckboxGroup.vue';
import CheckboxItem from './components/CheckboxItem.vue';
import CheckboxInput from './components/CheckboxInput.vue';

const form = reactive({
  email: '',
  amount: '',
  area: '',
  switch: false,
  interestingSwitch: false,
  search: '',
  radio: '',
  radio2: '',
  radio2rtl: '',
  radio3: '',
  radio4: '',
  radio5: '',
  opacity: 0,
  opacity2: [0, 100],
  opacity3: 0,
  opacity4: [0, 100],
  checkboxGroup1: undefined,
  checkboxSolo1: undefined,
  checkboxGroup2: undefined,
  checkboxSolo2: undefined,
});

function onSearchSubmit(value: string) {
  console.log(value);
}
</script>
