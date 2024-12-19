// @ts-strict-ignore
import { t } from 'i18next';
import throttle from 'throttleit';

import { send } from '../../platform/client/fetch';
import { type AccountEntity } from '../../types/models';
import * as constants from '../constants';
import {
  type MarkAccountReadAction,
  type SetLastTransactionAction,
  type UpdateNewTransactionsAction,
} from '../state-types/queries';
import { type AppDispatch, type GetRootState } from '../store';

import { pushModal } from './modals';
import { addNotification, addGenericErrorNotification } from './notifications';

export function applyBudgetAction(month, type, args) {
  return async (dispatch: AppDispatch) => {
    switch (type) {
      case 'budget-amount':
        await send('budget/budget-amount', {
          month,
          category: args.category,
          amount: args.amount,
        });
        break;
      case 'copy-last':
        await send('budget/copy-previous-month', { month });
        break;
      case 'set-zero':
        await send('budget/set-zero', { month });
        break;
      case 'set-3-avg':
        await send('budget/set-3month-avg', { month });
        break;
      case 'check-templates':
        dispatch(addNotification(await send('budget/check-templates')));
        break;
      case 'apply-goal-template':
        dispatch(
          addNotification(await send('budget/apply-goal-template', { month })),
        );
        break;
      case 'overwrite-goal-template':
        dispatch(
          addNotification(
            await send('budget/overwrite-goal-template', { month }),
          ),
        );
        break;
      case 'cleanup-goal-template':
        dispatch(
          addNotification(
            await send('budget/cleanup-goal-template', { month }),
          ),
        );
        break;
      case 'hold':
        await send('budget/hold-for-next-month', {
          month,
          amount: args.amount,
        });
        break;
      case 'reset-hold':
        await send('budget/reset-hold', { month });
        break;
      case 'cover-overspending':
        await send('budget/cover-overspending', {
          month,
          to: args.to,
          from: args.from,
        });
        break;
      case 'transfer-available':
        await send('budget/transfer-available', {
          month,
          amount: args.amount,
          category: args.category,
        });
        break;
      case 'cover-overbudgeted':
        await send('budget/cover-overbudgeted', {
          month,
          category: args.category,
        });
        break;
      case 'transfer-category':
        await send('budget/transfer-category', {
          month,
          amount: args.amount,
          from: args.from,
          to: args.to,
        });
        break;
      case 'carryover': {
        await send('budget/set-carryover', {
          startMonth: month,
          category: args.category,
          flag: args.flag,
        });
        break;
      }
      case 'apply-single-category-template':
        await send('budget/apply-single-template', {
          month,
          category: args.category,
        });
        break;
      case 'apply-multiple-templates':
        dispatch(
          addNotification(
            await send('budget/apply-multiple-templates', {
              month,
              categoryIds: args.categories,
            }),
          ),
        );
        break;
      case 'set-single-3-avg':
        await send('budget/set-n-month-avg', {
          month,
          N: 3,
          category: args.category,
        });
        break;
      case 'set-single-6-avg':
        await send('budget/set-n-month-avg', {
          month,
          N: 6,
          category: args.category,
        });
        break;
      case 'set-single-12-avg':
        await send('budget/set-n-month-avg', {
          month,
          N: 12,
          category: args.category,
        });
        break;
      case 'copy-single-last':
        await send('budget/copy-single-month', {
          month,
          category: args.category,
        });
        break;
      default:
    }
  };
}

export function getCategories() {
  return async (dispatch: AppDispatch) => {
    const categories = await send('get-categories');
    dispatch({
      type: constants.LOAD_CATEGORIES,
      categories,
    });
    return categories;
  };
}

export function createCategory(
  name: string,
  groupId: string,
  isIncome: boolean,
  hidden: boolean,
) {
  return async (dispatch: AppDispatch) => {
    const id = await send('category-create', {
      name,
      groupId,
      isIncome,
      hidden,
    });
    dispatch(getCategories());
    return id;
  };
}

export function deleteCategory(id: string, transferId?: string) {
  return async (dispatch: AppDispatch) => {
    const { error } = await send('category-delete', { id, transferId });

    if (error) {
      switch (error) {
        case 'category-type':
          dispatch(
            addNotification({
              type: 'error',
              message: t(
                'A category must be transferred to another of the same type (expense or income)',
              ),
            }),
          );
          break;
        default:
          dispatch(addGenericErrorNotification());
      }

      throw new Error(error);
    } else {
      dispatch(getCategories());
      // Also need to refresh payees because they might use one of the
      // deleted categories as the default category
      dispatch(getPayees());
    }
  };
}

export function updateCategory(category) {
  return async (dispatch: AppDispatch) => {
    await send('category-update', category);
    dispatch(getCategories());
  };
}

export function moveCategory(id, groupId, targetId) {
  return async (dispatch: AppDispatch) => {
    await send('category-move', { id, groupId, targetId });
    await dispatch(getCategories());
  };
}

export function moveCategoryGroup(id, targetId) {
  return async (dispatch: AppDispatch) => {
    await send('category-group-move', { id, targetId });
    await dispatch(getCategories());
  };
}

export function createGroup(name) {
  return async (dispatch: AppDispatch) => {
    const id = await send('category-group-create', { name });
    dispatch(getCategories());
    return id;
  };
}

export function updateGroup(group) {
  // Strip off the categories field if it exist. It's not a real db
  // field but groups have this extra field in the client most of the
  // time
  const { categories, ...rawGroup } = group;

  return async dispatch => {
    await send('category-group-update', rawGroup);
    await dispatch(getCategories());
  };
}

export function deleteGroup(id, transferId?) {
  return async function (dispatch) {
    await send('category-group-delete', { id, transferId });
    await dispatch(getCategories());
    // See `deleteCategory` for why we need this
    await dispatch(getPayees());
  };
}

export function getPayees() {
  return async (dispatch: AppDispatch) => {
    const payees = await send('payees-get');
    dispatch({
      type: constants.LOAD_PAYEES,
      payees,
    });
    return payees;
  };
}

export function getCommonPayees() {
  return async (dispatch: AppDispatch) => {
    const payees = await send('common-payees-get');
    dispatch({
      type: constants.LOAD_COMMON_PAYEES,
      payees,
    });
    return payees;
  };
}

export function initiallyLoadPayees() {
  return async (dispatch: AppDispatch, getState: GetRootState) => {
    if (getState().queries.payees.length === 0) {
      return dispatch(getPayees());
    }
  };
}

export function createPayee(name: string) {
  return async (dispatch: AppDispatch) => {
    const id = await send('payee-create', { name: name.trim() });
    dispatch(getPayees());
    return id;
  };
}

export function getAccounts() {
  return async (dispatch: AppDispatch) => {
    const accounts = await send('accounts-get');
    dispatch({ type: constants.LOAD_ACCOUNTS, accounts });
    return accounts;
  };
}

export function updateAccount(account: AccountEntity) {
  return async (dispatch: AppDispatch) => {
    dispatch({ type: constants.UPDATE_ACCOUNT, account });
    await send('account-update', account);
  };
}

export function createAccount(name, balance, offBudget) {
  return async (dispatch: AppDispatch) => {
    const id = await send('account-create', { name, balance, offBudget });
    await dispatch(getAccounts());
    await dispatch(getPayees());
    return id;
  };
}

export function openAccountCloseModal(accountId) {
  return async (dispatch: AppDispatch, getState: GetRootState) => {
    const { balance, numTransactions } = await send('account-properties', {
      id: accountId,
    });
    const account = getState().queries.accounts.find(
      acct => acct.id === accountId,
    );

    dispatch(
      pushModal('close-account', {
        account,
        balance,
        canDelete: numTransactions === 0,
      }),
    );
  };
}

export function closeAccount(
  accountId: string,
  transferAccountId: string,
  categoryId: string,
  forced?: boolean,
) {
  return async (dispatch: AppDispatch) => {
    await send('account-close', {
      id: accountId,
      transferAccountId,
      categoryId,
      forced,
    });
    dispatch(getAccounts());
  };
}

export function reopenAccount(accountId) {
  return async (dispatch: AppDispatch) => {
    await send('account-reopen', { id: accountId });
    dispatch(getAccounts());
  };
}

export function forceCloseAccount(accountId) {
  return closeAccount(accountId, null, null, true);
}

// Remember the last transaction manually added to the system
export function setLastTransaction(
  transaction: SetLastTransactionAction['transaction'],
): SetLastTransactionAction {
  return {
    type: constants.SET_LAST_TRANSACTION,
    transaction,
  };
}

export function parseTransactions(filepath, options) {
  return async () => {
    return await send('transactions-parse-file', {
      filepath,
      options,
    });
  };
}

export function importPreviewTransactions(id: string, transactions) {
  return async (dispatch: AppDispatch): Promise<boolean> => {
    const { errors = [], updatedPreview } = await send('transactions-import', {
      accountId: id,
      transactions,
      isPreview: true,
    });

    errors.forEach(error => {
      dispatch(
        addNotification({
          type: 'error',
          message: error.message,
        }),
      );
    });

    return updatedPreview;
  };
}

export function importTransactions(id: string, transactions, reconcile = true) {
  return async (dispatch: AppDispatch): Promise<boolean> => {
    if (!reconcile) {
      await send('api/transactions-add', {
        accountId: id,
        transactions,
      });

      return true;
    }

    const {
      errors = [],
      added,
      updated,
    } = await send('transactions-import', {
      accountId: id,
      transactions,
      isPreview: false,
    });

    errors.forEach(error => {
      dispatch(
        addNotification({
          type: 'error',
          message: error.message,
        }),
      );
    });

    dispatch({
      type: constants.SET_NEW_TRANSACTIONS,
      newTransactions: added,
      matchedTransactions: updated,
      updatedAccounts: added.length > 0 ? [id] : [],
    });

    return added.length > 0 || updated.length > 0;
  };
}

export function updateNewTransactions(changedId): UpdateNewTransactionsAction {
  return {
    type: constants.UPDATE_NEW_TRANSACTIONS,
    changedId,
  };
}

export function markAccountRead(accountId): MarkAccountReadAction {
  return {
    type: constants.MARK_ACCOUNT_READ,
    accountId,
  };
}

const _undo = throttle(() => send('undo'), 100);
const _redo = throttle(() => send('redo'), 100);

let _undoEnabled = true;
export function setUndoEnabled(flag: boolean) {
  _undoEnabled = flag;
}

export function undo() {
  return async () => {
    if (_undoEnabled) {
      _undo();
    }
  };
}

export function redo() {
  return async () => {
    if (_undoEnabled) {
      _redo();
    }
  };
}
