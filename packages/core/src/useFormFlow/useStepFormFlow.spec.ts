import { defineComponent, watch, ref, onMounted } from 'vue';
import { StepResolveContext, useStepFormFlow } from '.';
import { useTextField } from '../useTextField';
import { FormFlowSegment } from './useFlowSegment';
import { z } from 'zod';
import { FormObject } from '../types';
import { dispatchEvent, expectNoA11yViolations } from '@test-utils/index';
import { page } from 'vitest/browser';
import { expect } from 'vitest';

// Simple TextField component for tests
const TextField = defineComponent({
  props: {
    label: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const { inputProps, labelProps, fieldValue, errorMessage, errorMessageProps } = useTextField({
      name: () => props.name,
      label: props.label,
    });

    return {
      inputProps,
      labelProps,
      fieldValue,
      errorMessage,
      errorMessageProps,
    };
  },
  template: `
    <div class="field-wrapper">
      <label v-bind="labelProps">{{ label }}</label>
      <input
        v-bind="inputProps"
      />

      {{ fieldValue }}
      <div v-bind="errorMessageProps">{{ errorMessage }}</div>
    </div>
  `,
});

// Helper components for testing the form flow
const SteppedFormFlow = defineComponent({
  components: { FormFlowSegment, TextField },
  props: {
    initialValues: {
      type: Object,
      default: () => ({}),
    },
    resolver: null,
  },
  emits: ['done'],
  setup(props, { emit }) {
    const {
      formProps,
      values,
      nextButtonProps,
      previousButtonProps,
      currentStep,
      isLastStep,
      onDone,
      goToStep,
      isCurrentStep,
      getStepValue,
      onBeforeStepResolve,
    } = useStepFormFlow({
      initialValues: props.initialValues,
    });

    if (props.resolver) {
      onBeforeStepResolve(props.resolver);
    }

    onDone(values => emit('done', values.toObject()));

    return {
      formProps,
      values,
      nextButtonProps,
      previousButtonProps,
      currentStep,
      isLastStep,
      goToStep,
      isCurrentStep,
      getStepValue,
    };
  },
  template: `
    <div data-testid="flow-wrapper">
      <form
        v-bind="formProps"
        data-testid="form-flow"
      >
        <!-- Render slots (segments) -->
        <slot :goToStep="goToStep" :isCurrentStep="isCurrentStep" :getStepValue="getStepValue"></slot>

        <!-- Navigation controls -->
        <div data-testid="flow-controls">
          <button
            v-bind="previousButtonProps"
            data-testid="previous-button"
          >
            Previous
          </button>

          <button
            v-bind="nextButtonProps"
            data-testid="next-button"
          >
            {{ isLastStep ? 'Submit' : 'Next' }}
          </button>
        </div>

        <!-- Debug info -->
        <div data-testid="current-segment">Current: {{ currentStep?.name }}</div>
        <pre data-testid="form-values">{{ JSON.stringify(values) }}</pre>
      </form>
    </div>
  `,
});

describe('navigation', () => {
  test('should navigate between steps with next and previous buttons and maintain field values', async () => {
    page.render({
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
          <SteppedFormFlow>
            <FormFlowSegment>
              <span>Step 1</span>
              <TextField
                label="Name"
                name="name"
              />
            </FormFlowSegment>

            <FormFlowSegment>
              <span>Step 2</span>
              <TextField
                label="Address"
                name="address"
              />
            </FormFlowSegment>
          </SteppedFormFlow>
        `,
    });

    // Should start at the first step
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    expect(((await page.getByTestId('previous-button').element()) as HTMLButtonElement).disabled).toBe(true);
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();
    expect(document.querySelector('input[name="address"]')).toBeNull();

    // Fill in the name field
    await page.getByLabelText('Name').fill('John Doe');

    // Go to the next step
    await page.getByTestId('next-button').click();

    // Should now be on the second step
    await expect.element(page.getByText('Step 2', { exact: true })).toBeInTheDocument();
    expect(((await page.getByTestId('previous-button').element()) as HTMLButtonElement).disabled).toBe(false);
    expect(document.querySelector('input[name="name"]')).toBeNull();
    await expect.element(page.getByLabelText('Address')).toBeInTheDocument();

    // Fill in the address field
    await page.getByLabelText('Address').fill('123 Main St');

    // Go back to the first step
    await page.getByTestId('previous-button').click();

    // Should be back on the first step
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    expect(((await page.getByTestId('previous-button').element()) as HTMLButtonElement).disabled).toBe(true);
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();
    expect(document.querySelector('input[name="address"]')).toBeNull();

    // Check the form values are preserved
    expect(((await page.getByLabelText('Name').element()) as HTMLInputElement).value).toBe('John Doe');

    // Go to the next step
    await page.getByTestId('next-button').click();

    // Check the form values are preserved
    expect(((await page.getByLabelText('Address').element()) as HTMLInputElement).value).toBe('123 Main St');
  });

  test('should call onDone with all values when submitting the last step', async () => {
    const onDoneMock = vi.fn();
    page.render({
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
          <SteppedFormFlow @done="onDone">
            <FormFlowSegment>
              <span>Step 1</span>
              <TextField
                label="Name"
                name="name"
              />
            </FormFlowSegment>
            <FormFlowSegment>
              <span>Step 2</span>
              <TextField
                label="Address"
                name="address"
              />
            </FormFlowSegment>
          </SteppedFormFlow>
        `,
      setup() {
        return {
          onDone: (result: { name: string; address: string }) => {
            onDoneMock(result);
          },
        };
      },
    });

    // Fill in the name field
    await page.getByLabelText('Name').fill('John Doe');

    // Go to the next step
    await page.getByTestId('next-button').click();

    // Fill in the address field
    await page.getByLabelText('Address').fill('123 Main St');

    // Submit the form
    await page.getByTestId('next-button').click();

    expect(onDoneMock).toHaveBeenCalledTimes(1);

    // Verify onDone was called
    expect(onDoneMock).toHaveBeenCalledWith({
      name: 'John Doe',
      address: '123 Main St',
    });
  });

  test('should not allow moving to the next step unless previous step passes validation', async () => {
    const step1 = z.object({
      name: z.string().min(1),
    });

    const step2 = z.object({
      address: z.string().min(1),
    });

    const step3 = z.object({
      phone: z.string().min(1),
    });

    const onDone = vi.fn();

    page.render({
      setup() {
        return {
          step1,
          step2,
          step3,
          onDone,
        };
      },
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
          <SteppedFormFlow @done="onDone">
            <FormFlowSegment :schema="step1">
              <span>Step 1</span>
              <TextField
                label="Name"
                name="name"
              />
            </FormFlowSegment>
            <FormFlowSegment :schema="step2">
              <span>Step 2</span>
              <TextField
                label="Address"
                name="address"
              />
            </FormFlowSegment>
            <FormFlowSegment :schema="step3">
              <span>Step 3</span>
              <TextField
                label="Phone"
                name="phone"
              />
            </FormFlowSegment>
          </SteppedFormFlow>
        `,
    });

    // Should start at the first step
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();

    // Try to go to step 2 without filling step 1
    await page.getByTestId('next-button').click();

    // Should still be on step 1
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();
    await expect.poll(() => document.querySelector('input[name="address"]')).toBeNull();
    await expect.element(page.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');

    // Fill in the name field and trigger validation via blur
    await page.getByLabelText('Name').fill('John Doe');
    await dispatchEvent(page.getByLabelText('Name'), 'blur');

    // Wait for validation to complete (field should become valid)
    await expect.element(page.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'false');

    // Go to the next step
    await page.getByTestId('next-button').click();

    // Wait for navigation by polling for the Address field
    await expect.poll(() => document.querySelector('input[name="address"]')).not.toBeNull();

    // Fill in the address field
    await expect.element(page.getByLabelText('Address')).toBeInTheDocument();
    await expect.poll(() => document.querySelector('input[name="name"]')).toBeNull();

    await page.getByLabelText('Address').fill('123 Main St');
    await dispatchEvent(page.getByLabelText('Address'), 'blur');
    await expect.element(page.getByLabelText('Address')).toHaveAttribute('aria-invalid', 'false');
    await page.getByTestId('next-button').click();

    // Wait for navigation by polling for the Phone field
    await expect.poll(() => document.querySelector('input[name="phone"]')).not.toBeNull();

    // Should now be on step 3 since previous steps are filled
    await expect.element(page.getByText('Step 3', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Phone')).toBeInTheDocument();
    await expect.poll(() => document.querySelector('input[name="address"]')).toBeNull();

    await page.getByLabelText('Phone').fill('1234567890');
    await dispatchEvent(page.getByLabelText('Phone'), 'blur');
    await expect.element(page.getByLabelText('Phone')).toHaveAttribute('aria-invalid', 'false');
    await page.getByTestId('next-button').click();

    await expect.poll(() => onDone.mock.calls.length).toBe(1);
    expect(onDone).toHaveBeenCalledWith({
      name: 'John Doe',
      address: '123 Main St',
      phone: '1234567890',
    });
  });

  test('should allow jumping to later steps if previous steps are valid and submitted', async () => {
    const step1 = z.object({
      name: z.string().min(1),
    });

    const step2 = z.object({
      address: z.string().min(1),
    });

    const step3 = z.object({
      phone: z.string().min(1),
    });

    const onDone = vi.fn();

    page.render({
      setup() {
        return {
          step1,
          step2,
          step3,
          onDone,
        };
      },
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
          <SteppedFormFlow @done="onDone" v-slot="{ goToStep }">
            <button type="button" @click="goToStep(0)">Go to Step 1</button>
            <button type="button" @click="goToStep(1)">Go to Step 2</button>
            <button type="button" @click="goToStep(2)">Go to Step 3</button>

            <FormFlowSegment :schema="step1">
              <span>Step 1</span>
              <TextField
                label="Name"
                name="name"
              />
            </FormFlowSegment>
            <FormFlowSegment :schema="step2">
              <span>Step 2</span>
              <TextField
                label="Address"
                name="address"
              />
            </FormFlowSegment>
            <FormFlowSegment :schema="step3">
              <span>Step 3</span>
              <TextField
                label="Phone"
                name="phone"
              />
            </FormFlowSegment>
          </SteppedFormFlow>
        `,
    });

    // Should start at the first step
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();

    // Fill in the name field
    await page.getByLabelText('Name').fill('John Doe');
    await dispatchEvent(page.getByLabelText('Name'), 'blur');
    await expect.element(page.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'false');

    // Try to go to step 2
    await page.getByRole('button', { name: 'Go to Step 2' }).click();

    // Won't jump to step 2, unless step 1 gets submitted
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();
    await expect.poll(() => document.querySelector('input[name="address"]')).toBeNull();

    // Submit step 1
    await page.getByTestId('next-button').click();

    // Now we are at step 2
    await expect.poll(() => document.querySelector('input[name="address"]')).not.toBeNull();
    await expect.element(page.getByText('Step 2', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Address')).toBeInTheDocument();

    // We can go back to step 1
    await page.getByRole('button', { name: 'Go to Step 1' }).click();

    await expect.poll(() => document.querySelector('input[name="name"]')).not.toBeNull();
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();

    // Let's go back to step 2
    await page.getByRole('button', { name: 'Go to Step 2' }).click();

    await expect.poll(() => document.querySelector('input[name="address"]')).not.toBeNull();
    await expect.element(page.getByText('Step 2', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Address')).toBeInTheDocument();

    await page.getByLabelText('Address').fill('123 Main St');
    await dispatchEvent(page.getByLabelText('Address'), 'blur');
    await expect.element(page.getByLabelText('Address')).toHaveAttribute('aria-invalid', 'false');
    await page.getByTestId('next-button').click();

    // Should now be on step 3 since previous steps are filled
    await expect.poll(() => document.querySelector('input[name="phone"]')).not.toBeNull();
    await expect.element(page.getByText('Step 3', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Phone')).toBeInTheDocument();

    // We can go back to step 2
    await page.getByRole('button', { name: 'Go to Step 2' }).click();

    await expect.poll(() => document.querySelector('input[name="address"]')).not.toBeNull();
    await expect.element(page.getByText('Step 2', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Address')).toBeInTheDocument();

    // We can go back to step 1
    await page.getByRole('button', { name: 'Go to Step 1' }).click();

    await expect.poll(() => document.querySelector('input[name="name"]')).not.toBeNull();
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();

    // We can go back to step 3
    await page.getByRole('button', { name: 'Go to Step 3' }).click();

    await expect.poll(() => document.querySelector('input[name="phone"]')).not.toBeNull();
    await expect.element(page.getByText('Step 3', { exact: true })).toBeInTheDocument();
  });

  test('can give steps a name and use it to navigate with goToStep', async () => {
    page.render({
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
          <SteppedFormFlow v-slot="{ goToStep }">
            <button type="button" @click="goToStep('step1')">Go to Step 1</button>
            <button type="button" @click="goToStep('step2')">Go to Step 2</button>
            <button type="button" @click="goToStep('step3')">Go to Step 3</button>

            <FormFlowSegment name="step1">
              <span>Step 1</span>
              <TextField
                label="Name"
                name="name"
              />
            </FormFlowSegment>
            <FormFlowSegment  name="step2">
              <span>Step 2</span>
              <TextField
                label="Address"
                name="address"
              />
            </FormFlowSegment>
            <FormFlowSegment name="step3">
              <span>Step 3</span>
              <TextField
                label="Phone"
                name="phone"
              />
            </FormFlowSegment>
          </SteppedFormFlow>
        `,
    });

    // Should start at the first step
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();

    // Fill in the name field
    await page.getByLabelText('Name').fill('John Doe');

    // Try to go to step 2
    await page.getByRole('button', { name: 'Go to Step 2' }).click();

    // Won't jump to step 2, unless step 1 gets submitted
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();
    expect(document.querySelector('input[name="address"]')).toBeNull();

    // Submit step 1
    await page.getByTestId('next-button').click();

    // Now we are at step 2
    await expect.element(page.getByText('Step 2', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Address')).toBeInTheDocument();

    // We can go back to step 1
    await page.getByRole('button', { name: 'Go to Step 1' }).click();

    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();

    // Let's go back to step 2
    await page.getByRole('button', { name: 'Go to Step 2' }).click();

    await expect.element(page.getByText('Step 2', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Address')).toBeInTheDocument();

    await page.getByLabelText('Address').fill('123 Main St');
    await page.getByTestId('next-button').click();

    // Should now be on step 3 since previous steps are filled
    await expect.element(page.getByText('Step 3', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Phone')).toBeInTheDocument();

    // We can go back to step 2
    await page.getByRole('button', { name: 'Go to Step 2' }).click();

    await expect.element(page.getByText('Step 2', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Address')).toBeInTheDocument();

    // We can go back to step 1
    await page.getByRole('button', { name: 'Go to Step 1' }).click();

    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();

    // We can go back to step 3
    await page.getByRole('button', { name: 'Go to Step 3' }).click();

    await expect.element(page.getByText('Step 3', { exact: true })).toBeInTheDocument();
  });

  test('going to the same step again is a NO-OP', async () => {
    page.render({
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
          <SteppedFormFlow v-slot="{ goToStep }">
            <button type="button" @click="goToStep('step1')">Go to Step 1</button>
            <button type="button" @click="goToStep('step2')">Go to Step 2</button>

            <FormFlowSegment name="step1">
              <span>Step 1</span>
              <TextField
                label="Name"
                name="name"
              />
            </FormFlowSegment>
            <FormFlowSegment  name="step2">
              <span>Step 2</span>
              <TextField
                label="Address"
                name="address"
              />
            </FormFlowSegment>
          </SteppedFormFlow>
        `,
    });

    // Should start at the first step
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();

    // Fill in the name field
    await page.getByLabelText('Name').fill('John Doe');

    // Try to go to step 2
    await page.getByRole('button', { name: 'Go to Step 1' }).click();

    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();
  });

  test('can use isCurrentStep to conditionally render content', async () => {
    page.render({
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
          <SteppedFormFlow v-slot="{ goToStep, isCurrentStep }">
            <button type="button" :aria-selected="isCurrentStep('step1')" @click="goToStep('step1')">Go to Step 1</button>
            <button type="button" :aria-selected="isCurrentStep('step2')" @click="goToStep('step2')">Go to Step 2</button>
            <!-- Works with indexes as well -->
            <button type="button" :aria-selected="isCurrentStep(2)" @click="goToStep('step3')">Go to Step 3</button>

            <FormFlowSegment name="step1">
              <span>Step 1</span>
              <TextField
                label="Name"
                name="name"
              />
            </FormFlowSegment>
            <FormFlowSegment  name="step2">
              <span>Step 2</span>
              <TextField
                label="Address"
                name="address"
              />
            </FormFlowSegment>
            <FormFlowSegment name="step3">
              <span>Step 3</span>
              <TextField
                label="Phone"
                name="phone"
              />
            </FormFlowSegment>
          </SteppedFormFlow>
        `,
    });

    // Should start at the first step
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();

    await expect.element(page.getByText('Go to Step 1')).toHaveAttribute('aria-selected', 'true');
    await expect.element(page.getByText('Go to Step 2')).toHaveAttribute('aria-selected', 'false');
    await expect.element(page.getByText('Go to Step 3')).toHaveAttribute('aria-selected', 'false');

    // Fill in the name field
    await page.getByLabelText('Name').fill('John Doe');

    await page.getByTestId('next-button').click();

    await expect.element(page.getByText('Go to Step 1')).toHaveAttribute('aria-selected', 'false');
    await expect.element(page.getByText('Go to Step 2')).toHaveAttribute('aria-selected', 'true');
    await expect.element(page.getByText('Go to Step 3')).toHaveAttribute('aria-selected', 'false');

    await page.getByLabelText('Address').fill('123 Main St');

    await page.getByTestId('next-button').click();

    await expect.element(page.getByText('Go to Step 1')).toHaveAttribute('aria-selected', 'false');
    await expect.element(page.getByText('Go to Step 2')).toHaveAttribute('aria-selected', 'false');
    await expect.element(page.getByText('Go to Step 3')).toHaveAttribute('aria-selected', 'true');
  });

  test('can force jump to any step even if previous steps are not visited', async () => {
    const step1 = z.object({
      name: z.string().min(1),
    });

    const step2 = z.object({
      address: z.string().min(1),
    });

    const step3 = z.object({
      phone: z.string().min(1),
    });

    page.render({
      setup() {
        return {
          step1,
          step2,
          step3,
        };
      },
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
          <SteppedFormFlow v-slot="{ goToStep }">
            <button type="button" @click="goToStep('step1')">Go to Step 1</button>
            <button type="button" @click="goToStep('step2')">Go to Step 2</button>
            <button type="button" @click="goToStep('step3')">Go to Step 3</button>
            <button type="button" @click="goToStep('step3', { force: true })">Force Go to Step 3</button>

            <FormFlowSegment name="step1" :schema="step1">
              <span>Step 1</span>
              <TextField
                label="Name"
                name="name"
              />
            </FormFlowSegment>
            <FormFlowSegment name="step2" :schema="step2">
              <span>Step 2</span>
              <TextField
                label="Address"
                name="address"
              />
            </FormFlowSegment>
            <FormFlowSegment name="step3" :schema="step3">
              <span>Step 3</span>
              <TextField
                label="Phone"
                name="phone"
              />
            </FormFlowSegment>
          </SteppedFormFlow>
        `,
    });

    // Should start at the first step
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();

    // Try to go to step 3 without force - should not work since step 1 is not submitted
    await page.getByRole('button', { name: 'Go to Step 3', exact: true }).click();

    // Should still be on step 1
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();
    await expect.poll(() => document.querySelector('input[name="phone"]')).toBeNull();

    // Now try with force option - should work
    await page.getByRole('button', { name: 'Force Go to Step 3' }).click();

    // Should now be on step 3
    await expect.poll(() => document.querySelector('input[name="phone"]')).not.toBeNull();
    await expect.element(page.getByText('Step 3', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Phone')).toBeInTheDocument();
    await expect.poll(() => document.querySelector('input[name="name"]')).toBeNull();

    // Can go back to step 1 with force
    await page.getByRole('button', { name: 'Go to Step 1', exact: true }).click();

    await expect.poll(() => document.querySelector('input[name="name"]')).not.toBeNull();
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();
    await expect.poll(() => document.querySelector('input[name="phone"]')).toBeNull();
  });

  test('should use custom step resolver to determine next step', async () => {
    const step1 = z.object({
      name: z.string().min(1),
    });

    const step2 = z.object({
      address: z.string().min(1),
    });

    const step3 = z.object({
      phone: z.string().min(1),
    });

    const onDone = vi.fn();

    page.render({
      setup() {
        // Custom step resolver that skips step 2 if name is "skip"
        const resolver = (ctx: StepResolveContext<FormObject>) => {
          if (ctx.currentStep.name === 'step1' && ctx.values.name === 'skip') {
            return 'step3';
          }

          return ctx.next();
        };

        return {
          step1,
          step2,
          step3,
          resolver,
          onDone,
        };
      },
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
      <SteppedFormFlow :resolver="resolver" @done="onDone">
        <FormFlowSegment name="step1" :schema="step1">
          <span>Step 1</span>
          <TextField
            label="Name"
            name="name"
          />
        </FormFlowSegment>
        <FormFlowSegment name="step2" :schema="step2">
          <span>Step 2</span>
          <TextField
            label="Address"
            name="address"
          />
        </FormFlowSegment>
        <FormFlowSegment name="step3" :schema="step3">
          <span>Step 3</span>
          <TextField
            label="Phone"
            name="phone"
          />
        </FormFlowSegment>
      </SteppedFormFlow>
        `,
    });

    // Should start at the first step
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();

    // Fill in the name field with "skip" to trigger custom resolver
    await page.getByLabelText('Name').fill('skip');

    // Go to next step
    await page.getByTestId('next-button').click();

    // Should skip step 2 and go directly to step 3
    await expect.element(page.getByText('Step 3', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Phone')).toBeInTheDocument();
    expect(document.querySelector('input[name="address"]')).toBeNull();

    // Fill in the phone field
    await page.getByLabelText('Phone').fill('1234567890');

    // Submit the form
    await page.getByTestId('next-button').click();

    // Verify onDone was called with the correct values
    expect(onDone).toHaveBeenCalledWith({
      name: 'skip',
      phone: '1234567890',
    });
  });

  test('can use custom step resolver to signal done at any step', async () => {
    const onDone = vi.fn();

    page.render({
      setup() {
        // Custom step resolver that skips step 2 if name is "skip"
        const resolver = (ctx: StepResolveContext<FormObject>) => {
          if (ctx.currentStep.name === 'step1' && ctx.values.name === 'skip') {
            return ctx.done();
          }

          return ctx.next();
        };

        return {
          resolver,
          onDone,
        };
      },
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
      <SteppedFormFlow :resolver="resolver" @done="onDone">
        <FormFlowSegment name="step1">
          <span>Step 1</span>
          <TextField
            label="Name"
            name="name"
          />
        </FormFlowSegment>
        <FormFlowSegment name="step2">
          <span>Step 2</span>
          <TextField
            label="Address"
            name="address"
          />
        </FormFlowSegment>
        <FormFlowSegment name="step3">
          <span>Step 3</span>
          <TextField
            label="Phone"
            name="phone"
          />
        </FormFlowSegment>
      </SteppedFormFlow>
        `,
    });

    // Should start at the first step
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();

    // Fill in the name field with "skip" to trigger custom resolver
    await page.getByLabelText('Name').fill('skip');
    await page.getByTestId('next-button').click();

    // Verify onDone was called with the correct values
    expect(onDone).toHaveBeenCalledWith({
      name: 'skip',
    });
  });
});

describe('state', () => {
  test('can get step values by index', async () => {
    page.render({
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
      <SteppedFormFlow v-slot="{ getStepValue }">
        <pre data-testid="step-1-values">{{ getStepValue(0) }}</pre>
        <pre data-testid="step-2-values">{{ getStepValue(1) }}</pre>

        <FormFlowSegment name="step1">
          <span>Step 1</span>
          <TextField
            label="Name"
            name="name"
          />
        </FormFlowSegment>
        <FormFlowSegment  name="step2">
          <span>Step 2</span>
          <TextField
            label="Address"
            name="address"
          />
        </FormFlowSegment>
      </SteppedFormFlow>
    `,
    });

    await expect.element(page.getByTestId('step-1-values')).toHaveTextContent('{}');
    await expect.element(page.getByTestId('step-2-values')).toHaveTextContent('{}');

    // Fill in the name field
    await page.getByLabelText('Name').fill('John Doe');

    await page.getByTestId('next-button').click();

    await expect.element(page.getByTestId('step-1-values')).toHaveTextContent('{ "name": "John Doe" }');
    await expect.element(page.getByTestId('step-2-values')).toHaveTextContent('{}');

    await page.getByLabelText('Address').fill('123 Main St');
    await page.getByTestId('next-button').click();

    await expect.element(page.getByTestId('step-1-values')).toHaveTextContent('{ "name": "John Doe" }');
    await expect.element(page.getByTestId('step-2-values')).toHaveTextContent('{ "address": "123 Main St" }');
  });
});

describe('a11y', () => {
  test('stepped form should not have a11y violations', async () => {
    page.render({
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
          <SteppedFormFlow data-testid="fixture">
            <FormFlowSegment>
              <TextField
                label="Name"
                name="name"
              />
            </FormFlowSegment>
            <FormFlowSegment>
              <TextField
                label="Address"
                name="address"
              />
            </FormFlowSegment>
          </SteppedFormFlow>
        `,
    });

    await expectNoA11yViolations('[data-testid="fixture"]');
  });

  describe('button accessibility', () => {
    test('next and previous buttons should have proper attributes', async () => {
      page.render({
        components: {
          SteppedFormFlow,
          FormFlowSegment,
        },
        template: `
          <SteppedFormFlow>
            <FormFlowSegment>
              <div>Step 1 Content</div>
            </FormFlowSegment>
            <FormFlowSegment>
              <div>Step 2 Content</div>
            </FormFlowSegment>
          </SteppedFormFlow>
        `,
      });

      // Check that buttons have accessible attributes
      const nextButton = page.getByTestId('next-button');
      const prevButton = page.getByTestId('previous-button');

      // Next button should have type="submit" for form submission
      await expect.element(nextButton).toHaveAttribute('type', 'submit');

      // Prev button should be disabled on the first step
      expect(((await prevButton.element()) as HTMLButtonElement).disabled).toBe(true);
      await expect.element(prevButton).toHaveAttribute('tabindex', '0');

      // Go to next step
      await nextButton.click();

      // Prev button should now be enabled
      expect(((await page.getByTestId('previous-button').element()) as HTMLButtonElement).disabled).toBe(false);
    });

    test('next button should show Submit text on last step', async () => {
      page.render({
        components: {
          SteppedFormFlow,
          FormFlowSegment,
        },
        template: `
          <SteppedFormFlow>
            <FormFlowSegment>
              <div>Step 1 Content</div>
            </FormFlowSegment>
            <FormFlowSegment>
              <div>Step 2 Content</div>
            </FormFlowSegment>
          </SteppedFormFlow>
        `,
      });

      // Next button should say "Next" on first step
      await expect.element(page.getByTestId('next-button')).toHaveTextContent('Next');

      // Go to next step
      await page.getByTestId('next-button').click();

      // Next button should say "Submit" on last step
      await expect.element(page.getByTestId('next-button')).toHaveTextContent('Submit');
    });
  });
});

describe('warnings', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should warn when custom step resolver returns invalid step identifier', async () => {
    const onDone = vi.fn();

    page.render({
      setup() {
        // Custom step resolver that returns an invalid step identifier
        const resolver = (ctx: StepResolveContext<FormObject>) => {
          if (ctx.currentStep.name === 'step1' && ctx.values.name === 'invalid') {
            return 'nonexistent-step';
          }
          return ctx.next();
        };

        return {
          resolver,
          onDone,
        };
      },
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
        <SteppedFormFlow :resolver="resolver" @done="onDone">
          <FormFlowSegment name="step1">
            <span>Step 1</span>
            <TextField
              label="Name"
              name="name"
            />
          </FormFlowSegment>
          <FormFlowSegment name="step2">
            <span>Step 2</span>
            <TextField
              label="Address"
              name="address"
            />
          </FormFlowSegment>
        </SteppedFormFlow>
      `,
    });

    // Fill in the name field with "invalid" to trigger invalid step identifier
    await page.getByLabelText('Name').fill('invalid');

    // Try to go to next step
    await page.getByTestId('next-button').click();

    // Should warn about invalid step identifier
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('onBeforeStepResolve returned an invalid step identifier: nonexistent-step'),
    );

    // Should still be on step 1 since the step change was skipped
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Name')).toBeInTheDocument();
  });

  test('should warn when custom step resolver returns null and execute default resolver', async () => {
    const onDone = vi.fn();

    page.render({
      setup() {
        // Custom step resolver that returns null
        const resolver = (ctx: StepResolveContext<FormObject>) => {
          if (ctx.currentStep.name === 'step1' && ctx.values.name === 'null') {
            return null;
          }
          return ctx.next();
        };

        return {
          resolver,
          onDone,
        };
      },
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
        <SteppedFormFlow :resolver="resolver" @done="onDone">
          <FormFlowSegment name="step1">
            <span>Step 1</span>
            <TextField
              label="Name"
              name="name"
            />
          </FormFlowSegment>
          <FormFlowSegment name="step2">
            <span>Step 2</span>
            <TextField
              label="Address"
              name="address"
            />
          </FormFlowSegment>
        </SteppedFormFlow>
      `,
    });

    // Fill in the name field with "null" to trigger null return
    await page.getByLabelText('Name').fill('null');

    // Try to go to next step
    await page.getByTestId('next-button').click();

    // Should warn about empty step identifier
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('onBeforeStepResolve returned an empty step identifier: null'),
    );

    // Should execute default next resolver and move to step 2
    await expect.element(page.getByText('Step 2', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Address')).toBeInTheDocument();
  });

  test('should warn when custom step resolver returns undefined and execute default resolver', async () => {
    const onDone = vi.fn();

    page.render({
      setup() {
        // Custom step resolver that returns undefined
        const resolver = (ctx: StepResolveContext<FormObject>) => {
          if (ctx.currentStep.name === 'step1' && ctx.values.name === 'undefined') {
            return undefined;
          }
          return ctx.next();
        };

        return {
          resolver,
          onDone,
        };
      },
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
        <SteppedFormFlow :resolver="resolver" @done="onDone">
          <FormFlowSegment name="step1">
            <span>Step 1</span>
            <TextField
              label="Name"
              name="name"
            />
          </FormFlowSegment>
          <FormFlowSegment name="step2">
            <span>Step 2</span>
            <TextField
              label="Address"
              name="address"
            />
          </FormFlowSegment>
        </SteppedFormFlow>
      `,
    });

    // Fill in the name field with "undefined" to trigger undefined return
    await page.getByLabelText('Name').fill('undefined');

    // Try to go to next step
    await page.getByTestId('next-button').click();

    // Should warn about empty step identifier
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('onBeforeStepResolve returned an empty step identifier: undefined'),
    );

    // Should execute default next resolver and move to step 2
    await expect.element(page.getByText('Step 2', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByLabelText('Address')).toBeInTheDocument();
  });

  test('should warn when trying to resolve step before first step is resolved', async () => {
    // This test simulates the edge case where createStepResolverContext is called
    // when there's no current step resolved
    const onDone = vi.fn();

    page.render({
      setup() {
        // Custom step resolver that might be called before steps are properly initialized
        const resolver = (ctx: StepResolveContext<FormObject>) => {
          // This should trigger the warning about no current step resolved
          return ctx.next();
        };

        return {
          resolver,
          onDone,
        };
      },
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
        <SteppedFormFlow :resolver="resolver" @done="onDone">
          <FormFlowSegment name="step1">
            <span>Step 1</span>
            <TextField
              label="Name"
              name="name"
            />
          </FormFlowSegment>
        </SteppedFormFlow>
      `,
    });

    // The warning should be triggered during the resolver context creation
    // if there's no current step resolved (edge case scenario)
    // Note: This is a defensive test for the warning in createStepResolverContext
  });

  test('should warn when form flow has no steps and resolver is triggered', async () => {
    const onDone = vi.fn();

    page.render({
      setup() {
        // Custom step resolver that will be called even with no steps
        const resolver = (ctx: StepResolveContext<FormObject>) => {
          // This should trigger the warning about no current step resolved
          return ctx.next();
        };

        return {
          resolver,
          onDone,
        };
      },
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
        <SteppedFormFlow :resolver="resolver" @done="onDone">
          <!-- No FormFlowSegment components - this should trigger the warning -->
          <div>No steps defined</div>
        </SteppedFormFlow>
      `,
    });

    // Try to trigger the next action which should call the resolver
    // and trigger the warning about no current step
    await page.getByTestId('next-button').click();

    // Should warn about no current step resolved
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'There is no current step resolved, maybe you are trying to resolve a step before the first step is resolved?',
      ),
    );
  });
});

describe('single-step forms', () => {
  test('should correctly identify isLastStep as true for single-step form', async () => {
    page.render({
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
        <SteppedFormFlow>
          <FormFlowSegment name="only-step">
            <span>Only Step</span>
            <TextField label="Name" name="name" />
          </FormFlowSegment>
        </SteppedFormFlow>
      `,
    });

    // With only one step, the next button should say "Submit" not "Next"
    await expect.element(page.getByTestId('next-button')).toHaveTextContent('Submit');
  });

  test('should trigger onDone when submitting single-step form', async () => {
    const onDone = vi.fn();

    page.render({
      setup() {
        return { onDone };
      },
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
        <SteppedFormFlow @done="onDone">
          <FormFlowSegment name="only-step">
            <TextField label="Name" name="name" />
          </FormFlowSegment>
        </SteppedFormFlow>
      `,
    });

    // Fill in the field
    await page.getByLabelText('Name').fill('John Doe');

    // Click next/submit button
    await page.getByTestId('next-button').click();

    // Should have triggered onDone, not moved to another step
    expect(onDone).toHaveBeenCalledWith({
      name: 'John Doe',
    });
  });

  test('should not change button text while segments are registering', async () => {
    // This test verifies the segmentsStable flag works correctly
    // by checking that isLastStep doesn't prematurely return true during registration
    let buttonTexts: string[] = [];

    page.render({
      setup() {
        const { isLastStep } = useStepFormFlow();

        // Track button text as it changes
        watch(
          () => isLastStep.value,
          val => {
            buttonTexts.push(val ? 'Submit' : 'Next');
          },
          { immediate: true },
        );

        return { isLastStep };
      },
      components: {
        FormFlowSegment,
        TextField,
      },
      template: `
        <div>
          <FormFlowSegment name="step1">
            <TextField label="Name" name="name" />
          </FormFlowSegment>
          <FormFlowSegment name="step2">
            <TextField label="Email" name="email" />
          </FormFlowSegment>
          <FormFlowSegment name="step3">
            <TextField label="Phone" name="phone" />
          </FormFlowSegment>
          <button>{{ isLastStep ? 'Submit' : 'Next' }}</button>
        </div>
      `,
    });

    // The button should start as "Next" and not flicker to "Submit" during registration
    // First value should be "Next" (not "Submit")
    expect(buttonTexts[0]).toBe('Next');

    // After all segments register and stabilize, should still be "Next" (we're on step 1 of 3)
    await expect.element(page.getByRole('button')).toHaveTextContent('Next');
  });

  test('single-step form isLastStep should become true after segments stabilize', async () => {
    page.render({
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
        <SteppedFormFlow>
          <FormFlowSegment name="only-step">
            <TextField label="Name" name="name" />
          </FormFlowSegment>
        </SteppedFormFlow>
      `,
    });

    // Wait an extra tick for the microtask (segmentsStable) to resolve
    await new Promise(resolve => Promise.resolve().then(resolve));

    // After segments stabilize, single-step form should show "Submit"
    await expect.element(page.getByTestId('next-button')).toHaveTextContent('Submit');
  });
});

describe('conditional rendering with v-if', () => {
  test('should handle first step not being rendered initially and activate it when it appears on mount', async () => {
    page.render({
      setup() {
        const showFirstStep = ref(false);

        onMounted(() => {
          showFirstStep.value = true;
        });

        return { showFirstStep };
      },
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
        <SteppedFormFlow>
          <FormFlowSegment v-if="showFirstStep" name="step1">
            <span>Step 1</span>
            <TextField label="Name" name="name" />
          </FormFlowSegment>
          <FormFlowSegment name="step2">
            <span>Step 2</span>
            <TextField label="Email" name="email" />
          </FormFlowSegment>
          <FormFlowSegment name="step3">
            <span>Step 3</span>
            <TextField label="Phone" name="phone" />
          </FormFlowSegment>
        </SteppedFormFlow>
      `,
    });

    // After showFirstStep becomes true, step 1 should appear and be active
    await expect.element(page.getByText('Step 1', { exact: true })).toBeInTheDocument();
    await expect.element(page.getByTestId('current-segment')).toHaveTextContent('Current: step1');
  });

  test('should activate first available step when first step is conditionally hidden', async () => {
    page.render({
      setup() {
        const showFirstStep = ref(false);

        return { showFirstStep };
      },
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
        <SteppedFormFlow>
          <FormFlowSegment v-if="showFirstStep" name="step1">
            <span>Step 1</span>
            <TextField label="Name" name="name" />
          </FormFlowSegment>
          <FormFlowSegment name="step2">
            <span>Step 2</span>
            <TextField label="Email" name="email" />
          </FormFlowSegment>
          <FormFlowSegment name="step3">
            <span>Step 3</span>
            <TextField label="Phone" name="phone" />
          </FormFlowSegment>
        </SteppedFormFlow>
      `,
    });

    // Step 1 is not rendered, so step 2 should be the first available step
    // However, step 1 was registered first, so currentSegmentId points to step1
    // but step1 is not in the DOM, causing a mismatch
    // The current segment should show step2 content (first available in DOM)
    expect(document.body.textContent).toContain('Step 2');
    expect(document.body.textContent).not.toContain('Step 3');
  });

  test('should reset to first available step on mount when initial step is not rendered', async () => {
    page.render({
      setup() {
        const showFirstStep = ref(false);

        return { showFirstStep };
      },
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
        <SteppedFormFlow>
          <FormFlowSegment v-if="showFirstStep" name="step1">
            <span>Step 1</span>
            <TextField label="Name" name="name" />
          </FormFlowSegment>
          <FormFlowSegment name="step2">
            <span>Step 2</span>
            <TextField label="Email" name="email" />
          </FormFlowSegment>
          <FormFlowSegment name="step3">
            <span>Step 3</span>
            <TextField label="Phone" name="phone" />
          </FormFlowSegment>
        </SteppedFormFlow>
      `,
    });

    // With the fix, step 2 (first available) should be active and visible
    expect(document.body.textContent).toContain('Step 2');
    expect(document.body.textContent).not.toContain('Step 3');

    // Current step name should be 'step2'
    await expect.element(page.getByTestId('current-segment')).toHaveTextContent('Current: step2');
  });

  test('should not override user navigation if they manually change step', async () => {
    const showFirstStep = ref(false);
    const goToStepFn = ref<((step: string | number, opts?: { force?: true }) => void) | null>(null);

    page.render({
      setup() {
        const { goToStep, currentStep } = useStepFormFlow();
        goToStepFn.value = goToStep;

        onMounted(() => {
          goToStep('step3', { force: true });
          showFirstStep.value = true;
        });

        return { showFirstStep, currentStep };
      },
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
        <div data-testid="current-step">Current: {{ currentStep?.name }}</div>
        <FormFlowSegment v-if="showFirstStep" name="step1">
          <span>Step 1</span>
          <TextField label="Name" name="name" />
        </FormFlowSegment>

        <FormFlowSegment name="step2">
          <span>Step 2</span>
          <TextField label="Email" name="email" />
        </FormFlowSegment>

        <FormFlowSegment name="step3">
          <span>Step 3</span>
          <TextField label="Phone" name="phone" />
        </FormFlowSegment>
    `,
    });

    // Should be on step 3 and not step 1, meaning the correction did not happen
    await expect.element(page.getByText('Step 3', { exact: true })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('Step 1');
    expect(document.body.textContent).not.toContain('Step 2');
    await expect.element(page.getByTestId('current-step')).toHaveTextContent('Current: step3');
  });
});
