<script setup lang="ts">
import { useForm } from '@formwerk/core';
import DateField from '@/components/DateField.vue';
</script>

<template>
  <div class="flex flex-col w-1/2 gap-4">
    <DateField name="date" label="Date" />
  </div>
</template>
