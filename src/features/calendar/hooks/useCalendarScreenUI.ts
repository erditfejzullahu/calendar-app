import {useCallback, useMemo, useReducer} from 'react';
import type {Meeting} from '@app-types/meeting';

/**
 * Groups all the transient UI state for the calendar screen into a single
 * reducer so the screen re-renders only when something actually changes (and
 * a single setter on a child won't trigger multiple state batches).
 */
type State = {
  selectedDate: string | null;
  daySheetOpen: boolean;
  createOpen: boolean;
  activeMeeting: Meeting | null;
};

type Action =
  | {type: 'selectDate'; payload: string}
  | {type: 'closeDay'}
  | {type: 'openCreate'}
  | {type: 'closeCreate'}
  | {type: 'openMeeting'; payload: Meeting}
  | {type: 'closeMeeting'};

const initial: State = {
  selectedDate: null,
  daySheetOpen: false,
  createOpen: false,
  activeMeeting: null,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'selectDate':
      return {...state, selectedDate: action.payload, daySheetOpen: true};
    case 'closeDay':
      return {...state, daySheetOpen: false};
    case 'openCreate':
      return {...state, createOpen: true, daySheetOpen: false};
    case 'closeCreate':
      return {...state, createOpen: false};
    case 'openMeeting':
      return {...state, activeMeeting: action.payload, daySheetOpen: false};
    case 'closeMeeting':
      return {...state, activeMeeting: null};
    default:
      return state;
  }
};

export const useCalendarScreenUI = () => {
  const [state, dispatch] = useReducer(reducer, initial);

  const selectDate = useCallback((iso: string) => dispatch({type: 'selectDate', payload: iso}), []);
  const closeDay = useCallback(() => dispatch({type: 'closeDay'}), []);
  const openCreate = useCallback(() => dispatch({type: 'openCreate'}), []);
  const closeCreate = useCallback(() => dispatch({type: 'closeCreate'}), []);
  const openMeeting = useCallback((m: Meeting) => dispatch({type: 'openMeeting', payload: m}), []);
  const closeMeeting = useCallback(() => dispatch({type: 'closeMeeting'}), []);

  return useMemo(
    () => ({
      ...state,
      selectDate,
      closeDay,
      openCreate,
      closeCreate,
      openMeeting,
      closeMeeting,
    }),
    [state, selectDate, closeDay, openCreate, closeCreate, openMeeting, closeMeeting],
  );
};
