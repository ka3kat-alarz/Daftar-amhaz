// firebase-config.js - رسمي - daftar-mo7sabi
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDda7D4cWYh0ZReKwNeXPKbKst45WAA6J4",
  authDomain: "daftar-mo7sabi.firebaseapp.com",
  projectId: "daftar-mo7sabi",
  storageBucket: "daftar-mo7sabi.firebasestorage.app",
  messagingSenderId: "853183522724",
  appId: "1:853183522724:web:09e9f0af0a2fca3c9b4331"
};
// تشغيل Firebase اذا كان محمل
try{
  if(window.firebase && !firebase.apps.length){
    firebase.initializeApp(window.FIREBASE_CONFIG);
  }
}catch(e){}
