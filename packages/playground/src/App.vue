<template>
  <div class="flex gap-4 relative">
    <form class="w-full">
      <div v-for="(field, idx) in fields" :key="field.id" class="flex items-center">
        <InputText :name="`field[${idx}]`" :label="`Field ${idx}`" />

        <button type="button" class="bg-red-500 rounded text-white p-2" @click="fields.splice(idx, 1)">X</button>
      </div>

      <button class="bg-zinc-700 text-white rounded p-1" type="button" @click="add">+ Add Field</button>
      <button class="bg-zinc-700 text-white rounded p-1" type="button" @click="swap">Swap</button>
      <button class="bg-zinc-700 text-white rounded p-1" type="button" @click="reverse">Reverse</button>

      <!-- <InputSearch name="search" label="Search" :min-length="10" @submit="onSearchSubmit" /> -->
    </form>

    <div class="w-1/3 relative">
      <pre class="max-h-[95vh] overflow-y-auto bg-gray-200 rounded-lg p-4 sticky top-4">{{ values }}</pre>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import InputText from './components/InputText.vue';
import { useForm } from '@formwerk/core';

const { values } = useForm({
  // initialValues: getInitials,
});

const fields = ref([{ type: 'text', id: Date.now() }]);

function add() {
  fields.value.unshift({ type: 'text', id: Date.now() });
}

function swap() {
  const [f1, f2, f3] = fields.value;
  fields.value = [f2, f1, f3];
}

function reverse() {
  fields.value = [...fields.value].reverse();
}
</script>
