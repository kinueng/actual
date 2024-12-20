import { useCallback } from 'react';

import { addNotification } from 'loot-core/client/actions';
import { type Notification } from 'loot-core/client/state-types/notifications';
import { redo, undo } from 'loot-core/client/undo';

import { useAppDispatch } from '../redux';

type UndoActions = {
  undo: () => void;
  redo: () => void;
  showUndoNotification: (undoNotification: Notification) => void;
  showRedoNotification: (redoNotification: Notification) => void;
};

const timeout = 10000;

export function useUndo(): UndoActions {
  const dispatch = useAppDispatch();

  const showUndoNotification = useCallback(
    (notification: Notification) => {
      dispatch(
        addNotification({
          type: 'message',
          timeout,
          button: {
            title: 'Undo',
            action: undo,
          },
          ...notification,
        }),
      );
    },
    [dispatch],
  );

  const showRedoNotification = useCallback(
    (notificaton: Notification) => {
      dispatch(
        addNotification({
          type: 'message',
          timeout,
          button: {
            title: 'Redo',
            action: redo,
          },
          ...notificaton,
        }),
      );
    },
    [dispatch],
  );

  return {
    undo,
    redo,
    showUndoNotification,
    showRedoNotification,
  };
}
