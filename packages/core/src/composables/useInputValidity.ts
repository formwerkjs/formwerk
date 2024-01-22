import { Ref, computed, nextTick, ref, shallowRef } from 'vue';

export function useInputValidity(inputRef?: Ref<HTMLInputElement | undefined>) {
  const errorMessage = ref<string>();
  const validityDetails = shallowRef<ValidityState>();
  const isInvalid = computed(() => !!errorMessage.value);

  function onInvalid() {
    updateValidity();
  }

  function setValidity(message: string) {
    errorMessage.value = message;
    inputRef?.value?.setCustomValidity(message);
    validityDetails.value = inputRef?.value?.validity;
  }

  function updateValidity() {
    nextTick(() => {
      errorMessage.value = inputRef?.value?.validationMessage;
      validityDetails.value = inputRef?.value?.validity;
    });
  }

  return {
    errorMessage,
    validityDetails,
    isInvalid,
    onInvalid,
    setValidity,
    updateValidity,
  };
}
