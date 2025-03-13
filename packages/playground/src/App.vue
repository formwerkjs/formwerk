<script setup lang="ts">
import FileInput from './components/FileInput.vue';
import Dropzone from './components/Dropzone.vue';
</script>

<template>
  <div class="w-full">
    <FileInput label="Upload a file" name="file1" required />

    <Dropzone label="Drop file" name="file2" required multiple class="mt-8" />
  </div>
</template>
