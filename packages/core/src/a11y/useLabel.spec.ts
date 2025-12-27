import { useLabel } from './useLabel';
import { defineComponent, shallowRef } from 'vue';
import { page } from 'vitest/browser';
import { appRender } from '@test-utils/index';

describe('label element', () => {
  test('should render label with `for` attribute', async () => {
    const label = 'label';
    const labelFor = 'input';

    appRender({
      setup: () => {
        const inputRef = shallowRef<HTMLElement>();

        return {
          inputRef,
          ...useLabel({
            for: labelFor,
            label: label,
            targetRef: inputRef,
          }),
        };
      },
      template: `
      <label data-testid="label" v-bind="labelProps">Label</label>
      <input data-testid="input" ref="inputRef" />
    `,
    });

    await expect.element(page.getByTestId('label')).toHaveAttribute('for', labelFor);
  });

  test('should omit `for` attribute if label is not a label element', async () => {
    const label = 'label';
    const labelFor = 'input';

    appRender({
      setup: () =>
        useLabel({
          for: labelFor,
          label: label,
        }),
      template: `
      <span data-testid="label" v-bind="labelProps">Label</span>
    `,
    });

    await expect.element(page.getByTestId('label')).not.toHaveAttribute('for');
  });
});

describe('label target (labelledBy)', () => {
  test('should have aria-label if there is no target element or label element', async () => {
    const label = 'label';
    const labelFor = 'input';
    appRender({
      setup: () =>
        useLabel({
          label: label,
          for: labelFor,
        }),
      template: `
      <span data-testid="target" v-bind="labelledByProps"></span>
    `,
    });

    await expect.element(page.getByTestId('target')).not.toHaveAttribute('aria-labelledby');
    await expect.element(page.getByTestId('target')).toHaveAttribute('aria-label', label);
  });

  test('should have aria-labelledby if there is both a target element and a label element', async () => {
    const label = 'label';
    const labelFor = 'input';
    const targetRef = shallowRef<HTMLElement>();

    appRender({
      setup: () => {
        return {
          ...useLabel({
            label: label,
            for: labelFor,
            targetRef: targetRef,
          }),
          targetRef,
        };
      },
      template: `
      <span data-testid="label" v-bind="labelProps"></span>
      <input data-testid="input" ref="targetRef" v-bind="labelledByProps">
    `,
    });

    await expect.element(page.getByTestId('input')).toHaveAttribute('aria-labelledby', `${labelFor}-l`);
  });
});

describe('label component', () => {
  test('should render label component with `for` attribute', async () => {
    const label = 'label';
    const labelFor = 'input';
    const inputRef = shallowRef<HTMLElement>();

    const LabelComp = defineComponent({
      props: ['for'],
      template: `
        <label data-testid="label" :for="$props.for">
          <slot />
        </label>
      `,
    });

    appRender({
      components: { LabelComp },
      setup: () => {
        return {
          ...useLabel({ label: label, for: labelFor, targetRef: inputRef }),
          label,
          inputRef,
        };
      },
      template: `
        <LabelComp v-bind="labelProps">{{ label }}</LabelComp>
        <input data-testid="input" ref="inputRef" />
      `,
    });

    await expect.element(page.getByTestId('label')).toHaveTextContent(label);
    await expect.element(page.getByTestId('label')).toHaveAttribute('for', labelFor);
  });
});
