import {buildAuthUser} from '@testing/factories/user.factory';
import {renderHook} from '@testing-library/react-native';
import {
  useAuthActions,
  useAuthBusy,
  useAuthError,
  useAuthStatus,
  useAuthUser,
} from './auth.selectors';
import {useAuthStore} from './auth.store';

describe('auth.selectors', () => {
  beforeEach(() => {
    useAuthStore.setState({status: 'unauthenticated', user: null, busy: false, error: null});
  });

  it('exposes read-only slices that track Zustand field updates independently', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: buildAuthUser({uid: 'picked'}),
      busy: true,
      error: 'boom',
    });

    expect(renderHook(() => useAuthUser()).result.current).toMatchObject({uid: 'picked'});
    expect(renderHook(() => useAuthBusy()).result.current).toBe(true);
    expect(renderHook(() => useAuthError()).result.current).toBe('boom');
    expect(renderHook(() => useAuthStatus()).result.current).toBe('authenticated');
    expect(renderHook(() => useAuthActions()).result.current.signOut).toEqual(expect.any(Function));
  });
});
