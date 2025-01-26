<script setup lang="ts">
import DateField from '@/components/DateField.vue';
</script>

<template>
  <div class="flex flex-col w-1/2 gap-4">
    <DateField
      name="date"
      label="Date"
      locale="ar-EG"
      :format-options="{
        calendar: 'islamic-umalqura',
        day: '2-digit',
        month: 'long',
        weekday: 'long',
        year: 'numeric',
      }"
    />
  </div>
</template>
