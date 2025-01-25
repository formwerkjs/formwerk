<script setup lang="ts">
import DateField from '@/components/DateField.vue';
</script>

<template>
  <div class="flex flex-col w-1/2 gap-4">
    <DateField
      name="date"
      label="Date"
      :format-options="{
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }"
    />
  </div>
</template>
