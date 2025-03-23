<script setup lang="ts">
import { useFileField, FileFieldProps } from '@formwerk/core';

const props = defineProps<FileFieldProps>();

const { inputProps, triggerProps, entries, errorMessageProps, errorMessage, showPicker } = useFileField(props);
</script>

<template>
  <div class="flex flex-col gap-2">
    <input v-bind="inputProps" />

    <button v-bind="triggerProps">Show picker</button>

    <p v-if="entries.length === 0" class="text-sm text-zinc-300">No file selected</p>

    <div v-else>
      <ul>
        <li v-for="entry in entries" :key="entry.id">{{ entry.file.name }}</li>
      </ul>
    </div>

    <div v-if="errorMessage" v-bind="errorMessageProps" class="text-red-500 text-sm">
      {{ errorMessage }}
    </div>
  </div>
</template>
