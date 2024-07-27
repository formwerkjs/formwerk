import { nextTick } from 'vue';
import { FormObject, Path, PathValue } from '../types';
import { FormContext } from './formContext';

const transactionCode = {
  SET_PATH: 2,
  UNSET_PATH: 1,
  DESTROY_PATH: 0,
} as const;

interface SetFieldValueTransaction<TForm extends FormObject> {
  kind: 2;
  path: Path<TForm>;
  value: PathValue<TForm, Path<TForm>>;
}

interface UnsetFieldValueTransaction<TForm extends FormObject> {
  kind: 1;
  path: Path<TForm>;
}

interface DestroyFieldValueTransaction<TForm extends FormObject> {
  kind: 0;
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
      codes: typeof transactionCode,
    ) => FormTransaction<TForm> | null,
  ): void;
}

export function useFormTransactions<TForm extends FormObject>(form: FormContext<TForm>) {
  const transactions = new Set<FormTransaction<TForm>>([]);

  let tick: Promise<void>;

  function transaction(
    tr: (formCtx: FormContext<TForm>, codes: typeof transactionCode) => FormTransaction<TForm> | null,
  ) {
    const commit = tr(form, transactionCode);
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
      if (tr.kind === transactionCode.SET_PATH) {
        form.setFieldValue(tr.path, tr.value);
        continue;
      }

      if (tr.kind === transactionCode.DESTROY_PATH) {
        form.destroyPath(tr.path);
        continue;
      }

      if (tr.kind === transactionCode.UNSET_PATH) {
        form.unsetPath(tr.path);
      }
    }

    transactions.clear();
  }

  const ctx: FormTransactionManager<TForm> = { transaction };

  return ctx;
}

function cleanTransactions<TForm extends FormObject>(
  transactions: Set<FormTransaction<TForm>>,
): FormTransaction<TForm>[] {
  const trs = Array.from(transactions)

    .filter((t, _, ops) => {
      // Remove unset operations that have a corresponding set operation.
      if (t.kind === transactionCode.UNSET_PATH) {
        return !ops.some(op => op.kind === transactionCode.SET_PATH && op.path === t.path);
      }

      return true;
    })
    .map(t => {
      if (t.kind === transactionCode.UNSET_PATH) {
        return {
          kind: transactionCode.DESTROY_PATH,
          path: t.path,
        };
      }

      return t;
    })
    .sort((a, b) => {
      return a.kind - b.kind;
    });

  return trs;
}
