/**
 * Validates the firebaseFirestore Jest shim — production code mocks should stay predictable.
 */

import {
  doc,
  getDoc,
  getDocFromServer,
  increment,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
} from './firebaseFirestore';

describe('firebaseFirestore test double', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('documents carry deterministic sequential paths', () => {
    expect(doc('segment', 'child').path).toBe('segment/child');
    expect(doc('solo').id).toBe('solo');
  });

  it('queries capture arguments for assertions', () => {
    expect(query('a', 'b')).toEqual(expect.objectContaining({constraints: ['a', 'b']}));
  });

  it('getDoc resolves to missing docs by default', async () => {
    const snap = await getDoc('ref');
    expect(snap.exists()).toBe(false);
  });

  it('runTransaction injects transactional helpers', async () => {
    const spy = jest.fn();
    await runTransaction(undefined, async tx => {
      spy(tx);
      await tx.get('x');
      return 'done';
    });
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.any(Function),
        update: expect.any(Function),
        delete: expect.any(Function),
        get: expect.any(Function),
      }),
    );
  });

  it('onSnapshot notifies listeners async', async () => {
    const next = jest.fn();
    const unsub = onSnapshot('ref', {next, error: jest.fn()});
    expect(typeof unsub).toBe('function');
    expect(next).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(next).toHaveBeenCalled();
  });

  it('firebase helpers behave like stable tokens', () => {
    expect(increment()).toBe(Symbol.for('firebase.increment'));
  });

  it('setDoc resolves without crashing', async () => {
    await expect(setDoc('doc', {a: 1})).resolves.toBeUndefined();
  });

  it('getDocFromServer mirrors getDoc skeleton', async () => {
    const snap = await getDocFromServer('ref');
    expect(snap.exists()).toBe(false);
  });
});
