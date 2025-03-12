<script setup lang="ts">
import { useFileField, FileFieldProps, FileEntry } from '@formwerk/core';

const props = defineProps<FileFieldProps>();

const {
  inputProps,
  triggerProps,
  entries,
  clear,
  removeEntry,
  labelProps,
  descriptionProps,
  errorMessageProps,
  errorMessage,
} = useFileField(props);
</script>

<template>
  <div
    v-bind="triggerProps"
    class="flex flex-col gap-2 border-2 border-dashed border-zinc-600 rounded-md p-4 w-full max-w-lg hover:bg-zinc-900 transition-colors cursor-pointer hover:border-zinc-300 items-center"
  >
    <label v-bind="labelProps" for="file-input" class="text-lg font-medium text-zinc-300">Upload a file</label>
    <input v-bind="inputProps" type="file" id="file-input" class="sr-only" />

    <p v-if="entries.length === 0" v-bind="descriptionProps" class="text-sm text-zinc-300">No file selected</p>

    <div v-else>
      <ul class="flex flex-wrap gap-2">
        <FileEntry
          as="li"
          v-for="entry in entries"
          v-bind="entry"
          class="size-24 border border-zinc-700 rounded-md relative"
          remove-button-label="Remove"
          v-slot="{ removeButtonProps }"
        >
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

          {{ entry.file.name }}
        </FileEntry>
      </ul>
    </div>
  </div>
</template>
