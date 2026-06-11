import { initializeApp, getApp, getApps } from 'firebase/app';
// @ts-ignore
import { getAuth, GoogleAuthProvider, initializeAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, browserLocalPersistence, getReactNativePersistence, Auth } from 'firebase/auth';
import { Platform } from 'react-native';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;

// In Expo/React Native, we must use initializeAuth to provide persistence.
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
  console.log('Firebase Auth: Initialized with AsyncStorage persistence');
} catch (e) {
  auth = getAuth(app);
  console.log('Firebase Auth: Using existing instance');
}

const googleProvider = new GoogleAuthProvider();

export { 
  app,
  auth, 
  googleProvider,
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut
};
