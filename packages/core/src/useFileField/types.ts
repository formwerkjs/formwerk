import { InjectionKey } from 'vue';

export interface FileEntryCollection {
  removeEntry: (id: string) => void;
  isDisabled: () => boolean;
  getRemoveButtonLabel: () => string;
}

export const FileEntryCollectionKey: InjectionKey<FileEntryCollection> = Symbol('FileEntryCollection');
