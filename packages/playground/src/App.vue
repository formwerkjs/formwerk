<script setup lang="ts">
import { useForm } from '@formwerk/core';
import TimeField from '@/components/TimeField.vue';
const form = useForm();

function onCompleted(value: string) {
  alert(`onCompleted: ${value}`);
}
</script>

<template>
  <TimeField name="time" label="Appointment time" min="09:00" max="17:00" required />
</template>
