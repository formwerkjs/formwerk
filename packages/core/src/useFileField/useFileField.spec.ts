import { FileFieldProps, useFileField } from './useFileField';
import { type Component } from 'vue';
import { SetOptional } from 'type-fest';
import { Arrayable } from '../types';
import { page } from 'vitest/browser';
import { dispatchEvent, expectNoA11yViolations, waitForTimeout, appRender } from '@test-utils/index';

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
      dropzoneProps,
      errorMessageProps,
      entries,
      clear,
      remove,
      isDragging,
      isTouched,
      fieldValue,
      errorMessage,
      isBlurred,
    } = useFileField({
      ...(props || {}),
      label,
    });

    return {
      inputProps,
      triggerProps,
      dropzoneProps,
      errorMessageProps,
      entries,
      clear,
      remove,
      isDragging,
      isTouched,
      fieldValue,
      errorMessage,
      label,
      printValue,
      isBlurred,
    };
  },
  template: `
    <div data-testid="fixture" :class="{ 'touched': isTouched, 'dragging': isDragging, 'blurred': isBlurred }">
      <div v-bind="dropzoneProps" data-testid="dropzone">
        <input v-bind="inputProps" data-testid="input" />
        <button v-bind="triggerProps">{{ label }}</button>
        <span v-bind="errorMessageProps" data-testid="error-message">{{ errorMessage }}</span>
        <div data-testid="entries">{{ entries.length }} files</div>
        <div data-testid="value">{{ printValue(fieldValue) }}</div>
      </div>
    </div>
  `,
});

async function setFiles(input: ReturnType<typeof page.getByTestId>, files: File[]) {
  const inputEl = (await input.element()) as HTMLInputElement;
  const dt = new DataTransfer();
  for (const f of files) dt.items.add(f);

  Object.defineProperty(inputEl, 'files', { value: dt.files, configurable: true });
  inputEl.dispatchEvent(new Event('change', { bubbles: true }));
}

async function dropFiles(dropzone: ReturnType<typeof page.getByTestId>, files: File[]) {
  const el = (await dropzone.element()) as HTMLElement;
  const dt = new DataTransfer();
  for (const f of files) dt.items.add(f);

  const e = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
  el.dispatchEvent(e);
}

async function dragEvent(dropzone: ReturnType<typeof page.getByTestId>, type: 'dragenter' | 'dragover' | 'dragleave') {
  const el = (await dropzone.element()) as HTMLElement;
  el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true }));
}

test('blur sets blurred to true', async () => {
  appRender(makeTest());
  const fixture = page.getByTestId('fixture');
  const input = page.getByTestId('input');

  await expect.element(fixture).not.toHaveClass(/blurred/);
  await dispatchEvent(input, 'blur');
  await expect.element(fixture).toHaveClass(/blurred/);
});

test('selecting a file sets touched to true', async () => {
  appRender(makeTest());

  const fixture = page.getByTestId('fixture');
  const input = page.getByTestId('input');

  await expect.element(fixture).not.toHaveClass(/touched/);
  const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
  await setFiles(input, [file]);

  await expect.element(fixture).toHaveClass(/touched/);
});

test('clicking the trigger button opens the file picker', async () => {
  appRender(makeTest());
  const showPickerMock = vi.fn();
  const input = page.getByTestId('input');
  const inputEl = (await input.element()) as HTMLInputElement;
  (inputEl as any).showPicker = showPickerMock;

  ((await page.getByText(label).element()) as HTMLElement).click();
  expect(showPickerMock).toHaveBeenCalled();
});

test('disabled state prevents file picker from opening', async () => {
  appRender(makeTest({ disabled: true }));
  const showPickerMock = vi.fn();
  const input = page.getByTestId('input');
  const inputEl = (await input.element()) as HTMLInputElement;
  (inputEl as any).showPicker = showPickerMock;

  ((await page.getByText(label).element()) as HTMLElement).click();
  expect(showPickerMock).not.toHaveBeenCalled();
});

test('selecting a file adds it to entries and updates value', async () => {
  appRender(makeTest());

  const input = page.getByTestId('input');
  const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
  await setFiles(input, [file]);

  await expect.element(page.getByTestId('entries')).toHaveTextContent('1 files');
  await expect.element(page.getByTestId('value')).toHaveTextContent('test.txt');
});

test('multiple files can be selected when multiple is true', async () => {
  appRender(makeTest({ multiple: true }));

  const input = page.getByTestId('input');
  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });

  await setFiles(input, [file1, file2]);
  await expect.element(page.getByTestId('entries')).toHaveTextContent('2 files');
});

test('only one file is kept when multiple is false', async () => {
  appRender(makeTest({ multiple: false }));

  const input = page.getByTestId('input');
  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });

  await setFiles(input, [file1, file2]);
  await expect.element(page.getByTestId('entries')).toHaveTextContent('1 files');
});

test('drag and drop adds files (multiple=true)', async () => {
  appRender(makeTest({ multiple: true }));

  const dropzone = page.getByTestId('dropzone');
  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });

  await dropFiles(dropzone, [file1, file2]);
  await expect.element(page.getByTestId('entries')).toHaveTextContent('2 files');
});

test('should not have a11y errors', async () => {
  appRender(makeTest());
  await expectNoA11yViolations('[data-testid="fixture"]');
});

test('clear method removes all entries', async () => {
  appRender({
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

  const input = page.getByTestId('input');
  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });

  await setFiles(input, [file1, file2]);
  await expect.element(page.getByTestId('entries')).toHaveTextContent('2 files');

  ((await page.getByTestId('clear-btn').element()) as HTMLElement).click();
  await expect.element(page.getByTestId('entries')).toHaveTextContent('0 files');
});

test('remove removes a specific entry', async () => {
  appRender({
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

  const input = page.getByTestId('input');
  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });

  await setFiles(input, [file1, file2]);
  await expect.element(page.getByTestId('entries')).toHaveTextContent('2 files');

  await page.getByTestId('remove-btn').click();
  await expect.element(page.getByTestId('entries')).toHaveTextContent('1 files');
  await expect.element(page.getByTestId('value')).toHaveTextContent('test2.txt');
});

test('remove removes the last entry when no key is provided', async () => {
  appRender({
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

  const input = page.getByTestId('input');
  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });

  await setFiles(input, [file1, file2]);
  await expect.element(page.getByTestId('entries')).toHaveTextContent('2 files');

  await page.getByTestId('remove-btn').click();
  await expect.element(page.getByTestId('entries')).toHaveTextContent('1 files');
});

test('drag and drop functionality updates isDragging state', async () => {
  appRender(makeTest());

  const fixture = page.getByTestId('fixture');
  const dropzone = page.getByTestId('dropzone');

  await expect.element(fixture).not.toHaveClass(/dragging/);
  await dragEvent(dropzone, 'dragover');
  await dragEvent(dropzone, 'dragenter');
  await expect.element(fixture).toHaveClass(/dragging/);

  await dragEvent(dropzone, 'dragleave');
  await expect.element(fixture).not.toHaveClass(/dragging/);
});

test('isDragging state resets to false after drop event', async () => {
  appRender(makeTest({ multiple: true }));

  const dropzone = page.getByTestId('dropzone');
  const fixture = page.getByTestId('fixture');

  await expect.element(fixture).not.toHaveClass(/dragging/);

  await dragEvent(dropzone, 'dragenter');
  await dragEvent(dropzone, 'dragover');
  await expect.element(fixture).toHaveClass(/dragging/);

  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });
  await dropFiles(dropzone, [file1, file2]);

  await expect.element(fixture).not.toHaveClass(/dragging/);
  await expect.element(page.getByTestId('entries')).toHaveTextContent('2 files');
});

test('isDragging state transitions correctly during drag sequence', async () => {
  appRender(makeTest({ multiple: true }));

  const dropzone = page.getByTestId('dropzone');
  const fixture = page.getByTestId('fixture');

  await expect.element(fixture).not.toHaveClass(/dragging/);

  // dragenter alone should not set dragging
  await dragEvent(dropzone, 'dragenter');
  await expect.element(fixture).not.toHaveClass(/dragging/);

  // dragover should set dragging
  await dragEvent(dropzone, 'dragover');
  await expect.element(fixture).toHaveClass(/dragging/);

  // dragleave resets
  await dragEvent(dropzone, 'dragleave');
  await expect.element(fixture).not.toHaveClass(/dragging/);

  // Start again and drop resets
  await dragEvent(dropzone, 'dragover');
  await expect.element(fixture).toHaveClass(/dragging/);

  const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
  await dropFiles(dropzone, [file]);
  await expect.element(fixture).not.toHaveClass(/dragging/);
});

test('aborting an upload when removing an entry', async () => {
  const abortMock = vi.fn();
  const uploadPromise = new Promise<string>(() => {});

  const onUploadMock = vi.fn().mockImplementation(({ signal }) => {
    signal.addEventListener('abort', abortMock);
    return uploadPromise;
  });

  appRender({
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

  const input = page.getByTestId('input');
  const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
  await setFiles(input, [file]);

  await expect.element(page.getByTestId('entries')).toHaveTextContent('1 files');
  await expect.element(page.getByTestId('uploading')).toHaveTextContent('1 uploading');
  expect(onUploadMock).toHaveBeenCalledTimes(1);

  await page.getByTestId('remove-btn').click();
  await expect.poll(() => abortMock).toHaveBeenCalledTimes(1);
  await expect.element(page.getByTestId('entries')).toHaveTextContent('0 files');
  await expect.element(page.getByTestId('uploading')).toHaveTextContent('0 uploading');
});

test('aborting all uploads when clearing entries', async () => {
  const abortMock1 = vi.fn();
  const abortMock2 = vi.fn();

  const onUploadMock = vi.fn().mockImplementation(({ signal, key }) => {
    if (String(key).endsWith('0')) {
      signal.addEventListener('abort', abortMock1);
    } else {
      signal.addEventListener('abort', abortMock2);
    }

    return new Promise<string>(() => {});
  });

  appRender({
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

  const input = page.getByTestId('input');
  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });
  await setFiles(input, [file1, file2]);
  await expect.poll(() => page.getByTestId('entries')).toHaveTextContent('2 files');
  await expect.poll(() => page.getByTestId('uploading')).toHaveTextContent('2 uploading');
  await expect.poll(() => onUploadMock).toHaveBeenCalledTimes(2);

  await page.getByTestId('clear-btn').click();
  await expect.poll(() => abortMock1).toHaveBeenCalledTimes(1);
  await expect.poll(() => abortMock2).toHaveBeenCalledTimes(1);
  await expect.element(page.getByTestId('entries')).toHaveTextContent('0 files');
  await expect.element(page.getByTestId('uploading')).toHaveTextContent('0 uploading');
});

test('onUpload callback is called when provided', async () => {
  const onUploadMock = vi.fn().mockImplementation(({ file }) => {
    return Promise.resolve(`uploaded-${(file as File).name}`);
  });

  appRender(makeTest({ onUpload: onUploadMock }));

  const input = page.getByTestId('input');
  const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
  await setFiles(input, [file]);

  await expect.poll(() => onUploadMock).toHaveBeenCalledTimes(1);
  await expect.poll(() => onUploadMock.mock.calls[0][0].file).toBe(file);
  await expect.element(page.getByTestId('value')).toHaveTextContent('uploaded-test.txt');
});

test('validation works with required attribute', async () => {
  appRender(makeTest({ required: true }));

  const input = page.getByTestId('input');
  await dispatchEvent(input, 'invalid');
  await expect.element(page.getByTestId('error-message')).toHaveTextContent(/.+/);
  await expectNoA11yViolations('[data-testid="fixture"]');
});

test('nested FileEntry components can access the FileEntryCollection', async () => {
  const { FileEntry } = await import('./useFileEntry');

  appRender({
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
            <template #default="{ removeButtonProps }">
              <div>
                <span>{{ entry.file.name }}</span>
                <button v-bind="removeButtonProps" data-testid="entry-remove-btn">Remove</button>
              </div>
            </template>
          </FileEntry>
        </div>
      </div>
    `,
  });

  const input = page.getByTestId('input');
  const file1 = new File(['test content 1'], 'test1.txt', { type: 'text/plain' });
  const file2 = new File(['test content 2'], 'test2.txt', { type: 'text/plain' });
  await setFiles(input, [file1, file2]);

  await expect.element(page.getByTestId('entries')).toHaveTextContent('2 files');
  await expect.poll(() => document.querySelectorAll('[data-testid="file-entry"]').length).toBe(2);
  await expect.element(page.getByText('test1.txt')).toBeInTheDocument();
  await expect.element(page.getByText('test2.txt')).toBeInTheDocument();

  await page.getByTestId('entry-remove-btn').nth(0).click();

  await expect.element(page.getByTestId('entries')).toHaveTextContent('1 files');
  await expect.poll(() => document.querySelectorAll('[data-testid="file-entry"]').length).toBe(1);
  await expect.poll(() => document.body.textContent).not.toContain('test1.txt');
  await expect.element(page.getByText('test2.txt')).toBeInTheDocument();
});

test('FileEntry components can display upload status', async () => {
  const { FileEntry } = await import('./useFileEntry');

  const onUploadMock = vi.fn().mockImplementation(({ file }) => {
    return new Promise<string>(resolve => {
      setTimeout(() => resolve(`uploaded-${(file as File).name}`), 100);
    });
  });

  appRender({
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

  const input = page.getByTestId('input');
  const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
  await setFiles(input, [file]);

  await expect.element(page.getByTestId('entries')).toHaveTextContent('1 files');
  await expect.element(page.getByTestId('uploading-indicator')).toBeInTheDocument();
  await expect.element(page.getByTestId('uploaded-indicator')).not.toBeInTheDocument();

  await waitForTimeout(200);

  await expect.element(page.getByTestId('uploading-indicator')).not.toBeInTheDocument();
  await expect.element(page.getByTestId('uploaded-indicator')).toBeInTheDocument();
});

test('FileEntry components create and revoke object URLs for previews', async () => {
  const { FileEntry } = await import('./useFileEntry');

  const createSpy = vi.spyOn(URL, 'createObjectURL');
  const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

  const { unmount } = appRender({
    components: { FileEntry },
    setup() {
      const { inputProps, entries } = useFileField({
        label,
        multiple: true,
      });

      return {
        inputProps,
        entries,
        label,
      };
    },
    template: `
      <div data-testid="fixture">
        <label :for="inputProps.id">{{ label }}</label>
        <input v-bind="inputProps" data-testid="input" />
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

  const input = page.getByTestId('input');
  const imageFile = new File(['image content'], 'image.jpg', { type: 'image/jpeg' });
  const videoFile = new File(['video content'], 'video.mp4', { type: 'video/mp4' });
  await setFiles(input, [imageFile, videoFile]);

  await expect.poll(() => createSpy).toHaveBeenCalledTimes(2);
  await expect.poll(() => createSpy).toHaveBeenCalledWith(imageFile);
  await expect.poll(() => createSpy).toHaveBeenCalledWith(videoFile);

  await expect.poll(() => document.querySelectorAll('[data-testid="preview-element"]').length).toBe(2);
  const previewElements = Array.from(document.querySelectorAll('[data-testid="preview-element"]')) as HTMLElement[];
  expect(previewElements[0]?.tagName.toLowerCase()).toBe('img');
  expect(previewElements[1]?.tagName.toLowerCase()).toBe('video');

  // Remove one entry to trigger cleanup.
  ((await page.getByTestId('entry-remove-btn').nth(0).element()) as HTMLElement).click();
  unmount();

  await expect.poll(() => revokeSpy).toHaveBeenCalled();
});
