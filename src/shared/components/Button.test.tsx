import {fireEvent, screen} from '@testing-library/react-native';
import {renderWithProviders} from '@testing/test-utils';
import {Button} from './Button';

describe('Button', () => {
  it('fires onPress for enabled controls', () => {
    const onPress = jest.fn();
    renderWithProviders(<Button label="Continue" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', {name: 'Continue'}));
    expect(onPress).toHaveBeenCalled();
  });

  it('suppresses taps while loading', () => {
    const onPress = jest.fn();
    renderWithProviders(<Button label="Saving" loading onPress={onPress} />);

    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
