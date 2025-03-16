<script setup lang="ts">
import { FileUploadContext, useForm } from '@formwerk/core';
import FileInput from './components/FileInput.vue';
import Dropzone from './components/Dropzone.vue';

const form = useForm();

function handleUpload({ file, signal }: FileUploadContext) {
  return new Promise<string>(resolve => {
    setTimeout(() => {
      resolve('https://example.com/file.png');
    }, 1000);
  });
}
</script>

<template>
  <div class="w-full">
    <FileInput label="Upload a file" name="file1" />

    <Dropzone label="Drop file" name="file2" required multiple class="mt-8" />
  </div>
</template>
