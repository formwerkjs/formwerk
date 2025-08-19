import { Ref } from 'vue';

export function useErrorDisplay(errorMessage: Ref<string | undefined>, isTouched: Ref<boolean>) {
  function displayError(msg?: string) {
    const error = msg || errorMessage.value;

    return isTouched.value ? error : '';
  }

  return { displayError };
}
