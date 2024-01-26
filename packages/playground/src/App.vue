<template>
  <form>
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

    <pre>{{ model }}</pre>

    <button>KeKL</button>
  </form>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import InputText from './components/InputText.vue';
import InputTextArea from './components/InputTextArea.vue';

const model = ref('');
</script>
