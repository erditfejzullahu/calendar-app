/**
 * Single seam over @react-native-firebase. v22+ ships a modular API that
 * mirrors firebase-js-sdk; v24 dropped the deprecated namespaced types.
 *
 * Anything inside `services/firebase/*` is allowed to import directly from
 * `@react-native-firebase/*` — the rest of the app must only import from
 * this folder, so swapping the backend (or mocking it) stays a one-file job.
 */
export {getAuth} from '@react-native-firebase/auth';
export type {FirebaseAuthTypes} from '@react-native-firebase/auth';

export {getFirestore} from '@react-native-firebase/firestore';
