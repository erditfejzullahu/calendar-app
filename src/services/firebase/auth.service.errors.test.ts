import {mapProfileUpdateError} from './auth.service';

describe('mapProfileUpdateError', () => {
  it.each([
    [{code: 'auth/email-already-in-use'}, 'That email is already linked to another account.'],
    [{code: 'auth/invalid-email'}, 'That email address looks invalid.'],
    [{code: 'auth/weak-password'}, 'Password is too weak.'],
    [{code: 'auth/wrong-password'}, 'Current password is incorrect.'],
    [{code: 'auth/requires-recent-login'}, 'Please sign out and sign in again, then retry.'],
    [new Error('Network error encountered'), 'Network error. Check your connection and try again.'],
  ])('maps %p to stable copy', (error, expected) => {
    expect(mapProfileUpdateError(error)).toBe(expected);
  });

  it('falls back gracefully for unexpected errors', () => {
    expect(mapProfileUpdateError({code: 'auth/unknown'})).toBe('Something went wrong. Please try again.');
  });
});
