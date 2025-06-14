import { defineComponent } from 'vue';
import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { StepResolveContext, useStepFormFlow } from '.';
import { flush } from '@test-utils/flush';
import { useTextField } from '../useTextField';
import { FormFlowSegment } from './useFlowSegment';
import { z } from 'zod';
import { FormObject } from '../types';

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
    await render({
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

    await flush();

    // Should start at the first step
    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByTestId('previous-button')).toHaveAttribute('disabled');
    expect(screen.getByLabelText('Name')).toBeVisible();
    expect(screen.queryByLabelText('Address')).not.toBeInTheDocument();

    // Fill in the name field
    await fireEvent.update(screen.getByLabelText('Name'), 'John Doe');

    // Go to the next step
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    // Should now be on the second step
    expect(screen.getByText('Step 2')).toBeVisible();
    expect(screen.getByTestId('previous-button')).not.toHaveAttribute('disabled');
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Address')).toBeVisible();

    // Fill in the address field
    await fireEvent.update(screen.getByLabelText('Address'), '123 Main St');

    // Go back to the first step
    await fireEvent.click(screen.getByTestId('previous-button'));
    await flush();

    // Should be back on the first step
    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByTestId('previous-button')).toHaveAttribute('disabled');
    expect(screen.getByLabelText('Name')).toBeVisible();
    expect(screen.queryByLabelText('Address')).not.toBeInTheDocument();

    // Check the form values are preserved
    expect(screen.getByLabelText('Name')).toHaveValue('John Doe');

    // Go to the next step
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    // Check the form values are preserved
    expect(screen.getByLabelText('Address')).toHaveValue('123 Main St');
  });

  test('should call onDone with all values when submitting the last step', async () => {
    const onDoneMock = vi.fn();
    await render({
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

    await flush();

    // Fill in the name field
    await fireEvent.update(screen.getByLabelText('Name'), 'John Doe');

    // Go to the next step
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    // Fill in the address field
    await fireEvent.update(screen.getByLabelText('Address'), '123 Main St');

    // Submit the form
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

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

    await render({
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

    await flush();

    // Should start at the first step
    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByLabelText('Name')).toBeVisible();

    // Try to go to step 2 without filling step 1
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    // Should still be on step 1
    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByLabelText('Name')).toBeVisible();
    expect(screen.queryByLabelText('Address')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveErrorMessage();

    // Fill in the name field
    await fireEvent.update(screen.getByLabelText('Name'), 'John Doe');

    // Go to the next step
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    // Fill in the address field
    expect(screen.getByLabelText('Address')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();

    await fireEvent.update(screen.getByLabelText('Address'), '123 Main St');
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    // Should now be on step 3 since previous steps are filled
    expect(screen.getByText('Step 3')).toBeVisible();
    expect(screen.getByLabelText('Phone')).toBeVisible();
    expect(screen.queryByLabelText('Address')).not.toBeInTheDocument();

    await fireEvent.update(screen.getByLabelText('Phone'), '1234567890');
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    expect(onDone).toHaveBeenCalledTimes(1);
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

    await render({
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

    await flush();

    // Should start at the first step
    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByLabelText('Name')).toBeVisible();

    // Fill in the name field
    await fireEvent.update(screen.getByLabelText('Name'), 'John Doe');
    await flush();

    // Try to go to step 2
    await fireEvent.click(screen.getByText('Go to Step 2'));
    await flush();

    // Won't jump to step 2, unless step 1 gets submitted
    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByLabelText('Name')).toBeVisible();
    expect(screen.queryByLabelText('Address')).not.toBeInTheDocument();

    // Submit step 1
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    // Now we are at step 2
    expect(screen.getByText('Step 2')).toBeVisible();
    expect(screen.getByLabelText('Address')).toBeVisible();

    // We can go back to step 1
    await fireEvent.click(screen.getByText('Go to Step 1'));
    await flush();

    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByLabelText('Name')).toBeVisible();

    // Let's go back to step 2
    await fireEvent.click(screen.getByText('Go to Step 2'));
    await flush();

    expect(screen.getByText('Step 2')).toBeVisible();
    expect(screen.getByLabelText('Address')).toBeVisible();

    await fireEvent.update(screen.getByLabelText('Address'), '123 Main St');
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    // Should now be on step 3 since previous steps are filled
    expect(screen.getByText('Step 3')).toBeVisible();
    expect(screen.getByLabelText('Phone')).toBeVisible();

    // We can go back to step 2
    await fireEvent.click(screen.getByText('Go to Step 2'));
    await flush();

    expect(screen.getByText('Step 2')).toBeVisible();
    expect(screen.getByLabelText('Address')).toBeVisible();

    // We can go back to step 1
    await fireEvent.click(screen.getByText('Go to Step 1'));
    await flush();

    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByLabelText('Name')).toBeVisible();

    // We can go back to step 3
    await fireEvent.click(screen.getByText('Go to Step 3'));
    await flush();

    expect(screen.getByText('Step 3')).toBeVisible();
  });

  test('can give steps a name and use it to navigate with goToStep', async () => {
    await render({
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

    await flush();

    // Should start at the first step
    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByLabelText('Name')).toBeVisible();

    // Fill in the name field
    await fireEvent.update(screen.getByLabelText('Name'), 'John Doe');
    await flush();

    // Try to go to step 2
    await fireEvent.click(screen.getByText('Go to Step 2'));
    await flush();

    // Won't jump to step 2, unless step 1 gets submitted
    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByLabelText('Name')).toBeVisible();
    expect(screen.queryByLabelText('Address')).not.toBeInTheDocument();

    // Submit step 1
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    // Now we are at step 2
    expect(screen.getByText('Step 2')).toBeVisible();
    expect(screen.getByLabelText('Address')).toBeVisible();

    // We can go back to step 1
    await fireEvent.click(screen.getByText('Go to Step 1'));
    await flush();

    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByLabelText('Name')).toBeVisible();

    // Let's go back to step 2
    await fireEvent.click(screen.getByText('Go to Step 2'));
    await flush();

    expect(screen.getByText('Step 2')).toBeVisible();
    expect(screen.getByLabelText('Address')).toBeVisible();

    await fireEvent.update(screen.getByLabelText('Address'), '123 Main St');
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    // Should now be on step 3 since previous steps are filled
    expect(screen.getByText('Step 3')).toBeVisible();
    expect(screen.getByLabelText('Phone')).toBeVisible();

    // We can go back to step 2
    await fireEvent.click(screen.getByText('Go to Step 2'));
    await flush();

    expect(screen.getByText('Step 2')).toBeVisible();
    expect(screen.getByLabelText('Address')).toBeVisible();

    // We can go back to step 1
    await fireEvent.click(screen.getByText('Go to Step 1'));
    await flush();

    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByLabelText('Name')).toBeVisible();

    // We can go back to step 3
    await fireEvent.click(screen.getByText('Go to Step 3'));
    await flush();

    expect(screen.getByText('Step 3')).toBeVisible();
  });

  test('can use isCurrentStep to conditionally render content', async () => {
    await render({
      components: {
        SteppedFormFlow,
        FormFlowSegment,
        TextField,
      },
      template: `
          <SteppedFormFlow v-slot="{ goToStep, isCurrentStep }">
            <button type="button" :aria-selected="isCurrentStep('step1')" @click="goToStep('step1')">Go to Step 1</button>
            <button type="button" :aria-selected="isCurrentStep('step2')" @click="goToStep('step2')">Go to Step 2</button>
            <button type="button" :aria-selected="isCurrentStep('step3')" @click="goToStep('step3')">Go to Step 3</button>

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

    await flush();

    // Should start at the first step
    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByLabelText('Name')).toBeVisible();

    expect(screen.getByText('Go to Step 1')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Go to Step 2')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('Go to Step 3')).toHaveAttribute('aria-selected', 'false');

    // Fill in the name field
    await fireEvent.update(screen.getByLabelText('Name'), 'John Doe');
    await flush();

    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    expect(screen.getByText('Go to Step 1')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('Go to Step 2')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Go to Step 3')).toHaveAttribute('aria-selected', 'false');

    await fireEvent.update(screen.getByLabelText('Address'), '123 Main St');

    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    expect(screen.getByText('Go to Step 1')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('Go to Step 2')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('Go to Step 3')).toHaveAttribute('aria-selected', 'true');
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

    await render({
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

    await flush();

    // Should start at the first step
    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByLabelText('Name')).toBeVisible();

    // Fill in the name field with "skip" to trigger custom resolver
    await fireEvent.update(screen.getByLabelText('Name'), 'skip');
    await flush();

    // Go to next step
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    // Should skip step 2 and go directly to step 3
    expect(screen.getByText('Step 3')).toBeVisible();
    expect(screen.getByLabelText('Phone')).toBeVisible();
    expect(screen.queryByLabelText('Address')).not.toBeInTheDocument();

    // Fill in the phone field
    await fireEvent.update(screen.getByLabelText('Phone'), '1234567890');
    await flush();

    // Submit the form
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    // Verify onDone was called with the correct values
    expect(onDone).toHaveBeenCalledWith({
      name: 'skip',
      phone: '1234567890',
    });
  });

  test('can use custom step resolver to signal done at any step', async () => {
    const onDone = vi.fn();

    await render({
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

    await flush();

    // Should start at the first step
    expect(screen.getByText('Step 1')).toBeVisible();
    expect(screen.getByLabelText('Name')).toBeVisible();

    // Fill in the name field with "skip" to trigger custom resolver
    await fireEvent.update(screen.getByLabelText('Name'), 'skip');
    await flush();
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    // Verify onDone was called with the correct values
    expect(onDone).toHaveBeenCalledWith({
      name: 'skip',
    });
  });
});

describe('state', () => {
  test('can get step values by index', async () => {
    await render({
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

    await flush();

    expect(screen.getByTestId('step-1-values')).toHaveTextContent('{}');
    expect(screen.getByTestId('step-2-values')).toHaveTextContent('{}');

    // Fill in the name field
    await fireEvent.update(screen.getByLabelText('Name'), 'John Doe');
    await flush();

    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    expect(screen.getByTestId('step-1-values')).toHaveTextContent('{ "name": "John Doe" }');
    expect(screen.getByTestId('step-2-values')).toHaveTextContent('{}');

    await fireEvent.update(screen.getByLabelText('Address'), '123 Main St');
    await fireEvent.click(screen.getByTestId('next-button'));
    await flush();

    expect(screen.getByTestId('step-1-values')).toHaveTextContent('{ "name": "John Doe" }');
    expect(screen.getByTestId('step-2-values')).toHaveTextContent('{ "address": "123 Main St" }');
  });
});

describe('a11y', () => {
  test('stepped form should not have a11y violations', async () => {
    await render({
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

    await flush();
    vi.useRealTimers();
    expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
    vi.useFakeTimers();
  });

  describe('button accessibility', () => {
    test('next and previous buttons should have proper attributes', async () => {
      await render({
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

      await flush();

      // Check that buttons have accessible attributes
      const nextButton = screen.getByTestId('next-button');
      const prevButton = screen.getByTestId('previous-button');

      // Next button should have type="submit" for form submission
      expect(nextButton).toHaveAttribute('type', 'submit');

      // Prev button should be disabled on the first step
      expect(prevButton).toHaveAttribute('disabled');
      expect(prevButton).toHaveAttribute('tabindex', '0');

      // Go to next step
      await fireEvent.click(nextButton);
      await flush();

      // Prev button should now be enabled
      expect(screen.getByTestId('previous-button')).not.toHaveAttribute('disabled');
    });

    test('next button should show Submit text on last step', async () => {
      await render({
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

      await flush();

      // Next button should say "Next" on first step
      expect(screen.getByTestId('next-button')).toHaveTextContent('Next');

      // Go to next step
      await fireEvent.click(screen.getByTestId('next-button'));
      await flush();

      // Next button should say "Submit" on last step
      expect(screen.getByTestId('next-button')).toHaveTextContent('Submit');
    });
  });
});
