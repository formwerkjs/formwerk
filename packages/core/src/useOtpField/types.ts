import { InjectionKey } from 'vue';

export type OtpSlotAcceptType = 'all' | 'numeric' | 'alphanumeric';

export interface OtpSlotRegistration {
  id: string;
  focusNext(): void;
  focusPrevious(): void;
  setValue(value: string, event: Event): void;
  handlePaste(event: ClipboardEvent): void;
  isLast(): boolean;
}

export interface OtpContext {
  useSlotRegistration(): OtpSlotRegistration;
  getMaskCharacter(): string;
  onBlur(): void;
}

export const OtpContextKey: InjectionKey<OtpContext> = Symbol('otp-context');
