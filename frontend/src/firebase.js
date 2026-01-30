import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCu0akFyxWVKVHIhEAFB9tVfR3ds3qKvPE",
  authDomain: "remedi-ai.firebaseapp.com",
  projectId: "remedi-ai",
  storageBucket: "remedi-ai.firebasestorage.app",
  messagingSenderId: "705335073905",
  appId: "1:705335073905:web:ca45ceb9ca447114750fd0"
};

// ------------------------------

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the tools we need
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider(); // <--- This is new!
export const db = getFirestore(app);