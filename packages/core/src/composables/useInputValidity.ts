import { Ref, nextTick, ref } from 'vue';

export function useInputValidity(inputRef?: Ref<HTMLInputElement | undefined>) {
  const errorMessage = ref<string>();

  function onInvalid() {
    updateValidity();
  }

  function setValidity(message: string) {
    errorMessage.value = message;
    inputRef?.value?.setCustomValidity(message);
  }

  function updateValidity() {
    nextTick(() => {
      errorMessage.value = inputRef?.value?.validationMessage;
    });
  }

  return {
    errorMessage,
    onInvalid,
    setValidity,
    updateValidity,
  };
}
