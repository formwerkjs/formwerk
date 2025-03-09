import { InjectionKey } from 'vue';

export type OtpSlotAcceptType = 'all' | 'numeric' | 'alphanumeric';

export interface OtpSlotRegistration {
  id: string;
  focusNext(): void;
  focusPrevious(): void;
  setValue(value: string): void;
}

export interface OtpContext {
  useSlotRegistration(slot: { focus: () => void }): OtpSlotRegistration;
}

export const OtpContextKey: InjectionKey<OtpContext> = Symbol('otp-context');
