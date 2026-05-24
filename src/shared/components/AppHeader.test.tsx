import {fireEvent, screen} from '@testing-library/react-native';
import {renderWithProviders} from '@testing/test-utils';
import {AppHeader} from './AppHeader';

describe('AppHeader', () => {
  it('renders contextual actions wired to callbacks', () => {
    const onLeft = jest.fn();
    const onRight = jest.fn();

    renderWithProviders(
      <AppHeader
        title="Calendar"
        subtitle="May 2026"
        leftAction={{label: 'Back', onPress: onLeft}}
        rightAction={{label: 'Add', onPress: onRight}}
      />,
    );

    fireEvent.press(screen.getByText('Back'));
    fireEvent.press(screen.getByText('Add'));

    expect(onLeft).toHaveBeenCalledTimes(1);
    expect(onRight).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Calendar')).toBeTruthy();
    expect(screen.getByText('May 2026')).toBeTruthy();
  });
});
