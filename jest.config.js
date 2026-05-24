/**
 * RN preset handles transforms + RN mocks. We add aliases to mirror babel module-resolver
 * and shared setup for Reanimated / gesture-handler + deterministic utilities.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  preset: '@react-native/jest-preset',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.afterEnv.ts'],
  modulePathIgnorePatterns: ['/android/', '/ios/', '/\\.cache/'],
  moduleNameMapper: {
    '^@react-native-firebase/auth$': '<rootDir>/src/testing/mocks/firebaseAuth.ts',
    '^@react-native-firebase/firestore$': '<rootDir>/src/testing/mocks/firebaseFirestore.ts',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@app-types/(.*)$': '<rootDir>/src/types/$1',
    '^@testing/(.*)$': '<rootDir>/src/testing/$1',
  },
  transformIgnorePatterns: [
    // Keep default RN behavior; allow modern ESM-heavy deps used by hooks/forms/tests.
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-reanimated|react-native-worklets|@react-navigation|react-hook-form|zustand|@react-native-firebase)/)',
  ],
};
