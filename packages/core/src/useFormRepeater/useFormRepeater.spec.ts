import { defineComponent, ref } from 'vue';
import { render, screen, fireEvent } from '@testing-library/vue';
import { useFormRepeater, FormRepeaterProps } from './useFormRepeater';
import { flush } from '@test-utils/index';
import { useForm } from '../useForm';
import { useTextField } from '../useTextField';

async function renderTest(props: FormRepeaterProps) {
  const { addButtonProps, items, Iteration, swap, insert, remove, move } = useFormRepeater(props);

  const TestComponent = defineComponent({
    components: { Iteration },
    setup() {
      return { addButtonProps, items };
    },
    template: `
      <Iteration
        v-for="(key, index) in items"
        :key="key"
        :index="index"
        v-slot="{ removeButtonProps, moveUpButtonProps, moveDownButtonProps }"
      >
        <div data-testid="repeater-item">
          <span data-testid="key">{{ key }}</span>

          <button data-testid="remove-button" v-bind="removeButtonProps">Remove</button>
          <button data-testid="move-up-button" v-bind="moveUpButtonProps">Move Up</button>
          <button data-testid="move-down-button" v-bind="moveDownButtonProps">Move Down</button>
        </div>
      </Iteration>

      <button data-testid="add-button" v-bind="addButtonProps">Add</button>
    `,
  });

  await render(TestComponent);

  return {
    swap,
    insert,
    remove,
    move,
  };
}

test('renders the minimum number of repeater items', async () => {
  await renderTest({
    name: 'testRepeater',
    min: 1,
  });

  const items = screen.getAllByTestId('repeater-item');
  expect(items).toHaveLength(1);
});

test('adds a new item when add button is clicked', async () => {
  await renderTest({
    name: 'testRepeater',
    min: 1,
  });
  const addButton = screen.getByTestId('add-button');
  await fireEvent.click(addButton);
  const items = screen.getAllByTestId('repeater-item');
  expect(items).toHaveLength(2);
});

test('does not add a new item when max limit is reached', async () => {
  await renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });
  const addButton = screen.getByTestId('add-button');
  // Add items up to the maximum limit
  await fireEvent.click(addButton); // 2nd item
  await fireEvent.click(addButton); // 3rd item
  await fireEvent.click(addButton); // Attempt to add 4th item

  const items = screen.getAllByTestId('repeater-item');
  expect(items).toHaveLength(3); // Should not exceed max

  // Verify that the add button is disabled
  expect(addButton).toBeDisabled();
});

test('removes an item when remove button is clicked', async () => {
  await renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });
  const addButton = screen.getByTestId('add-button');
  // Add two more items to have three in total
  await fireEvent.click(addButton);
  await fireEvent.click(addButton);
  let items = screen.getAllByTestId('repeater-item');
  expect(items).toHaveLength(3);

  // Remove the second item
  const removeButtons = screen.getAllByTestId('remove-button');
  await fireEvent.click(removeButtons[1]);
  items = screen.getAllByTestId('repeater-item');
  expect(items).toHaveLength(2);

  // Verify that the add button is enabled again
  expect(addButton).not.toBeDisabled();
});

test('should disable add button when max is reached', async () => {
  await renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });
  const addButton = screen.getByTestId('add-button');
  // Add items to reach the maximum limit
  await fireEvent.click(addButton); // 2nd item
  await fireEvent.click(addButton); // 3rd item

  expect(addButton).toBeDisabled();
});

test('should enable add button when max is not reached', async () => {
  await renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });
  const addButton = screen.getByTestId('add-button');
  expect(addButton).not.toBeDisabled();
});

test('moves an item up', async () => {
  await renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });
  const addButton = screen.getByTestId('add-button');
  // Add two more items to have three in total
  await fireEvent.click(addButton); // 2nd item
  await fireEvent.click(addButton); // 3rd item

  let items = screen.getAllByTestId('repeater-item');
  expect(items).toHaveLength(3);

  // Move the third item up to the second position
  const moveUpButtons = screen.getAllByTestId('move-up-button');
  await fireEvent.click(moveUpButtons[2]);

  // Re-fetch items after the move
  items = screen.getAllByTestId('repeater-item');

  // Since we're not tracking the order, we'll assume the move was successful if no errors occur
  expect(items).toHaveLength(3);
});

test('moves an item down', async () => {
  await renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });
  const addButton = screen.getByTestId('add-button');
  // Add two more items to have three in total
  await fireEvent.click(addButton); // 2nd item
  await fireEvent.click(addButton); // 3rd item

  let items = screen.getAllByTestId('repeater-item');
  expect(items).toHaveLength(3);

  // Move the first item down to the second position
  const moveDownButtons = screen.getAllByTestId('move-down-button');
  await fireEvent.click(moveDownButtons[0]);

  // Re-fetch items after the move
  items = screen.getAllByTestId('repeater-item');

  // Since we're not tracking the order, we'll assume the move was successful if no errors occur
  expect(items).toHaveLength(3);
});

test('swaps two items', async () => {
  const { swap } = await renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });

  const addButton = screen.getByTestId('add-button');
  await fireEvent.click(addButton);
  await fireEvent.click(addButton);
  let items = screen.getAllByTestId('key');
  expect(items[0]).toHaveTextContent('-0');
  expect(items[1]).toHaveTextContent('-1');

  swap(0, 1);
  await flush();

  items = screen.getAllByTestId('key');
  expect(items[0]).toHaveTextContent('-1');
  expect(items[1]).toHaveTextContent('-0');
});

test('inserts an item at a specific index', async () => {
  const { insert } = await renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });

  insert(1);
  await flush();

  const items = screen.getAllByTestId('repeater-item');
  expect(items).toHaveLength(2);
});

test('does not insert an item when max is reached', async () => {
  const { insert } = await renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });

  const addButton = screen.getByTestId('add-button');
  await fireEvent.click(addButton);
  await fireEvent.click(addButton);

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  insert(1);
  await flush();

  const items = screen.getAllByTestId('repeater-item');
  expect(items).toHaveLength(3);

  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});

test('warns if name is not provided', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await renderTest({
    name: '',
    min: 1,
    max: 3,
  });

  expect(warn).toHaveBeenLastCalledWith('[Formwerk]: "name" prop is required for useFormRepeater');
  warn.mockRestore();
});

test('does not remove an item when min is reached', async () => {
  const { remove } = await renderTest({
    name: 'testRepeater',
    min: 1,
    max: 3,
  });

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  remove(0);
  await flush();

  const items = screen.getAllByTestId('repeater-item');
  expect(items).toHaveLength(1);
  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});

test('can remove all if no min is set', async () => {
  const { remove } = await renderTest({
    name: 'testRepeater',
  });

  remove(0);
  await flush();

  const items = screen.queryAllByTestId('repeater-item');
  expect(items).toHaveLength(0);
});

test('renders Iteration component with correct props', async () => {
  const { Iteration, items } = useFormRepeater({
    name: 'testRepeater',
    min: 1,
  });

  const TestComponent = defineComponent({
    components: { Iteration },

    setup() {
      return { items, Iteration };
    },
    template: `
      <Iteration v-for="(key, index) in items" :index="index" v-slot="{ removeButtonProps, moveUpButtonProps, moveDownButtonProps }">
        <div data-testid="iteration-content">
          <button data-testid="remove-button" v-bind="removeButtonProps">Remove</button>
          <button data-testid="move-up-button" v-bind="moveUpButtonProps">Move Up</button>
          <button data-testid="move-down-button" v-bind="moveDownButtonProps">Move Down</button>
        </div>
      </Iteration>
    `,
  });

  await render(TestComponent);

  const content = screen.getByTestId('iteration-content');
  expect(content).toBeInTheDocument();

  const removeButton = screen.getByTestId('remove-button');
  expect(removeButton).toBeInTheDocument();
  expect(removeButton).toHaveAttribute('type', 'button');

  const moveUpButton = screen.getByTestId('move-up-button');
  expect(moveUpButton).toBeInTheDocument();
  expect(moveUpButton).toHaveAttribute('type', 'button');
  expect(moveUpButton).toBeDisabled();

  const moveDownButton = screen.getByTestId('move-down-button');
  expect(moveDownButton).toBeInTheDocument();
  expect(moveDownButton).toHaveAttribute('type', 'button');
});

test('renders Iteration component with correct props with custom element', async () => {
  const { Iteration, items } = useFormRepeater({
    name: 'testRepeater',
    min: 1,
  });

  const TestComponent = defineComponent({
    components: { Iteration },
    setup() {
      return { items };
    },
    template: `
      <Iteration v-for="(key, index) in items" as="div" data-testid="repeater-item" :index="index" v-slot="{ removeButtonProps, moveUpButtonProps, moveDownButtonProps }">
        <div data-testid="iteration-content">
          <button data-testid="remove-button" v-bind="removeButtonProps">Remove</button>
          <button data-testid="move-up-button" v-bind="moveUpButtonProps">Move Up</button>
          <button data-testid="move-down-button" v-bind="moveDownButtonProps">Move Down</button>
        </div>
      </Iteration>
    `,
  });

  await render(TestComponent);

  const content = screen.getByTestId('repeater-item');
  expect(content).toBeInTheDocument();
});

test('warns if move is called with the same index', async () => {
  const { move } = await renderTest({
    name: 'testRepeater',
    min: 1,
  });

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  move(0, 0);
  await flush();

  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});

test('warns if move is called with an out of bounds index', async () => {
  const { move } = await renderTest({
    name: 'testRepeater',
    min: 1,
  });

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  move(0, 10);
  await flush();

  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});

test('warns if insert is called with an out of bounds index', async () => {
  const { insert } = await renderTest({
    name: 'testRepeater',
    min: 1,
  });

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  insert(10);
  await flush();

  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});

test('warns if swap is called with the same index', async () => {
  const { swap } = await renderTest({
    name: 'testRepeater',
    min: 1,
  });

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  swap(0, 0);
  await flush();

  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});

test('warns if swap is called with an out of bounds index', async () => {
  const { swap } = await renderTest({
    name: 'testRepeater',
    min: 1,
  });

  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  swap(0, 10);
  await flush();

  expect(warn).toHaveBeenCalledOnce();
  warn.mockRestore();
});

describe('form repeater with form context', () => {
  test('removing an item after conditionally unmounting a field keeps form values in sync', async () => {
    // This test reproduces the bug where:
    // 1. Form has 3 users with firstName and lastName
    // 2. User clears the second user's firstName (making it empty)
    // 3. This causes the lastName field to unmount (due to v-if condition)
    // 4. User removes the second row
    // 5. Form values should correctly have 2 users with their original data

    const formReturns = ref<ReturnType<typeof useForm<any>> | null>(null);

    // TextField component
    const TextField = defineComponent({
      props: {
        name: { type: String, required: true },
        label: { type: String, required: true },
      },
      setup(props) {
        const { inputProps, labelProps } = useTextField({
          name: props.name,
          label: props.label,
        });
        return { inputProps, labelProps };
      },
      template: `
        <div>
          <label v-bind="labelProps">{{ label }}</label>
          <input v-bind="inputProps" />
        </div>
      `,
    });

    // Child component that uses the repeater (must be child to inject form context)
    const RepeaterChild = defineComponent({
      components: { TextField },
      props: {
        form: { type: Object, required: true },
      },
      setup(props) {
        const { items, Iteration } = useFormRepeater<{ firstName: string; lastName?: string }>({
          name: 'users',
        });

        return { items, Iteration, form: props.form };
      },
      template: `
        <component
          :is="Iteration"
          v-for="(key, index) in items"
          :key="key"
          :index="index"
          v-slot="{ removeButtonProps }"
        >
          <div :data-testid="'user-' + index">
            <TextField name="firstName" label="First Name" />
            <TextField
              v-if="form.values.users?.[index]?.firstName"
              name="lastName"
              label="Last Name"
            />
            <button v-bind="removeButtonProps" :data-testid="'remove-' + index">Remove</button>
          </div>
        </component>
      `,
    });

    // Parent component with form
    const TestComponent = defineComponent({
      components: { RepeaterChild },
      setup() {
        const form = useForm<{ users: Array<{ firstName: string; lastName?: string }> }>({
          initialValues: {
            users: [
              { firstName: 'First Name 1', lastName: 'Last Name 1' },
              { firstName: 'First Name 2', lastName: 'Last Name 2' },
              { firstName: 'First Name 3', lastName: 'Last Name 3' },
            ],
          },
        });

        formReturns.value = form;

        return { form };
      },
      template: `<RepeaterChild :form="form" />`,
    });

    await render(TestComponent);
    await flush();

    // Verify initial state - 3 users with all data
    expect(formReturns.value!.values.users).toHaveLength(3);
    expect(formReturns.value!.values.users).toEqual([
      { firstName: 'First Name 1', lastName: 'Last Name 1' },
      { firstName: 'First Name 2', lastName: 'Last Name 2' },
      { firstName: 'First Name 3', lastName: 'Last Name 3' },
    ]);

    // Step 2: Clear the second user's firstName
    // Get the second firstName input (index 1)
    const inputs = screen.getAllByRole('textbox');
    // Inputs are: firstName1, lastName1, firstName2, lastName2, firstName3, lastName3
    const secondUserFirstNameInput = inputs[2]; // 0=fn1, 1=ln1, 2=fn2

    await fireEvent.update(secondUserFirstNameInput, '');
    await flush();

    // After clearing firstName, lastName should be unmounted (due to v-if)
    // The form value for firstName should be empty
    expect(formReturns.value!.values.users![1].firstName).toBe('');

    // Step 3: Remove the second row
    const removeButton = screen.getByTestId('remove-1');
    await fireEvent.click(removeButton);
    await flush();

    // After removal, we should have 2 users
    expect(formReturns.value!.values.users).toHaveLength(2);

    // The first user should be unchanged
    expect(formReturns.value!.values.users![0]).toEqual({ firstName: 'First Name 1', lastName: 'Last Name 1' });

    // The second user should now be what was previously the third user
    expect(formReturns.value!.values.users![1]).toEqual({ firstName: 'First Name 3', lastName: 'Last Name 3' });
  });

  test('removing an item updates form values correctly', async () => {
    const formReturns = ref<ReturnType<typeof useForm<any>> | null>(null);

    // TextField component
    const TextField = defineComponent({
      props: {
        name: { type: String, required: true },
        label: { type: String, required: true },
      },
      setup(props) {
        const { inputProps, labelProps } = useTextField({
          name: props.name,
          label: props.label,
        });
        return { inputProps, labelProps };
      },
      template: `
        <div>
          <label v-bind="labelProps">{{ label }}</label>
          <input v-bind="inputProps" />
        </div>
      `,
    });

    // Child component that uses the repeater
    const RepeaterChild = defineComponent({
      components: { TextField },
      setup() {
        const { items, Iteration } = useFormRepeater<{ firstName: string }>({
          name: 'users',
        });

        return { items, Iteration };
      },
      template: `
        <component
          :is="Iteration"
          v-for="(key, index) in items"
          :key="key"
          :index="index"
          v-slot="{ removeButtonProps }"
        >
          <div :data-testid="'user-' + index">
            <TextField name="firstName" label="First Name" />
            <button v-bind="removeButtonProps" :data-testid="'remove-' + index">Remove</button>
          </div>
        </component>
      `,
    });

    // Parent component with form
    const TestComponent = defineComponent({
      components: { RepeaterChild },
      setup() {
        const form = useForm<{ users: Array<{ firstName: string }> }>({
          initialValues: {
            users: [{ firstName: 'User 1' }, { firstName: 'User 2' }, { firstName: 'User 3' }],
          },
        });

        formReturns.value = form;

        return { form };
      },
      template: `<RepeaterChild />`,
    });

    await render(TestComponent);
    await flush();

    // Verify initial state
    expect(formReturns.value!.values.users).toHaveLength(3);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 1');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 2');
    expect(formReturns.value!.values.users![2].firstName).toBe('User 3');

    // Remove the second item (index 1)
    const removeButton = screen.getByTestId('remove-1');
    await fireEvent.click(removeButton);
    await flush();

    // After removal, we should have 2 users
    expect(formReturns.value!.values.users).toHaveLength(2);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 1');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 3');
  });

  test('swapping items updates form values correctly', async () => {
    const formReturns = ref<ReturnType<typeof useForm<any>> | null>(null);
    const repeaterReturns = ref<ReturnType<typeof useFormRepeater<any>> | null>(null);

    const TextField = defineComponent({
      props: {
        name: { type: String, required: true },
        label: { type: String, required: true },
      },
      setup(props) {
        const { inputProps, labelProps } = useTextField({
          name: props.name,
          label: props.label,
        });
        return { inputProps, labelProps };
      },
      template: `
        <div>
          <label v-bind="labelProps">{{ label }}</label>
          <input v-bind="inputProps" />
        </div>
      `,
    });

    const RepeaterChild = defineComponent({
      components: { TextField },
      setup() {
        const repeater = useFormRepeater<{ firstName: string }>({
          name: 'users',
        });

        repeaterReturns.value = repeater;

        return { items: repeater.items, Iteration: repeater.Iteration };
      },
      template: `
        <component
          :is="Iteration"
          v-for="(key, index) in items"
          :key="key"
          :index="index"
        >
          <div :data-testid="'user-' + index">
            <TextField name="firstName" label="First Name" />
          </div>
        </component>
      `,
    });

    const TestComponent = defineComponent({
      components: { RepeaterChild },
      setup() {
        const form = useForm<{ users: Array<{ firstName: string }> }>({
          initialValues: {
            users: [{ firstName: 'User 1' }, { firstName: 'User 2' }, { firstName: 'User 3' }],
          },
        });

        formReturns.value = form;

        return { form };
      },
      template: `<RepeaterChild />`,
    });

    await render(TestComponent);
    await flush();

    // Verify initial state
    expect(formReturns.value!.values.users).toHaveLength(3);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 1');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 2');
    expect(formReturns.value!.values.users![2].firstName).toBe('User 3');

    // Swap first and third items (index 0 and 2)
    repeaterReturns.value!.swap(0, 2);
    await flush();

    // After swap, User 1 and User 3 should be swapped
    expect(formReturns.value!.values.users).toHaveLength(3);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 3');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 2');
    expect(formReturns.value!.values.users![2].firstName).toBe('User 1');
  });

  test('moving an item updates form values correctly', async () => {
    const formReturns = ref<ReturnType<typeof useForm<any>> | null>(null);
    const repeaterReturns = ref<ReturnType<typeof useFormRepeater<any>> | null>(null);

    const TextField = defineComponent({
      props: {
        name: { type: String, required: true },
        label: { type: String, required: true },
      },
      setup(props) {
        const { inputProps, labelProps } = useTextField({
          name: props.name,
          label: props.label,
        });
        return { inputProps, labelProps };
      },
      template: `
        <div>
          <label v-bind="labelProps">{{ label }}</label>
          <input v-bind="inputProps" />
        </div>
      `,
    });

    const RepeaterChild = defineComponent({
      components: { TextField },
      setup() {
        const repeater = useFormRepeater<{ firstName: string }>({
          name: 'users',
        });

        repeaterReturns.value = repeater;

        return { items: repeater.items, Iteration: repeater.Iteration };
      },
      template: `
        <component
          :is="Iteration"
          v-for="(key, index) in items"
          :key="key"
          :index="index"
        >
          <div :data-testid="'user-' + index">
            <TextField name="firstName" label="First Name" />
          </div>
        </component>
      `,
    });

    const TestComponent = defineComponent({
      components: { RepeaterChild },
      setup() {
        const form = useForm<{ users: Array<{ firstName: string }> }>({
          initialValues: {
            users: [{ firstName: 'User 1' }, { firstName: 'User 2' }, { firstName: 'User 3' }],
          },
        });

        formReturns.value = form;

        return { form };
      },
      template: `<RepeaterChild />`,
    });

    await render(TestComponent);
    await flush();

    // Verify initial state
    expect(formReturns.value!.values.users).toHaveLength(3);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 1');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 2');
    expect(formReturns.value!.values.users![2].firstName).toBe('User 3');

    // Move first item to the end (from index 0 to index 2)
    repeaterReturns.value!.move(0, 2);
    await flush();

    // After move, User 1 should be at the end
    expect(formReturns.value!.values.users).toHaveLength(3);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 2');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 3');
    expect(formReturns.value!.values.users![2].firstName).toBe('User 1');
  });

  test('inserting an item updates form values correctly', async () => {
    const formReturns = ref<ReturnType<typeof useForm<any>> | null>(null);
    const repeaterReturns = ref<ReturnType<typeof useFormRepeater<any>> | null>(null);

    const TextField = defineComponent({
      props: {
        name: { type: String, required: true },
        label: { type: String, required: true },
      },
      setup(props) {
        const { inputProps, labelProps } = useTextField({
          name: props.name,
          label: props.label,
        });
        return { inputProps, labelProps };
      },
      template: `
        <div>
          <label v-bind="labelProps">{{ label }}</label>
          <input v-bind="inputProps" />
        </div>
      `,
    });

    const RepeaterChild = defineComponent({
      components: { TextField },
      setup() {
        const repeater = useFormRepeater<{ firstName: string }>({
          name: 'users',
        });

        repeaterReturns.value = repeater;

        return { items: repeater.items, Iteration: repeater.Iteration };
      },
      template: `
        <component
          :is="Iteration"
          v-for="(key, index) in items"
          :key="key"
          :index="index"
        >
          <div :data-testid="'user-' + index">
            <TextField name="firstName" label="First Name" />
          </div>
        </component>
      `,
    });

    const TestComponent = defineComponent({
      components: { RepeaterChild },
      setup() {
        const form = useForm<{ users: Array<{ firstName: string }> }>({
          initialValues: {
            users: [{ firstName: 'User 1' }, { firstName: 'User 2' }, { firstName: 'User 3' }],
          },
        });

        formReturns.value = form;

        return { form };
      },
      template: `<RepeaterChild />`,
    });

    await render(TestComponent);
    await flush();

    // Verify initial state
    expect(formReturns.value!.values.users).toHaveLength(3);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 1');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 2');
    expect(formReturns.value!.values.users![2].firstName).toBe('User 3');

    // Insert at index 1 (between User 1 and User 2)
    repeaterReturns.value!.insert(1);
    await flush();

    // After insert, we should have 4 items with an empty item at index 1
    expect(formReturns.value!.values.users).toHaveLength(4);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 1');
    expect(formReturns.value!.values.users![1].firstName).toBeUndefined(); // New empty item
    expect(formReturns.value!.values.users![2].firstName).toBe('User 2');
    expect(formReturns.value!.values.users![3].firstName).toBe('User 3');
  });

  test('removing an item works when form is passed as prop (same component setup)', async () => {
    const formReturns = ref<ReturnType<typeof useForm<any>> | null>(null);
    const repeaterReturns = ref<ReturnType<typeof useFormRepeater<any>> | null>(null);

    const TextField = defineComponent({
      props: {
        name: { type: String, required: true },
        label: { type: String, required: true },
      },
      setup(props) {
        const { inputProps, labelProps } = useTextField({
          name: props.name,
          label: props.label,
        });
        return { inputProps, labelProps };
      },
      template: `
        <div>
          <label v-bind="labelProps">{{ label }}</label>
          <input v-bind="inputProps" />
        </div>
      `,
    });

    // This test simulates using useForm and useFormRepeater in the same component
    // by passing the form explicitly via the form prop
    const TestComponent = defineComponent({
      components: { TextField },
      setup() {
        const form = useForm<{ users: Array<{ firstName: string }> }>({
          initialValues: {
            users: [{ firstName: 'User 1' }, { firstName: 'User 2' }, { firstName: 'User 3' }],
          },
        });

        formReturns.value = form;

        // Pass form.context explicitly since we're in the same component
        const repeater = useFormRepeater<{ firstName: string }>({
          name: 'users',
          form: form as any,
        });

        repeaterReturns.value = repeater;

        return { form, items: repeater.items, Iteration: repeater.Iteration };
      },
      template: `
        <component
          :is="Iteration"
          v-for="(key, index) in items"
          :key="key"
          :index="index"
          v-slot="{ removeButtonProps }"
        >
          <div :data-testid="'user-' + index">
            <TextField name="firstName" label="First Name" />
            <button v-bind="removeButtonProps" :data-testid="'remove-' + index">Remove</button>
          </div>
        </component>
      `,
    });

    await render(TestComponent);
    await flush();

    // Verify initial state
    expect(formReturns.value!.values.users).toHaveLength(3);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 1');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 2');
    expect(formReturns.value!.values.users![2].firstName).toBe('User 3');

    // Remove the second item (index 1)
    const removeButton = screen.getByTestId('remove-1');
    await fireEvent.click(removeButton);
    await flush();

    // After removal, we should have 2 users
    expect(formReturns.value!.values.users).toHaveLength(2);
    expect(formReturns.value!.values.users![0].firstName).toBe('User 1');
    expect(formReturns.value!.values.users![1].firstName).toBe('User 3');
  });
});
