<template>
  <div class="flex gap-4 relative">
    <InputText name="foo" label="Foo" />
  </div>
</template>

<script lang="ts" setup>
import InputText from './components/InputText.vue';
import { useForm } from '@formwerk/core';

const { values } = useForm({
  initialValues: {
    foo: 'bar',
  },
});
</script>
