import {InteractionManager} from 'react-native';
import {renderHook, act} from '@testing-library/react-native';
import {buildAuthUser} from '@testing/factories/user.factory';
import {authService} from '@services/firebase/auth.service';
import {promptEnableBiometricsIfNeeded} from '@services/biometric-login.service';
import {useAuthStore} from '@store/auth/auth.store';
import {useSignInForm} from './useSignInForm';

jest.mock('@services/firebase/auth.service', () => ({
  authService: {
    signIn: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    current: jest.fn(),
  },
}));

jest.mock('@services/biometric-login.service', () => ({
  promptEnableBiometricsIfNeeded: jest.fn(async () => undefined),
}));

const mockedAuth = jest.mocked(authService);
const mockedBiometrics = jest.mocked(promptEnableBiometricsIfNeeded);

describe('useSignInForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({status: 'unauthenticated', user: null, busy: false, error: null});
    // InteractionManager typings are stricter than our tiny Jest shim; runtime shape is irrelevant for unit tests.
    // @ts-expect-error Jest shim
    jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation((task?: () => void) => {
      task?.();
      return {cancel: jest.fn(), done: jest.fn(), then: jest.fn()};
    });
    mockedAuth.signIn.mockResolvedValue(buildAuthUser());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('delegates to auth actions and triggers optional biometric enrollment', async () => {
    const {result} = renderHook(() => useSignInForm());

    await act(async () => {
      result.current.form.reset({email: 'ada@example.com', password: 'Secret1!'});
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(mockedAuth.signIn).toHaveBeenCalledWith('ada@example.com', 'Secret1!');
    expect(mockedBiometrics).toHaveBeenCalledWith('ada@example.com', 'Secret1!');
  });
});
