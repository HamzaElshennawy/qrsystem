import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDb_8GvSoRvsGiSTjqhX4JJ24YXi-Kmq8o",
    authDomain: "qr-compounds.firebaseapp.com",
    projectId: "qr-compounds",
    storageBucket: "qr-compounds.firebasestorage.app",
    messagingSenderId: "980157977644",
    appId: "1:980157977644:web:51ac1e3aa38bd6c87f6d89",
    measurementId: "G-XCM0XV7LMC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
