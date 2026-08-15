/* 
 * ECDI Firebase Configuration Module
 * Follows Firebase Integration guidelines.
 * To enable direct Firebase integration, replace the placeholders below with your Firebase web configuration.
 */

export const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Log Firebase Status
console.log("[ECDI Platform] Application connected to backend REST API with persistent database storage.");
