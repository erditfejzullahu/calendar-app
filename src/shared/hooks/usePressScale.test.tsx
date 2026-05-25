import {renderHook} from '@testing-library/react-native';
import {withTiming} from 'react-native-reanimated';
import {usePressScale} from './usePressScale';

describe('usePressScale', () => {
  beforeEach(() => jest.mocked(withTiming).mockClear());

  it('defaults to shrinking toward 0.96', () => {
    const {result} = renderHook(() => usePressScale());
    result.current.onPressIn();
    expect(withTiming).toHaveBeenCalledWith(0.96, expect.objectContaining({duration: 90}));
  });

  it('shrinks toward a configurable scale on press in and restores to 1 on release', () => {
    const {result} = renderHook(() => usePressScale(0.94));
    result.current.onPressIn();
    expect(withTiming).toHaveBeenCalledWith(0.94, expect.objectContaining({duration: 90}));
    result.current.onPressOut();
    expect(withTiming).toHaveBeenLastCalledWith(1, expect.objectContaining({duration: 140}));
  });
});
