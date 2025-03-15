import { fireEvent, render, screen } from '@testing-library/vue';
import { axe } from 'vitest-axe';
import { FileFieldProps, useFileField } from './useFileField';
import { flush } from '@test-utils/index';
import { type Component } from 'vue';
import { SetOptional } from 'type-fest';
import { Arrayable } from '../types';
import { beforeAll, afterAll } from 'vitest';

// Mock URL.createObjectURL and URL.revokeObjectURL since they're not available in Node.js
const originalURL = global.URL;
beforeAll(() => {
  // Create a mock implementation for URL.createObjectURL
  global.URL.createObjectURL = vi.fn(blob => {
    return `mock-url-for-${blob instanceof File ? blob.name : 'blob'}`;
  });

  // Create a mock implementation for URL.revokeObjectURL
  global.URL.revokeObjectURL = vi.fn();
});

afterAll(() => {
  // Restore the original URL object after tests
  global.URL = originalURL;
});

const label = 'Upload File';

function printValue(fieldValue: Arrayable<File | string | undefined>) {
  const printer = (val: File | string | undefined) => (typeof val === 'string' ? val : val?.name);

  if (Array.isArray(fieldValue)) {
    return fieldValue.map(printer).join(', ');
  }

  return printer(fieldValue);
}

const makeTest = (props?: SetOptional<FileFieldProps, 'label'>): Component => ({
  setup() {
    const {
      inputProps,
      triggerProps,
      groupProps,
      errorMessageProps,
      entries,
      clear,
      remove,
      isDragging,
      validityDetails,
      isTouched,
      fieldValue,
      errorMessage,
    } = useFileField({
      ...(props || {}),
      label,
    });

    return {
      inputProps,
      triggerProps,
      groupProps,
      errorMessageProps,
      entries,
      clear,
      remove,
      isDragging,
      validityDetails,
      isTouched,
      fieldValue,
      errorMessage,
      label,
      printValue,
    };
  },
  template: `
    <div data-testid="fixture" :class="{ 'touched': isTouched, 'dragging': isDragging }">
      <div v-bind="groupProps">
        <input v-bind="inputProps" data-testid="input" />
        <button v-bind="triggerProps">{{ label }}</button>
        <span v-bind="errorMessageProps">{{ errorMessage }}</span>
        <div data-testid="entries">{{ entries.length }} files</div>
        <div data-testid="value">{{ printValue(fieldValue) }}</div>
      </div>
    </div>
  `,
});

test('should not have a11y errors', async () => {
  await render(makeTest());
  vi.useRealTimers();
  expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
  vi.useFakeTimers();
});

test('blur sets touched to true', async () => {
  await render(makeTest());
  expect(screen.getByTestId('fixture').className).not.includes('touched');
  await fireEvent.blur(screen.getByTestId('input'));
  expect(screen.getByTestId('fixture').className).includes('touched');
});

test('clicking the trigger button opens the file picker', async () => {
  await render(makeTest());
  const showPickerMock = vi.fn();
  const input = screen.getByTestId('input') as HTMLInputElement;
  input.showPicker = showPickerMock;

  await fireEvent.click(screen.getByText(label));
  expect(showPickerMock).toHaveBeenCalled();
});

test('disabled state prevents file picker from opening', async () => {
  await render(makeTest({ disabled: true }));
  const showPickerMock = vi.fn();
  const input = screen.getByTestId('input') as HTMLInputElement;
  input.showPicker = showPickerMock;

  await fireEvent.click(screen.getByText(label));
  expect(showPickerMock).not.toHaveBeenCalled();
});

test('selecting a file adds it to entries and updates value', async () => {
  await render(makeTest());

  const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
  await fireEvent.change(screen.getByTestId('input'), {
    target: {
      files: [file],
    },
  });

  await flush();
  expect(screen.getByTestId('entries')).toHaveTextContent('1 files');
  expect(screen.getByTestId('value')).toHaveTextContent('test.txt');
});

test('multiple files can be selected when multiple is true', async () => {
  await render(makeTest({ multiple: true }));

  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });

  await fireEvent.change(screen.getByTestId('input'), {
    target: {
      files: [file1, file2],
    },
  });

  await flush();
  expect(screen.getByTestId('entries')).toHaveTextContent('2 files');
});

test('only one file is kept when multiple is false', async () => {
  await render(makeTest({ multiple: false }));

  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });

  await fireEvent.change(screen.getByTestId('input'), {
    target: {
      files: [file1, file2],
    },
  });

  await flush();
  expect(screen.getByTestId('entries')).toHaveTextContent('1 files');
});

test('clear method removes all entries', async () => {
  await render({
    setup() {
      const { inputProps, entries, clear, fieldValue } = useFileField({
        label,
        multiple: true,
      });

      return {
        inputProps,
        entries,
        clear,
        fieldValue,
        label,
      };
    },
    template: `
      <div data-testid="fixture">
        <label :for="inputProps.id">{{ label }}</label>
        <input v-bind="inputProps" data-testid="input" />
        <button data-testid="clear-btn" @click="clear">Clear</button>
        <div data-testid="entries">{{ entries.length }} files</div>
        <div data-testid="value">{{ JSON.stringify(fieldValue) }}</div>
      </div>
    `,
  });

  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });

  await fireEvent.change(screen.getByTestId('input'), {
    target: {
      files: [file1, file2],
    },
  });

  await flush();
  expect(screen.getByTestId('entries')).toHaveTextContent('2 files');

  await fireEvent.click(screen.getByTestId('clear-btn'));
  await flush();
  expect(screen.getByTestId('entries')).toHaveTextContent('0 files');
});

test('remove removes a specific entry', async () => {
  await render({
    setup() {
      const { inputProps, entries, remove, fieldValue } = useFileField({
        label,
        multiple: true,
      });

      return {
        inputProps,
        entries,
        remove,
        fieldValue,
        label,
        printValue,
      };
    },
    template: `
      <div data-testid="fixture">
        <label :for="inputProps.id">{{ label }}</label>
        <input v-bind="inputProps" data-testid="input" />
        <button data-testid="remove-btn" @click="remove(entries[0]?.id)">Remove First</button>
        <div data-testid="entries">{{ entries.length }} files</div>
        <div data-testid="value">{{ printValue(fieldValue) }}</div>
      </div>
    `,
  });

  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });

  await fireEvent.change(screen.getByTestId('input'), {
    target: {
      files: [file1, file2],
    },
  });

  await flush();
  expect(screen.getByTestId('entries')).toHaveTextContent('2 files');

  await fireEvent.click(screen.getByTestId('remove-btn'));
  await flush();
  expect(screen.getByTestId('entries')).toHaveTextContent('1 files');
  expect(screen.getByTestId('value')).toHaveTextContent('test2.txt');
});

test('remove removes a the last entry when no key is provided', async () => {
  await render({
    setup() {
      const { inputProps, entries, remove, fieldValue } = useFileField({
        label,
        multiple: true,
      });

      return {
        inputProps,
        entries,
        remove,
        fieldValue,
        label,
      };
    },
    template: `
      <div data-testid="fixture">
        <label :for="inputProps.id">{{ label }}</label>
        <input v-bind="inputProps" data-testid="input" />
        <button data-testid="remove-btn" @click="() => remove()">Remove Last</button>
        <div data-testid="entries">{{ entries.length }} files</div>
        <div data-testid="value">{{ JSON.stringify(fieldValue) }}</div>
      </div>
    `,
  });

  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });

  await fireEvent.change(screen.getByTestId('input'), {
    target: {
      files: [file1, file2],
    },
  });

  await flush();
  expect(screen.getByTestId('entries')).toHaveTextContent('2 files');

  await fireEvent.click(screen.getByTestId('remove-btn'));
  await flush();
  expect(screen.getByTestId('entries')).toHaveTextContent('1 files');
});

test('drag and drop functionality updates isDragging state', async () => {
  await render(makeTest());

  expect(screen.getByTestId('fixture').className).not.includes('dragging');

  const dropzone = screen.getByTestId('fixture').firstChild as HTMLElement;
  await fireEvent.dragOver(dropzone);
  await fireEvent.dragEnter(dropzone);
  expect(screen.getByTestId('fixture').className).includes('dragging');

  await fireEvent.dragLeave(dropzone);
  expect(screen.getByTestId('fixture').className).not.includes('dragging');
});

test('dropping files adds them to entries', async () => {
  await render(makeTest({ multiple: true }));

  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });

  const dropzone = screen.getByTestId('fixture').firstChild as HTMLElement;
  await fireEvent.drop(dropzone, {
    dataTransfer: {
      files: [file1, file2],
    },
  });

  await flush();
  expect(screen.getByTestId('entries')).toHaveTextContent('2 files');
});

test('aborting an upload when removing an entry', async () => {
  // Create a mock upload function that returns a promise that never resolves
  // This simulates a long-running upload
  const abortMock = vi.fn();
  const uploadPromise = new Promise<string>(() => {
    // This promise intentionally never resolves to simulate an ongoing upload
  });

  const onUploadMock = vi.fn().mockImplementation(({ signal }) => {
    // Add an abort listener to the signal
    signal.addEventListener('abort', abortMock);
    return uploadPromise;
  });

  await render({
    setup() {
      const { inputProps, entries, remove, fieldValue } = useFileField({
        label,
        multiple: true,
        onUpload: onUploadMock,
      });

      return {
        inputProps,
        entries,
        remove,
        fieldValue,
        label,
        printValue,
      };
    },
    template: `
      <div data-testid="fixture">
        <label :for="inputProps.id">{{ label }}</label>
        <input v-bind="inputProps" data-testid="input" />
        <button data-testid="remove-btn" @click="remove(entries[0]?.id)">Remove First</button>
        <div data-testid="entries">{{ entries.length }} files</div>
        <div data-testid="value">{{ printValue(fieldValue) }}</div>
        <div data-testid="uploading">{{ entries.filter(e => e.isUploading).length }} uploading</div>
      </div>
    `,
  });

  const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
  await fireEvent.change(screen.getByTestId('input'), {
    target: {
      files: [file],
    },
  });

  await flush();
  expect(screen.getByTestId('entries')).toHaveTextContent('1 files');
  expect(screen.getByTestId('uploading')).toHaveTextContent('1 uploading');
  expect(onUploadMock).toHaveBeenCalledTimes(1);

  // Remove the entry, which should abort the upload
  await fireEvent.click(screen.getByTestId('remove-btn'));
  await flush();

  // Check that the abort was called
  expect(abortMock).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('entries')).toHaveTextContent('0 files');
  expect(screen.getByTestId('uploading')).toHaveTextContent('0 uploading');
});

test('aborting all uploads when clearing entries', async () => {
  // Create mock abort handlers for multiple uploads
  const abortMock1 = vi.fn();
  const abortMock2 = vi.fn();

  // Mock upload function that captures abort signals
  const onUploadMock = vi.fn().mockImplementation(({ signal, key }) => {
    // Add different abort listeners based on the file
    if (key.endsWith('0')) {
      signal.addEventListener('abort', abortMock1);
    } else {
      signal.addEventListener('abort', abortMock2);
    }

    // Return a promise that never resolves to simulate ongoing uploads
    return new Promise<string>(() => {});
  });

  await render({
    setup() {
      const { inputProps, entries, clear, fieldValue } = useFileField({
        label,
        multiple: true,
        onUpload: onUploadMock,
      });

      return {
        inputProps,
        entries,
        clear,
        fieldValue,
        label,
        printValue,
      };
    },
    template: `
      <div data-testid="fixture">
        <label :for="inputProps.id">{{ label }}</label>
        <input v-bind="inputProps" data-testid="input" />
        <button data-testid="clear-btn" @click="clear">Clear All</button>
        <div data-testid="entries">{{ entries.length }} files</div>
        <div data-testid="value">{{ printValue(fieldValue) }}</div>
        <div data-testid="uploading">{{ entries.filter(e => e.isUploading).length }} uploading</div>
      </div>
    `,
  });

  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });

  await fireEvent.change(screen.getByTestId('input'), {
    target: {
      files: [file1, file2],
    },
  });

  await flush();
  expect(screen.getByTestId('entries')).toHaveTextContent('2 files');
  expect(screen.getByTestId('uploading')).toHaveTextContent('2 uploading');
  expect(onUploadMock).toHaveBeenCalledTimes(2);

  // Clear all entries, which should abort all uploads
  await fireEvent.click(screen.getByTestId('clear-btn'));
  await flush();

  // Check that both aborts were called
  expect(abortMock1).toHaveBeenCalledTimes(1);
  expect(abortMock2).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('entries')).toHaveTextContent('0 files');
  expect(screen.getByTestId('uploading')).toHaveTextContent('0 uploading');
});

test('onUpload callback is called when provided', async () => {
  const onUploadMock = vi.fn().mockImplementation(({ file }) => {
    return Promise.resolve(`uploaded-${file.name}`);
  });

  await render(makeTest({ onUpload: onUploadMock }));

  const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
  await fireEvent.change(screen.getByTestId('input'), {
    target: {
      files: [file],
    },
  });

  await flush();
  expect(onUploadMock).toHaveBeenCalledTimes(1);
  expect(onUploadMock.mock.calls[0][0].file).toBe(file);
  expect(screen.getByTestId('value')).toHaveTextContent('uploaded-test.txt');
});

test('validation works with required attribute', async () => {
  await render(makeTest({ required: true }));

  screen.debug();
  await flush();
  await fireEvent.blur(screen.getByText(label));
  expect(screen.getByText(label)).toHaveErrorMessage('Constraints not satisfied');

  vi.useRealTimers();
  expect(await axe(screen.getByTestId('fixture'))).toHaveNoViolations();
  vi.useFakeTimers();
});

test('nested FileEntry components can access the FileEntryCollection', async () => {
  // Import the necessary components
  const { FileEntry } = await import('./useFileEntry');

  // Create a component that uses FileEntry components within useFileField
  await render({
    components: { FileEntry },
    setup() {
      const { inputProps, entries, fieldValue } = useFileField({
        label,
        multiple: true,
      });

      return {
        inputProps,
        entries,
        fieldValue,
        label,
      };
    },
    template: `
      <div data-testid="fixture">
        <label :for="inputProps.id">{{ label }}</label>
        <input v-bind="inputProps" data-testid="input" />
        <div data-testid="entries">{{ entries.length }} files</div>
        <div data-testid="value">{{ JSON.stringify(fieldValue) }}</div>
        <div data-testid="file-entries">
          <FileEntry
            v-for="entry in entries"
            :key="entry.id"
            :id="entry.id"
            :file="entry.file"
            :isUploading="entry.isUploading"
            :uploadResult="entry.uploadResult"
            data-testid="file-entry"
          >
            <template #default="{ remove, isUploading, removeButtonProps }">
              <div>
                <span>{{ entry.file.name }}</span>
                <span v-if="isUploading">Uploading...</span>
                <button
                  v-bind="removeButtonProps"
                  data-testid="entry-remove-btn"
                >
                  Remove
                </button>
              </div>
            </template>
          </FileEntry>
        </div>
      </div>
    `,
  });

  // Add some files
  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });

  await fireEvent.change(screen.getByTestId('input'), {
    target: {
      files: [file1, file2],
    },
  });

  await flush();

  // Verify that the FileEntry components are rendered
  expect(screen.getByTestId('entries')).toHaveTextContent('2 files');
  expect(screen.getAllByTestId('file-entry')).toHaveLength(2);
  expect(screen.getByText('test1.txt')).toBeInTheDocument();
  expect(screen.getByText('test2.txt')).toBeInTheDocument();

  // Test that the remove button in the FileEntry works
  await fireEvent.click(screen.getAllByTestId('entry-remove-btn')[0]);
  await flush();

  // Verify that the entry was removed
  expect(screen.getByTestId('entries')).toHaveTextContent('1 files');
  expect(screen.getAllByTestId('file-entry')).toHaveLength(1);
  expect(screen.queryByText('test1.txt')).not.toBeInTheDocument();
  expect(screen.getByText('test2.txt')).toBeInTheDocument();
});

test('FileEntry components can display upload status', async () => {
  // Import the necessary components
  const { FileEntry } = await import('./useFileEntry');

  // Create a mock upload function that returns a delayed promise
  const onUploadMock = vi.fn().mockImplementation(({ file }) => {
    // Return a promise that resolves after a delay
    return new Promise<string>(resolve => {
      setTimeout(() => {
        resolve(`uploaded-${file.name}`);
      }, 100);
    });
  });

  await render({
    components: { FileEntry },
    setup() {
      const { inputProps, entries, fieldValue } = useFileField({
        label,
        multiple: true,
        onUpload: onUploadMock,
      });

      return {
        inputProps,
        entries,
        fieldValue,
        label,
      };
    },
    template: `
      <div data-testid="fixture">
        <label :for="inputProps.id">{{ label }}</label>
        <input v-bind="inputProps" data-testid="input" />
        <div data-testid="entries">{{ entries.length }} files</div>
        <div data-testid="value">{{ JSON.stringify(fieldValue) }}</div>
        <div data-testid="file-entries">
          <FileEntry
            v-for="entry in entries"
            :key="entry.id"
            :id="entry.id"
            :file="entry.file"
            :isUploading="entry.isUploading"
            :uploadResult="entry.uploadResult"
            data-testid="file-entry"
          >
            <template #default="{ isUploading, isUploaded, removeButtonProps }">
              <div>
                <span>{{ entry.file.name }}</span>
                <span v-if="isUploading" data-testid="uploading-indicator">Uploading...</span>
                <span v-if="isUploaded" data-testid="uploaded-indicator">Uploaded!</span>
                <button v-bind="removeButtonProps" data-testid="entry-remove-btn">Remove</button>
              </div>
            </template>
          </FileEntry>
        </div>
      </div>
    `,
  });

  // Add a file
  const file = new File(['test content'], 'test.txt', { type: 'text/plain' });

  await fireEvent.change(screen.getByTestId('input'), {
    target: {
      files: [file],
    },
  });

  await flush();

  // Verify that the FileEntry component shows uploading status
  expect(screen.getByTestId('entries')).toHaveTextContent('1 files');
  expect(screen.getByTestId('uploading-indicator')).toBeInTheDocument();
  expect(screen.queryByTestId('uploaded-indicator')).not.toBeInTheDocument();

  // Fast-forward time to complete the upload
  vi.advanceTimersByTime(200);
  await flush();

  // Verify that the FileEntry component shows uploaded status
  expect(screen.queryByTestId('uploading-indicator')).not.toBeInTheDocument();
  expect(screen.getByTestId('uploaded-indicator')).toBeInTheDocument();
});

test('FileEntry components create and revoke object URLs for previews', async () => {
  // Import the necessary components
  const { FileEntry } = await import('./useFileEntry');

  // Reset mock counters
  vi.clearAllMocks();

  // Create a component that uses FileEntry components with preview
  const { unmount } = await render({
    components: { FileEntry },
    setup() {
      const { inputProps, entries, fieldValue } = useFileField({
        label,
        multiple: true,
      });

      return {
        inputProps,
        entries,
        fieldValue,
        label,
      };
    },
    template: `
      <div data-testid="fixture">
        <label :for="inputProps.id">{{ label }}</label>
        <input v-bind="inputProps" data-testid="input" />
        <div data-testid="entries">{{ entries.length }} files</div>
        <div data-testid="file-entries">
          <FileEntry
            v-for="entry in entries"
            :key="entry.id"
            :id="entry.id"
            :file="entry.file"
            :isUploading="entry.isUploading"
            :uploadResult="entry.uploadResult"
            data-testid="file-entry"
          >
            <template #default="{ previewProps, removeButtonProps }">
              <div>
                <span>{{ entry.file.name }}</span>
                <div v-if="previewProps.as" data-testid="preview-container">
                  <component :is="previewProps.as" v-bind="previewProps" data-testid="preview-element" />
                </div>
                <button v-bind="removeButtonProps" data-testid="entry-remove-btn">Remove</button>
              </div>
            </template>
          </FileEntry>
        </div>
      </div>
    `,
  });

  // Add image files to test preview
  const imageFile = new File(['image content'], 'image.jpg', { type: 'image/jpeg' });
  const videoFile = new File(['video content'], 'video.mp4', { type: 'video/mp4' });

  await fireEvent.change(screen.getByTestId('input'), {
    target: {
      files: [imageFile, videoFile],
    },
  });

  await flush();

  // Verify that createObjectURL was called for each file
  expect(global.URL.createObjectURL).toHaveBeenCalledTimes(2);
  expect(global.URL.createObjectURL).toHaveBeenCalledWith(imageFile);
  expect(global.URL.createObjectURL).toHaveBeenCalledWith(videoFile);

  // Verify that the preview elements were created with the correct type
  const previewElements = screen.getAllByTestId('preview-element');
  expect(previewElements).toHaveLength(2);
  expect(previewElements[0].tagName.toLowerCase()).toBe('img');
  expect(previewElements[1].tagName.toLowerCase()).toBe('video');

  // Verify that the src attributes contain the mock URLs
  expect(previewElements[0]).toHaveAttribute('src', `mock-url-for-${imageFile.name}`);
  expect(previewElements[1]).toHaveAttribute('src', `mock-url-for-${videoFile.name}`);

  // Remove one entry and check if revokeObjectURL is called
  await fireEvent.click(screen.getAllByTestId('entry-remove-btn')[0]);
  await flush();

  // Unmount the component to trigger cleanup
  unmount();

  // Verify that revokeObjectURL was called to clean up the URLs
  expect(global.URL.revokeObjectURL).toHaveBeenCalled();
});
