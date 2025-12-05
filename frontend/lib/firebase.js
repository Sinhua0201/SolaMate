/**
 * Firebase Configuration and Initialization
 * Firestore database connection
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDNkTVA_YVeSyzauxsBP1vv2CnKWoAWdnc",
  authDomain: "solamate-be9ed.firebaseapp.com",
  projectId: "solamate-be9ed",
  storageBucket: "solamate-be9ed.firebasestorage.app",
  messagingSenderId: "256278856166",
  appId: "1:256278856166:web:1758c63114e35ed49b9627",
  measurementId: "G-NDBC5KTMSZ"
};

// Initialize Firebase (singleton pattern)
let app;
let db;
let analytics;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  
  // Initialize Analytics only in browser environment
  if (typeof window !== 'undefined') {
    isSupported().then(supported => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    });
  }
} else {
  app = getApps()[0];
  db = getFirestore(app);
}

export { app, db, analytics };
export default db;
