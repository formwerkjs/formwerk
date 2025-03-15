<script setup lang="ts">
import FileInput from './components/FileInput.vue';
import Dropzone from './components/Dropzone.vue';
import { ref } from 'vue';
import { FileUploadContext } from '@formwerk/core';

function handleUpload(context: FileUploadContext) {
  console.log(context);

  return new Promise<string>(resolve => {
    setTimeout(() => {
      resolve('https://example.com/file.png');
    }, 1000);
  });
}

const value = ref<string>();
</script>

<template>
  <div class="w-full">
    {{ value }}
    <FileInput label="Upload a file" name="file1" required @upload="handleUpload" v-model="value" />

    <Dropzone label="Upload a file" name="file2" multiple class="mt-8" />
  </div>
</template>
