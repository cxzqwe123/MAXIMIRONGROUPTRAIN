// src/firebase.js

// Импортируем нужные модули Firebase
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Конфигурация твоего проекта Firebase (эта часть берётся из Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyBUMaOT7S6vdJoGCw_9ztIxCdMOXs4MiwY",
  authDomain: "maximirongrouptrain.firebaseapp.com",
  projectId: "maximirongrouptrain",
  storageBucket: "maximirongrouptrain.firebasestorage.app",
  messagingSenderId: "954398549794",
  appId: "1:954398549794:web:76a52dacf644741cb8a77b",
  measurementId: "G-CYKYFG9EY4"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);

// Инициализация аналитики (необязательно, но пусть будет)
const analytics = getAnalytics(app);

// Инициализация базы данных Firestore (главное для хранения твоих тренировок)
export const db = getFirestore(app);
