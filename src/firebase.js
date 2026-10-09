import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Replace this with your exact config object from the Firebase console
const firebaseConfig = {
  apiKey: "AIzaSyChZePLjoCJD-gwfSHIv8iIjgA5WdjX2qk",
  authDomain: "chicken-eaba9.firebaseapp.com",
  databaseURL: "https://chicken-eaba9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chicken-eaba9",
  storageBucket: "chicken-eaba9.appspot.com",
  messagingSenderId: "144904739663",
  appId: "1:144904739663:web:9b44f646777f85eb79033a",
  measurementId: "G-GMK6CEZFMZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth so your App.js and Login components can use it
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();