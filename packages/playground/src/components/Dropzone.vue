<script setup lang="ts">
import { useFileField, FileFieldProps, FileEntry } from '@formwerk/core';

const props = defineProps<FileFieldProps>();

const { inputProps, groupProps, triggerProps, entries, descriptionProps, errorMessageProps, errorMessage } =
  useFileField(props);
</script>

<template>
  <div
    v-bind="groupProps"
    class="flex flex-col gap-2 border-2 border-dashed border-zinc-600 rounded-md p-4 w-full max-w-lg hover:bg-zinc-900 transition-colors hover:border-zinc-300 items-center"
  >
    <input v-bind="inputProps" class="sr-only" />

    <div v-if="entries.length === 0" class="mt-3 flex flex-col items-center gap-1">
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

      <p v-if="entries.length === 0" v-bind="descriptionProps" class="text-sm text-zinc-300">No file selected</p>
    </div>

    <div v-else>
      <ul class="flex flex-wrap gap-2">
        <FileEntry
          as="li"
          v-for="entry in entries"
          v-bind="entry"
          class="size-24 border border-zinc-700 rounded-md relative"
          remove-button-label="Remove"
          v-slot="{ removeButtonProps, previewProps, hasPreview }"
        >
          <component :is="previewProps.as" v-bind="previewProps" class="size-full object-cover" />

          <button
            v-bind="removeButtonProps"
            class="bg-blue-500 rounded-full absolute -top-2 -right-2 p-1 hover:bg-blue-600 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="size-4 fill-white" viewBox="0 0 256 256">
              <path
                d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z"
              ></path>
            </svg>
          </button>

          <span v-if="!hasPreview">{{ entry.file.name }}</span>
        </FileEntry>
      </ul>
    </div>

    <div v-if="errorMessage" v-bind="errorMessageProps" class="text-red-500 text-sm">
      {{ errorMessage }}
    </div>
  </div>
</template>
