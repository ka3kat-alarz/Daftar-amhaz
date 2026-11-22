
// shim.js - FIX - دخول رسمي - Redirect للتلفون + إلغاء القديم
(function(){
  // 1) وقف النظام القديم - DaftarAuth القديم كان بيعمل مشكلة
  window.DaftarAuth = {
    hasPassword: function(){ return false; },
    ask: function(){},
    // لا تسمح للقديم يوقف الدخول
  };
  // 2) إذا Firebase مش معبى
  function needConfig(){ return !window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey === "PASTE_HERE"; }

  function showLoginWall(){
    var ov = document.getElementById('loginOverlay');
    // إذا كان في overlay قديم، محيه واعمل الجديد
    if(ov && !ov.dataset.official){
      ov.remove(); ov = null;
    }
    if(!ov){
      ov = document.createElement('div');
      ov.id = 'loginOverlay'; ov.dataset.official = '1';
      ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#0B2447,#14476B 50%,#0F766E);display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto;';
      ov.innerHTML = '<div style="background:#fff;border-radius:24px;padding:28px 22px;max-width:380px;width:100%;text-align:center;font-family:Cairo,sans-serif;">'
        + '<div style="font-size:44px;">📒</div>'
        + '<h2 style="margin:8px 0 4px;color:#0B2447;">دفتر المحاسبة amhaz</h2>'
        + '<p style="color:#666;font-size:13px;margin:0 0 18px;">لازم تسجل دخول بحسابك لتفوت<br>ما في دخول بلا حساب</p>'
        + '<button id="googleLoginBtn2" style="width:100%;padding:14px;border-radius:12px;background:#fff;border:1px solid #ddd;font-weight:800;cursor:pointer;font-size:15px;margin-bottom:12px;">🔵 سجّل دخول بـ Google</button>'
        + '<div style="margin:6px 0;color:#999;font-size:12px;">أو بإيميل</div>'
        + '<input id="emailInp2" type="email" placeholder="الإيميل - مثل ousama@gmail.com" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:12px;margin-bottom:8px;box-sizing:border-box;text-align:left;direction:ltr;">'
        + '<input id="passInp2" type="password" placeholder="كلمة السر - 6 أحرف على الأقل" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:12px;margin-bottom:12px;box-sizing:border-box;">'
        + '<button id="emailLoginBtn2" style="width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#0B2447,#0F766E);color:#fff;font-weight:800;cursor:pointer;">دخول</button>'
        + '<button id="emailSignupBtn2" style="width:100%;padding:12px;border:none;background:none;color:#14476B;font-weight:700;cursor:pointer;margin-top:6px;">عمل حساب جديد - أول مرة كبس هون</button>'
        + '<div id="authErr2" style="color:#c0392b;font-size:13px;margin-top:8px;min-height:18px;"></div>'
        + '<div style="font-size:11px;color:#999;margin-top:8px;">إذا كتبت إيميل جديد، كبس حساب جديد أول مرة، وبعدين دخول</div>'
        + '</div>';
      document.body.appendChild(ov);
      document.getElementById('googleLoginBtn2').onclick = googleLogin;
      document.getElementById('emailLoginBtn2').onclick = emailLogin;
      document.getElementById('emailSignupBtn2').onclick = emailSignup;
    } else {
      ov.style.display = 'flex';
    }
  }
  function hideLoginWall(){
    var ov = document.getElementById('loginOverlay');
    if(ov) ov.style.display='none';
  }
  function showErr(msg){ var e=document.getElementById('authErr2'); if(e) e.textContent=msg; }
  async function googleLogin(){
    try{
      var provider = new firebase.auth.GoogleAuthProvider();
      // بالتلفون لازم Redirect مش Popup - Popup ما بيشتغل بالـ WebView
      await firebase.auth().signInWithRedirect(provider);
    }catch(e){ showErr('ما قدرنا نسجل دخول بـ Google: ' + (e.message||'')); }
  }
  async function emailLogin(){
    var em=(document.getElementById('emailInp2').value||'').trim();
    var pw=document.getElementById('passInp2').value||'';
    if(!em || !em.includes('@')){ showErr('اكتب إيميل صح - لازم يكون فيه @'); return; }
    if(!pw || pw.length<6){ showErr('كلمة السر لازم تكون 6 أحرف على الأقل'); return; }
    showErr('عم نسجل دخول...');
    try{ await firebase.auth().signInWithEmailAndPassword(em,pw); }
    catch(e){
      if(e.code==='auth/user-not-found' || e.code==='auth/invalid-credential') showErr('هالحساب مش موجود - كبس حساب جديد أول مرة');
      else if(e.code==='auth/wrong-password') showErr('كلمة السر غلط');
      else if(e.code==='auth/invalid-email') showErr('الإيميل مش صح - اكتبو صح');
      else showErr('ما قدرنا نفوت: ' + (e.message||''));
    }
  }
  async function emailSignup(){
    var em=(document.getElementById('emailInp2').value||'').trim();
    var pw=document.getElementById('passInp2').value||'';
    if(!em || !em.includes('@')){ showErr('اكتب إيميل صح أول شي'); return; }
    if(!pw || pw.length<6){ showErr('كلمة السر لازم تكون 6 أحرف على الأقل'); return; }
    showErr('عم نعمل حساب...');
    try{
      await firebase.auth().createUserWithEmailAndPassword(em,pw);
      showErr('✅ انعمل الحساب - هلأ فتت');
    }catch(e){
      if(e.code==='auth/email-already-in-use') showErr('هالإيميل عندو حساب أصلاً - كبس دخول');
      else if(e.code==='auth/invalid-email') showErr('الإيميل مش صح');
      else if(e.code==='auth/weak-password') showErr('كلمة السر ضعيفة - حط 6 أحرف على الأقل');
      else showErr('ما قدرنا نعمل حساب: ' + (e.message||''));
    }
  }
  function init(){
    try{ if(window.firebase && !firebase.apps.length && window.FIREBASE_CONFIG) firebase.initializeApp(window.FIREBASE_CONFIG); }catch(e){}
    if(needConfig()){ showLoginWall(); showErr('لازم صاحب التطبيق يعبي firebase-config.js'); return; }
    if(!window.firebase || !firebase.auth){ setTimeout(init, 500); return; }
    // إذا راجع من Google Redirect
    firebase.auth().getRedirectResult().then(function(res){
      if(res && res.user){ hideLoginWall(); }
    }).catch(function(e){ if(e && e.message) showErr(e.message); });
    firebase.auth().onAuthStateChanged(function(user){
      if(user){ window.CURRENT_UID=user.uid; window.CURRENT_EMAIL=user.email; hideLoginWall(); }
      else { showLoginWall(); }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
