import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCUu8sr_UPkG1OWDjzXz4s-ObC5iAZk95c",
  authDomain: "tallink-trenn.firebaseapp.com",
  databaseURL: "https://tallink-trenn-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tallink-trenn",
  storageBucket: "tallink-trenn.appspot.com", // 
  messagingSenderId: "641771277468",
  appId: "1:641771277468:web:31e0af4e64b0366fbff159",
  measurementId: "G-FRZ090KBKT"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);