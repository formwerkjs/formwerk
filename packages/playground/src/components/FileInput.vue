<script setup lang="ts">
import { useFileField, FileFieldProps } from '@formwerk/core';

const props = defineProps<FileFieldProps>();

const { inputProps, triggerProps, entries, errorMessageProps, errorMessage, showPicker } = useFileField(props);

function pickImage() {
  showPicker({
    accept: 'image/*',
  });
}

function pickVideo() {
  showPicker({
    accept: 'video/*',
  });
}

function pickPdf() {
  showPicker({
    accept: 'application/pdf',
  });
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <input v-bind="inputProps" />

    <button
      v-bind="triggerProps"
      class="bg-zinc-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-zinc-600 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-200 w-max"
    >
      Show picker
    </button>

    <button
      class="bg-zinc-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-zinc-600 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-200 w-max"
      @click="pickImage"
    >
      Pick image
    </button>
    <button
      class="bg-zinc-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-zinc-600 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-200 w-max"
      @click="pickVideo"
    >
      Pick video
    </button>
    <button
      class="bg-zinc-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-zinc-600 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-200 w-max"
      @click="pickPdf"
    >
      Pick PDF
    </button>

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
