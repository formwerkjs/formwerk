<script setup lang="ts">
import { useForm } from '@formwerk/core';
import {
  TextField,
  SearchField,
  Checkbox,
  RadioGroup,
  Option,
  FormGroup,
  FormRepeater,
  Slider,
  NumberField,
  SelectField,
  Switch,
  CheckboxGroup,
  Radio,
} from '@starter/minimal/index';

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
  <div class="flex flex-col">
    <TextField name="text" label="Text" required />
    <SearchField name="search" label="Search" required />

    <Checkbox name="checkbox" label="Checkbox" required />

    <RadioGroup name="radio" label="Radio" required>
      <Radio name="radio" label="Radio" value="1" required />
      <Radio name="radio" label="Radio" value="2" required />
    </RadioGroup>

    <CheckboxGroup name="checkboxGroup" label="Checkbox Group" required>
      <Checkbox name="checkboxGroup" label="Checkbox" value="1" required />
      <Checkbox name="checkboxGroup" label="Checkbox" value="2" required />
    </CheckboxGroup>

    <SelectField name="select" label="Select" required>
      <Option name="select" label="Option" value="1" />
      <Option name="select" label="Option" value="2" />
    </SelectField>

    <Switch name="switch" label="Switch" required />

    <NumberField name="number" label="Number" required />

    <Slider name="slider" label="Slider" required />

    <FormGroup name="formGroup" label="Form Group" required>
      <TextField name="formGroup" label="Text" required />
    </FormGroup>

    <FormRepeater name="formRepeater" label="Form Repeater" required>
      <TextField name="formRepeater" label="Text" required />
    </FormRepeater>

    <button class="bg-blue-500 text-white p-2 rounded-md" @click="onSubmit">Submit</button>
  </div>
</template>
