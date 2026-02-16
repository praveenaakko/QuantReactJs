import React, { createContext, useReducer, useContext, Dispatch } from 'react';
import { appReducer, initialState } from './reducer';
import type { AppState, Action } from './reducer';

const StoreContext = createContext<{ state: AppState; dispatch: Dispatch<Action> }>({
  state: initialState,
  dispatch: () => null,
});

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);

export { appReducer, initialState };
export type { AppState, Action };
