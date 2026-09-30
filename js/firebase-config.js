import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCDmgnGqYiK0z6pFfa9BFAJfr5G9Q3Bwb4",
  authDomain: "smarthub-capstone-4b179.firebaseapp.com",
  projectId: "smarthub-capstone-4b179",
  storageBucket: "smarthub-capstone-4b179.firebasestorage.app",
  messagingSenderId: "739679407665",
  appId: "1:739679407665:web:7bfb6ff5f416ffcc5ecf10",
  measurementId: "G-S324JT8VW2"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
