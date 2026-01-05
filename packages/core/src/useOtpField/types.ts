import { InjectionKey } from 'vue';

export type OtpCellAcceptType = 'all' | 'numeric' | 'alphanumeric';

export interface OtpCellRegistration {
  id: string;
  focusNext(): void;
  focusPrevious(): void;
  setValue(value: string, event: Event): void;
  handlePaste(event: ClipboardEvent): void;
  isLast(): boolean;
}

export interface OtpContext {
  useCellRegistration(): OtpCellRegistration;
  getMaskCharacter(): string;
  onBlur(): void;
}

export const OtpContextKey: InjectionKey<OtpContext> = Symbol('otp-context');
