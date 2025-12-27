import { HiddenField } from '.';
import { useForm } from '../useForm';
import { describe, expect, test, vi } from 'vitest';
import { ref } from 'vue';
import { page } from 'vitest/browser';
import { appRender } from '@test-utils/index';

describe('HiddenField component', () => {
  test('should not render anything', async () => {
    appRender({
      components: { HiddenField },
      setup() {
        const { formProps } = useForm();

        return { formProps };
      },
      template: `
        <HiddenField name="hidden-field" value="test-value" />
      `,
    });
  });

  test('should set the value on the form', async () => {
    let getValues!: () => ReturnType<typeof useForm>['values'];
    appRender({
      components: { HiddenField },
      setup() {
        const { formProps, values } = useForm();
        getValues = () => values;

        return { formProps };
      },
      template: `
        <HiddenField name="hidden-field" value="test-value" />
      `,
    });

    await expect.poll(() => getValues()).toEqual({ 'hidden-field': 'test-value' });
  });

  test('should update the value on the form when it changes', async () => {
    const val = ref('test-value');
    let getValues!: () => ReturnType<typeof useForm>['values'];
    appRender({
      components: { HiddenField },
      setup() {
        const { formProps, values } = useForm();
        getValues = () => values;

        return { formProps, val };
      },
      template: `
        <HiddenField name="hidden-field" :value="val" />
      `,
    });

    await expect.poll(() => getValues()).toEqual({ 'hidden-field': 'test-value' });

    val.value = 'updated-value';
    await expect.poll(() => getValues()).toEqual({ 'hidden-field': 'updated-value' });
  });

  test('should not submit value when disabled', async () => {
    const onSubmit = vi.fn();

    appRender({
      components: { HiddenField },
      setup() {
        const { formProps, handleSubmit } = useForm();
        return { formProps, onSubmit: handleSubmit(onSubmit) };
      },
      template: `
        <form v-bind="formProps" data-testid="form">
          <HiddenField name="hidden-field" value="test-value" disabled />
          <button type="button" @click="onSubmit">Submit</button>
        </form>
      `,
    });

    await expect.poll(() => onSubmit).toHaveBeenCalledTimes(0);
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect.poll(() => onSubmit).toHaveBeenCalledTimes(1);
    const submitted = (onSubmit.mock.calls[0][0] as any).toObject();
    await expect.poll(() => submitted).not.toHaveProperty('hidden-field');
  });
});
