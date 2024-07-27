<template>
  <div class="flex gap-4 relative">
    <form class="w-full">
      <!-- <div class="flex flex-col gap-4">
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

        <InputNumber
          name="amount"
          :label="`amount`"
          :max="max"
          :format-options="{ style: 'currency', currency: 'EGP' }"
          :min="0"
          :step="1"
          required
          placeholder="nani"
        />

        <button type="button" @click="max += 5">Max ({{ max }})</button>

        <SwitchInput>Toggle me</SwitchInput>
        <Switch label="Toggle me" />

        <SwitchInput :true-value="false" :false-value="true">Toggle me</SwitchInput>
        <Switch label="Toggle me" :true-value="false" :false-value="true" />

        <RadioGroup name="radio" label="Radio  (inputs)" orientation="vertical">
          <InputRadioItem label="Radio 1" value="1" />
          <InputRadioItem label="Radio 2" value="2" />
          <InputRadioItem label="Radio 3" value="3" />
        </RadioGroup>

        <RadioGroup name="radio2" label="Radio Horizontal (inputs)" required>
          <InputRadioItem label="Radio 1" value="1" />
          <InputRadioItem label="Radio 2" value="2" />
          <InputRadioItem label="Radio 3" value="3" />
        </RadioGroup>

        <RadioGroup name="radio2rtl" label="Radio Horizontal (inputs, RTL)" dir="rtl">
          <InputRadioItem label="Radio 1" value="1" />
          <InputRadioItem label="Radio 2" value="2" />
          <InputRadioItem label="Radio 3" disabled value="3" />
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
          <RadioItem label="Radio 3" disabled value="3" />
        </RadioGroup>

        <Slider name="opacity" label="Opacity" :min="0" :max="100" />

        <Slider name="opacity" dir="rtl" label="Opacity RTL" :min="0" :max="100" />

        <MultiSlider name="opacity2" label="Opacity Multiple" :min="0" :max="100" />

        <MultiSlider name="opacity2" dir="rtl" label="Opacity Multiple RTL" :min="0" :max="100" />

        <Slider name="opacity" label="Opacity" :min="0" :max="100" :step="2" orientation="vertical" />

        <MultiSlider name="opacity2" label="Opacity" :min="0" :max="100" orientation="vertical" />

        <CheckboxGroup name="checkboxGroup" label="Checkbox Group">
          <CheckboxItem label="Checkbox 1" true-value="1" />
          <CheckboxItem label="Checkbox 2" true-value="2" />
          <CheckboxItem label="Checkbox 3" disabled true-value="3" />
        </CheckboxGroup>

        <CheckboxItem
          label="Standalone Box"
          name="dat-box"
          :true-value="{ wowzers: 1 }"
          :false-value="{ 'damn-boi': 7 }"
        />

        <CheckboxGroup name="checkboxGroup" label="Checkbox Group (Inputs)">
          <CheckboxInput label="Checkbox 1" true-value="1" />
          <CheckboxInput label="Checkbox 2" true-value="2" />
          <CheckboxInput label="Checkbox 3" disabled true-value="3" />
        </CheckboxGroup>

        <CheckboxInput label="Standalone Input Box" :true-value="'lil'" indeterminate />

        <button class="mt-9 bg-blue-500 text-white px-4 py-1.5 rounded-md">KeKL</button>
      </div> -->

      <div v-for="(field, idx) in fields" :key="field.id" class="flex items-center">
        <InputText v-if="field.type === 'text'" :name="`field[${idx}]`" :label="`Field ${idx}`" />

        <button type="button" class="bg-red-500 rounded text-white p-2" @click="fields.splice(idx, 1)">X</button>
      </div>

      <button class="bg-zinc-700 text-white rounded p-1" type="button" @click="add">+ Add Field</button>
      <button class="bg-zinc-700 text-white rounded p-1" type="button" @click="swap">Swap</button>

      <!-- <InputSearch name="search" label="Search" :min-length="10" @submit="onSearchSubmit" /> -->
    </form>

    <div class="w-1/3 relative">
      <pre class="max-h-[95vh] overflow-y-auto bg-gray-200 rounded-lg p-4 sticky top-4">{{ values }}</pre>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue';
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
import { useForm } from '@formwerk/core';

const { values, context } = useForm({
  // initialValues: getInitials,
});

const fields = ref([{ type: 'text', id: crypto.randomUUID() }]);

function add() {
  fields.value.push({ type: 'text', id: crypto.randomUUID() });
}

function swap() {
  const [f1, f2] = fields.value;
  fields.value = [f2, f1];
}

async function getInitials() {
  await sleep(2000);

  return {
    email: 'email@gmail.com',
    amount: 20,
    area: 'Hello',
    switch: true,
    interestingSwitch: true,
    search: 'search',
    radio: '1',
    radio2: '2',
    radio2rtl: '2',
    radio3: '3',
    radio4: '2',
    radio5: '2',
    opacity: 50,
    opacity2: [20, 80],
    checkboxGroup: ['1'],
  };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// const form = reactive({
//   email: '',
//   amount: 0,
//   area: '',
//   switch: false,
//   interestingSwitch: false,
//   search: '',
//   radio: '',
//   radio2: '',
//   radio2rtl: '',
//   radio3: '',
//   radio4: '',
//   radio5: '',
//   opacity: 0,
//   opacity2: [0, 100],
//   opacity3: 0,
//   opacity4: [0, 100],
//   checkboxGroup1: undefined,
//   checkboxSolo1: undefined,
//   checkboxGroup2: undefined,
//   checkboxSolo2: undefined,
// });

const max = ref(10);

function onSearchSubmit(value: string) {
  console.log(value);
}
</script>
