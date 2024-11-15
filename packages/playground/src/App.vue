<script setup lang="ts">
import { FormSchema, useForm } from '@formwerk/core';
import InputText from './components/InputText.vue';
import Switch from './components/Switch.vue';
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

const { handleSubmit, values } = useForm<
  FormSchema<{
    name: string;
    email: string;
    subscribe: boolean;
    plan: string;
    preferences: string[];
  }>
>();

const onSubmit = handleSubmit(data => {
  console.log(data.toObject());
});
</script>

<template>
  <form class="flex flex-col gap-4 w-full" novalidate @submit="onSubmit">
    <h2 class="text-2xl font-bold text-white">Registration Form</h2>

    <FormGroup name="g" label="Personal Information">
      <InputText name="name" label="Full Name" required />
      <InputText name="email" label="Email Address" type="email" required />
    </FormGroup>

    <FormGroup name="contact" label="Contact Preferences">
      <Switch name="subscribe" label="Subscribe to newsletter" />

      <RadioGroup name="plan" label="Select your plan" required>
        <Radio value="basic" label="Basic Plan" />
        <Radio value="pro" label="Pro Plan" />
        <Radio value="enterprise" label="Enterprise Plan" />
      </RadioGroup>

      <CheckboxGroup name="preferences" label="Communication preferences">
        <CheckboxItem value="email" label="Email updates" />
        <CheckboxItem value="sms" label="SMS notifications" />
        <CheckboxItem value="phone" label="Phone calls" />
      </CheckboxGroup>
    </FormGroup>

    <FormGroup name="additional" label="Additional Information ">
      <InputSearch name="search" label="Search for features" />
      <InputNumber name="age" label="Your age" min="18" max="120" />

      <InputSelect name="country" label="Select your country" disabled>
        <OptionGroup label="North America">
          <OptionItem value="us" label="United States" />
          <OptionItem value="ca" label="Canada" />
          <OptionItem value="mx" label="Mexico" />
        </OptionGroup>
        <OptionGroup label="Europe">
          <OptionItem value="uk" label="United Kingdom" />
          <OptionItem value="fr" label="France" />
          <OptionItem value="de" label="Germany" />
        </OptionGroup>
      </InputSelect>
    </FormGroup>
    <button class="mt-5 w-max" type="submit">Submit</button>
  </form>
</template>
