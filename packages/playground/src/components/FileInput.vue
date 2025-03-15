<script setup lang="ts">
import { useFileField, FileFieldProps } from '@formwerk/core';

const props = defineProps<FileFieldProps>();

const { inputProps, triggerProps, entries, errorMessageProps, errorMessage, remove } = useFileField(props);
</script>

<template>
  <div class="flex flex-col gap-2">
    <input v-bind="inputProps" class="sr-only" />

    <button
      v-bind="triggerProps"
      class="bg-zinc-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-zinc-600 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-200 w-max"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="fill-current w-5 h-5 text-white" viewBox="0 0 256 256">
        <path
          d="M248,128a56.06,56.06,0,0,1-56,56H48a40,40,0,0,1,0-80H192a24,24,0,0,1,0,48H80a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H48a24,24,0,0,0,0,48H192a40,40,0,0,0,0-80H80a8,8,0,0,1,0-16H192A56.06,56.06,0,0,1,248,128Z"
        ></path>
      </svg>
      Choose a file
    </button>

    <button @click="remove">Clear</button>

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
