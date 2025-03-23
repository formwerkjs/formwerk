<script setup lang="ts">
import { FileUploadContext, useForm } from '@formwerk/core';
import TimeInput from './components/TimeField.vue';
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
  <div class="w-full h-full flex flex-col items-center justify-center`">
    <TimeInput label="Time" name="time" />
  </div>
</template>
