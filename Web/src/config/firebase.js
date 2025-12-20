// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBtB3kb_mN3ZdUAyf4xsp1wCK8spQnNtkc",
  authDomain: "unisync-web-app-ac1fd.firebaseapp.com",
  projectId: "unisync-web-app-ac1fd",
  storageBucket: "unisync-web-app-ac1fd.firebasestorage.app",
  messagingSenderId: "25644861146",
  appId: "1:25644861146:web:8fbc17eb8aa666bf60c7e3",
  measurementId: "G-5SQJ2F6E5V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
