<script setup lang="ts">
import { useForm } from '@formwerk/core';
import FileInput from './components/FileInput.vue';
import Dropzone from './components/Dropzone.vue';

const form = useForm();

function handleUpload(file: File) {
  console.log(file);
}
</script>

<template>
  <div class="w-full">
    <FileInput label="Upload a file" name="file1" required allow-directory />

    <Dropzone label="Drop file" name="file2" required multiple class="mt-8" allow-directory />
  </div>
</template>
