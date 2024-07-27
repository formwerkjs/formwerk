import { InjectionKey, nextTick, provide } from 'vue';
import { FormObject, Path, PathValue } from '../types';
import { FormContext } from './formContext';

interface SetFieldValueTransaction<TForm extends FormObject> {
  kind: 'sp';
  path: Path<TForm>;
  value: PathValue<TForm, Path<TForm>>;
}

interface UnsetFieldValueTransaction<TForm extends FormObject> {
  kind: 'up';
  path: Path<TForm>;
}

interface DestroyFieldValueTransaction<TForm extends FormObject> {
  kind: 'dp';
  path: Path<TForm>;
}

export type FormTransaction<TForm extends FormObject> =
  | SetFieldValueTransaction<TForm>
  | UnsetFieldValueTransaction<TForm>
  | DestroyFieldValueTransaction<TForm>;

export interface FormTransactionManager<TForm extends FormObject> {
  transaction(
    tr: (
      formCtx: Pick<FormContext<TForm>, 'getValues' | 'getFieldValue' | 'isFieldSet' | 'isFieldTouched'>,
    ) => FormTransaction<TForm> | null,
  ): void;
}

export const FormTransactionManagerKey: InjectionKey<FormTransactionManager<FormObject>> = Symbol(
  'Formwerk FormTransactionManagerKey',
);

export function useFormTransactions<TForm extends FormObject>(form: FormContext<TForm>) {
  const transactions = new Set<FormTransaction<TForm>>([]);

  let tick: Promise<void>;

  function transaction(tr: (formCtx: FormContext<TForm>) => FormTransaction<TForm> | null) {
    const commit = tr(form);
    if (commit) {
      transactions.add(commit);
    }

    processTransactions();
  }

  async function processTransactions() {
    const upcomingTick = nextTick();
    tick = upcomingTick;

    await upcomingTick;
    if (tick !== upcomingTick || !transactions.size) {
      return;
    }

    /**
     * Unset transactions should be processed first to ensure that any fields that reclaim the same path maintain their value.
     */
    const trs = cleanTransactions(transactions);

    for (const tr of trs) {
      if (tr.kind === 'sp') {
        form.setFieldValue(tr.path, tr.value);
        continue;
      }

      if (tr.kind === 'dp') {
        form.destroyPath(tr.path);
        continue;
      }

      if (tr.kind === 'up') {
        form.unsetPath(tr.path);
      }
    }

    transactions.clear();
  }

  const ctx: FormTransactionManager<TForm> = { transaction };

  provide(FormTransactionManagerKey, ctx as FormTransactionManager<FormObject>);

  return ctx;
}

function cleanTransactions<TForm extends FormObject>(
  transactions: Set<FormTransaction<TForm>>,
): FormTransaction<TForm>[] {
  const trs = Array.from(transactions)
    .filter((tr, idx, otherTrs) => {
      if (tr.kind === 'up') {
        return !otherTrs.some(otherTr => {
          if (otherTr.kind === 'sp') {
            return otherTr.path === tr.path;
          }

          return false;
        });
      }

      return true;
    })
    .sort((a, b) => {
      if (a.kind === 'dp' && b.kind === 'sp') {
        return 1;
      }

      if (a.kind === 'dp' && b.kind === 'up') {
        return 1;
      }

      if (a.kind === 'sp' && b.kind === 'dp') {
        return -1;
      }

      if (a.kind === 'sp' && b.kind === 'up') {
        return 1;
      }

      return 0;
    });

  return trs;
}
