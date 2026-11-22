
// shim.js - نسخة رسمية - تسجيل دخول إجباري - ما في دخول بلا حساب
(function(){
  // إذا Firebase مش معبى، وقف البرنامج وقلو عبي الاعدادات
  function needConfig(){
    return !window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey === "PASTE_HERE";
  }

  // حاجز - غطي الشاشة كلها لحد ما يسجل دخول
  function showLoginWall(){
    var ov = document.getElementById('loginOverlay');
    if(!ov){
      ov = document.createElement('div');
      ov.id = 'loginOverlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#0B2447,#14476B 50%,#0F766E);display:flex;align-items:center;justify-content:center;padding:20px;';
      ov.innerHTML = '<div style="background:#fff;border-radius:24px;padding:28px 22px;max-width:380px;width:100%;text-align:center;font-family:Cairo,sans-serif;">'
        + '<div style="font-size:44px;">📒</div>'
        + '<h2 style="margin:8px 0 4px;color:#0B2447;">دفتر المحاسبة amhaz</h2>'
        + '<p style="color:#666;font-size:13px;margin:0 0 18px;">لازم تسجل دخول بحسابك لتفوت<br>ما في دخول بلا حساب</p>'
        + '<button id="googleLoginBtn" style="width:100%;padding:14px;border:none;border-radius:12px;background:#fff;border:1px solid #ddd;font-weight:800;cursor:pointer;font-size:15px;">🔵 سجّل دخول بـ Google</button>'
        + '<div style="margin:12px 0;color:#999;font-size:12px;">أو</div>'
        + '<input id="emailInp" placeholder="الإيميل" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:12px;margin-bottom:8px;box-sizing:border-box;">'
        + '<input id="passInp" type="password" placeholder="كلمة السر" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:12px;margin-bottom:12px;box-sizing:border-box;">'
        + '<button id="emailLoginBtn" style="width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#0B2447,#0F766E);color:#fff;font-weight:800;cursor:pointer;">دخول</button>'
        + '<button id="emailSignupBtn" style="width:100%;padding:12px;border:none;background:none;color:#14476B;font-weight:700;cursor:pointer;margin-top:6px;">عمل حساب جديد</button>'
        + '<div id="authErr" style="color:#c0392b;font-size:12px;margin-top:8px;"></div>'
        + '</div>';
      document.body.appendChild(ov);
      document.getElementById('googleLoginBtn').onclick = googleLogin;
      document.getElementById('emailLoginBtn').onclick = emailLogin;
      document.getElementById('emailSignupBtn').onclick = emailSignup;
    } else {
      ov.style.display = 'flex';
    }
    // خبي كل شي وراه
    var main = document.querySelector('main'); if(main) main.style.visibility='hidden';
    var header = document.querySelector('header'); if(header) header.style.visibility='hidden';
  }

  function hideLoginWall(){
    var ov = document.getElementById('loginOverlay');
    if(ov) ov.style.display='none';
    var main = document.querySelector('main'); if(main) main.style.visibility='visible';
    var header = document.querySelector('header'); if(header) header.style.visibility='visible';
  }

  async function googleLogin(){
    try{
      var provider = new firebase.auth.GoogleAuthProvider();
      await firebase.auth().signInWithPopup(provider);
    }catch(e){ document.getElementById('authErr').textContent = 'ما قدرنا نسجل دخول: ' + (e.message||''); }
  }
  async function emailLogin(){
    var em=document.getElementById('emailInp').value.trim();
    var pw=document.getElementById('passInp').value;
    try{ await firebase.auth().signInWithEmailAndPassword(em,pw); }
    catch(e){ document.getElementById('authErr').textContent = 'الإيميل أو كلمة السر غلط'; }
  }
  async function emailSignup(){
    var em=document.getElementById('emailInp').value.trim();
    var pw=document.getElementById('passInp').value;
    if(pw.length<6){ document.getElementById('authErr').textContent='كلمة السر لازم تكون 6 أحرف على الأقل'; return; }
    try{ await firebase.auth().createUserWithEmailAndPassword(em,pw); }
    catch(e){ document.getElementById('authErr').textContent = 'ما قدرنا نعمل حساب: ' + (e.message||''); }
  }

  function initOfficialAuth(){
    try{ if(window.firebase && !firebase.apps.length && window.FIREBASE_CONFIG) firebase.initializeApp(window.FIREBASE_CONFIG); }catch(e){}

    if(needConfig()){
      // Firebase مش معبى - وقف البرنامج
      showLoginWall();
      var err=document.getElementById('authErr');
      if(err) err.textContent='لازم صاحب التطبيق يعبي firebase-config.js من Firebase Console';
      return;
    }
    if(!window.firebase || !firebase.auth){
      setTimeout(initOfficialAuth, 500); return;
    }
    firebase.auth().onAuthStateChanged(function(user){
      if(user){
        // مسجل دخول - خبي الحاجز، وكل بياناته بتنحفظ تحت UID تبعو
        window.CURRENT_UID = user.uid;
        window.CURRENT_EMAIL = user.email;
        hideLoginWall();
        // خزن ال UID عشان كل حساب يشوف بياناته بس
        try{ localStorage.setItem('daftar_uid', user.uid); }catch(e){}
      } else {
        // مش مسجل - ممنوع يفوت
        showLoginWall();
      }
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initOfficialAuth);
  else initOfficialAuth();

  // منع الرجوع لصفحة الدخول بلا حساب - إذا طلع، بيرجع للحاجز
  window.DaftarAuth = window.DaftarAuth || {};
  window.DaftarAuth.requireLogin = function(){ return !!window.CURRENT_UID; };
})();
