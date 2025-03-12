import { InjectionKey } from 'vue';

export interface FileEntryCollection {
  removeEntry: (id: string) => void;
  isDisabled: () => boolean;
}

export const FileEntryCollectionKey: InjectionKey<FileEntryCollection> = Symbol('FileEntryCollection');
