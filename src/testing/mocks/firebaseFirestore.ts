export function getFirestore(): unknown {
  return {mockDb: true};
}

export const increment = jest.fn(() => Symbol.for('firebase.increment'));

export const collection = jest.fn((..._segments: unknown[]) => ({segments: _segments}));

export const collectionGroup = jest.fn((_db: unknown, _groupId: string) => ({collectionGroupId: _groupId}));

export const doc = jest.fn((...segments: unknown[]) => ({
  id: segments[segments.length - 1]?.toString() ?? 'generated',
  path: segments.map(String).join('/'),
}));

export const orderBy = jest.fn(() => Symbol.for('firebase.orderBy'));

export const query = jest.fn((...segments: unknown[]) => ({constraints: segments}));

export const getDoc = jest.fn(async () => ({
  exists: (): boolean => false,
  id: 'mock-id',
  data: (): Record<string, unknown> => ({}),
}));

export const getDocFromServer = jest.fn(async () => ({
  exists: (): boolean => false,
  id: 'mock-id',
  data: (): Record<string, unknown> => ({}),
}));

export const setDoc = jest.fn(async () => undefined);

export const writeBatch = jest.fn(() => ({
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  commit: jest.fn(async () => undefined),
}));



/** Invokes observers microtask-async to mimic snapshot delivery without blocking constructors. */
export function onSnapshot(...args: unknown[]): () => void {
  const maybeObserver =
    typeof args[args.length - 1] === 'object' && args[args.length - 1] !== null
      ? (args[args.length - 1] as {next?: (snap: unknown) => void; error?: (e: unknown) => void})
      : null;

  const unifiedSnap = {
    exists: (): boolean => true,
    docs: [] as unknown[],
    data: (): {stats?: unknown; role?: unknown} => ({stats: {}, role: undefined}),
    id: 'mock-root',
    ref: {path: 'users/mock/meetings/mock'},
    forEach(cb: (d: unknown) => void): void {
      unifiedSnap.docs.forEach(cb);
    },
  };

  void Promise.resolve().then(() => maybeObserver?.next?.(unifiedSnap));
  return jest.fn();
}
