
// shim.js - FIX V4 - إيميل بس - كامل - ما بيعلق بعد الدخول
(function(){
  function getUser(){ try{ return (window.firebase && firebase.auth) ? firebase.auth().currentUser : null; }catch(e){ return null; } }
  // DaftarAuth كامل - كل الدوال يلي index بيستعملها
  window.DaftarAuth = window.DaftarAuth || {};
  window.DaftarAuth.currentUser = getUser;
  window.DaftarAuth.cloudEnabled = function(){ return !!(window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey && window.FIREBASE_CONFIG.apiKey !== "PASTE_HERE"); };
  window.DaftarAuth.sdkLoaded = function(){ return !!(window.firebase && firebase.auth && window.FIREBASE_CONFIG); };
  window.DaftarAuth.hasPassword = function(){ return !!getUser(); };
  window.DaftarAuth.ask = function(){ return Promise.resolve(!!getUser()); };
  window.DaftarAuth.changeInteractive = function(){ return Promise.resolve(); };
  window.DaftarAuth.logout = function(){ try{ return firebase.auth().signOut(); }catch(e){ return Promise.resolve(); } };

  function showWall(){
    // امسح أي overlay قديم تاع index - ما بدنا تنين يتصارعوا
    var olds=document.querySelectorAll('#loginOverlay');
    olds.forEach(function(o){ if(!o.dataset.official2) o.remove(); });
    var ov=document.getElementById('loginOverlay');
    if(!ov){
      ov=document.createElement('div'); ov.id='loginOverlay'; ov.dataset.official2='1';
      ov.style.cssText='position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#0B2447,#14476B 50%,#0F766E);display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto;';
      ov.innerHTML='<div style="background:#fff;border-radius:24px;padding:28px 22px;max-width:380px;width:100%;text-align:center;font-family:Cairo,sans-serif;">'
        +'<div style="font-size:44px;">📒</div><h2 style="margin:8px 0 4px;color:#0B2447;">دفتر المحاسبة amhaz</h2>'
        +'<p style="color:#666;font-size:13px;margin:0 0 18px;">سجّل دخول بإيميلك لتفوت<br>كل حساب عندو محلاتو لحال</p>'
        +'<input id="em2" type="email" placeholder="الإيميل - ousama@gmail.com" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:12px;margin-bottom:8px;box-sizing:border-box;text-align:left;direction:ltr;">'
        +'<input id="pw2" type="password" placeholder="كلمة السر - 6 أحرف على الأقل" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:12px;margin-bottom:12px;box-sizing:border-box;">'
        +'<button id="loginBtn2" style="width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#0B2447,#0F766E);color:#fff;font-weight:800;cursor:pointer;">دخول</button>'
        +'<button id="signupBtn2" style="width:100%;padding:12px;border:none;background:none;color:#14476B;font-weight:700;cursor:pointer;margin-top:6px;">عمل حساب جديد - أول مرة كبس هون</button>'
        +'<div id="err2" style="color:#c0392b;font-size:13px;margin-top:8px;min-height:18px;"></div></div>';
      document.body.appendChild(ov);
      document.getElementById('loginBtn2').onclick=doLogin;
      document.getElementById('signupBtn2').onclick=doSignup;
    } else ov.style.display='flex';
    // أكيد بين التطبيق ورا - لما يفوت بيبين
    var app=document.getElementById('appContent'); if(app){ app.classList.remove('hidden'); }
  }
  function hideWall(){
    var ov=document.getElementById('loginOverlay'); if(ov) ov.style.display='none';
    var app=document.getElementById('appContent'); if(app){ app.classList.remove('hidden'); app.style.display=''; }
    // أجبر المحلات تبين بعد الدخول
    setTimeout(function(){ try{ if(typeof renderShops==='function') renderShops(); }catch(e){} try{ if(typeof loadShopsFromCloud==='function') loadShopsFromCloud(); }catch(e){} }, 300);
  }
  function err(m){ var e=document.getElementById('err2'); if(e) e.textContent=m; }
  async function doLogin(){
    var em=(document.getElementById('em2').value||'').trim(); var pw=document.getElementById('pw2').value||'';
    if(!em || !em.includes('@')){ err('اكتب إيميل صح - لازم يكون فيه @'); return; }
    if(!pw || pw.length<6){ err('كلمة السر لازم تكون 6 أحرف على الأقل'); return; }
    err('عم نسجل دخول...');
    try{ await firebase.auth().signInWithEmailAndPassword(em,pw); }
    catch(e){
      if(e.code==='auth/user-not-found' || e.code==='auth/invalid-credential') err('هالحساب مش موجود - كبس حساب جديد أول مرة');
      else if(e.code==='auth/wrong-password') err('كلمة السر غلط');
      else if(e.code==='auth/invalid-email') err('الإيميل مش صح');
      else err('ما قدرنا نفوت: '+(e.message||''));
    }
  }
  async function doSignup(){
    var em=(document.getElementById('em2').value||'').trim(); var pw=document.getElementById('pw2').value||'';
    if(!em || !em.includes('@')){ err('اكتب إيميل صح أول شي'); return; }
    if(!pw || pw.length<6){ err('كلمة السر لازم تكون 6 أحرف على الأقل'); return; }
    err('عم نعمل حساب...');
    try{ await firebase.auth().createUserWithEmailAndPassword(em,pw); err('✅ انعمل الحساب - هلأ فتت'); }
    catch(e){
      if(e.code==='auth/email-already-in-use') err('هالإيميل عندو حساب أصلاً - كبس دخول');
      else err('ما قدرنا نعمل حساب: '+(e.message||''));
    }
  }
  function init(){
    try{ if(window.firebase && !firebase.apps.length && window.FIREBASE_CONFIG) firebase.initializeApp(window.FIREBASE_CONFIG); }catch(e){}
    if(!window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey==="PASTE_HERE"){ showWall(); err('لازم صاحب التطبيق يعبي firebase-config.js'); return; }
    if(!window.firebase || !firebase.auth){ setTimeout(init,500); return; }
    firebase.auth().onAuthStateChanged(function(user){
      if(user){ window.CURRENT_UID=user.uid; window.CURRENT_EMAIL=user.email; hideWall(); try{ document.dispatchEvent(new Event('daftar-auth-ready')); }catch(e){} }
      else { showWall(); }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
