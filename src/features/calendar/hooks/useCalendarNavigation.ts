import {useCallback, useMemo, useReducer} from 'react';

type State = {year: number; month: number};
type Action =
  | {type: 'prev'}
  | {type: 'next'}
  | {type: 'today'}
  | {type: 'set'; payload: State};

const today = new Date();
const initial: State = {year: today.getFullYear(), month: today.getMonth()};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'prev': {
      const m = state.month - 1;
      return m < 0 ? {year: state.year - 1, month: 11} : {year: state.year, month: m};
    }
    case 'next': {
      const m = state.month + 1;
      return m > 11 ? {year: state.year + 1, month: 0} : {year: state.year, month: m};
    }
    case 'today':
      return {year: new Date().getFullYear(), month: new Date().getMonth()};
    case 'set':
      return action.payload;
    default:
      return state;
  }
};

/**
 * Groups the calendar navigation state (year/month) and dispatchers behind a
 * single hook, so consumers only re-render when (year, month) changes.
 */
export const useCalendarNavigation = () => {
  const [state, dispatch] = useReducer(reducer, initial);

  const goPrev = useCallback(() => dispatch({type: 'prev'}), []);
  const goNext = useCallback(() => dispatch({type: 'next'}), []);
  const goToday = useCallback(() => dispatch({type: 'today'}), []);

  return useMemo(
    () => ({year: state.year, month: state.month, goPrev, goNext, goToday}),
    [state.year, state.month, goPrev, goNext, goToday],
  );
};
