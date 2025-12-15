import { render } from '@testing-library/vue';
import { useLabel } from './useLabel';
import { defineComponent, shallowRef } from 'vue';
import { page } from 'vitest/browser';

describe('label element', () => {
  test('should render label with `for` attribute', async () => {
    const label = 'label';
    const labelFor = 'input';

    render({
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

    expect(((await page.getByTestId('label').element()) as HTMLElement).getAttribute('for')).toBe(labelFor);
  });

  test('should omit `for` attribute if label is not a label element', async () => {
    const label = 'label';
    const labelFor = 'input';

    render({
      setup: () =>
        useLabel({
          for: labelFor,
          label: label,
        }),
      template: `
      <span data-testid="label" v-bind="labelProps">Label</span>
    `,
    });

    const labelEl = (await page.getByTestId('label').element()) as HTMLElement;
    expect(labelEl.hasAttribute('for')).toBe(false);
  });
});

describe('label target (labelledBy)', () => {
  test('should have aria-label if there is no target element or label element', async () => {
    const label = 'label';
    const labelFor = 'input';
    render({
      setup: () =>
        useLabel({
          label: label,
          for: labelFor,
        }),
      template: `
      <span data-testid="target" v-bind="labelledByProps"></span>
    `,
    });

    const labelEl = (await page.getByTestId('target').element()) as HTMLElement;
    expect(labelEl.hasAttribute('aria-labelledby')).toBe(false);
    expect(labelEl.getAttribute('aria-label')).toBe(label);
  });

  test('should have aria-labelledby if there is both a target element and a label element', async () => {
    const label = 'label';
    const labelFor = 'input';
    const targetRef = shallowRef<HTMLElement>();

    render({
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

    expect(((await page.getByTestId('input').element()) as HTMLElement).getAttribute('aria-labelledby')).toBe(
      `${labelFor}-l`,
    );
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

    render({
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

    expect(((await page.getByTestId('label').element()) as HTMLElement).textContent).toBe(label);
    expect(((await page.getByTestId('label').element()) as HTMLElement).getAttribute('for')).toBe(labelFor);
  });
});
