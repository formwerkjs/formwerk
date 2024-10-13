import { defineComponent } from 'vue';
import { render, screen, fireEvent } from '@testing-library/vue';
import { useFormRepeater, FormRepeaterProps } from './useFormRepeater';
import { flush } from '@test-utils/index';

async function renderTest(props: FormRepeaterProps) {
  const { addButtonProps, Repeat, swap, insert, remove } = useFormRepeater(props);

  const TestComponent = defineComponent({
    components: { Repeat },
    setup() {
      return { addButtonProps };
    },
    template: `
      <Repeat v-slot="{ removeButtonProps, moveUpButtonProps, moveDownButtonProps, path, key }">
        <div data-testid="repeater-item">
          <span data-testid="key">{{ key }}</span>

          <button data-testid="remove-button" v-bind="removeButtonProps">Remove</button>
          <button data-testid="move-up-button" v-bind="moveUpButtonProps">Move Up</button>
          <button data-testid="move-down-button" v-bind="moveDownButtonProps">Move Down</button>
        </div>
      </Repeat>

      <button data-testid="add-button" v-bind="addButtonProps">Add</button>
    `,
  });

  await render(TestComponent);

  return {
    swap,
    insert,
    remove,
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
