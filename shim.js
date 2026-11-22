// shim.js - V6
// 1) تسجيل الدخول (Firebase Auth) + شاشة الدخول
// 2) بيوفّر claude.use('db') و claude.use('assets') لصفحة ledger.html عبر Firestore
//    كل البيانات بتنحفظ تحت: users/<uid>/books/<book>/...
(function () {
  'use strict';

  var FONT = "Cairo,Tahoma,Arial,sans-serif";

  function fb() { return window.firebase; }
  function cfgOk() {
    var c = window.FIREBASE_CONFIG;
    return !!(c && c.apiKey && c.apiKey !== 'PASTE_HERE');
  }
  function sdkOk() {
    var f = fb();
    return !!(f && f.auth && f.firestore && cfgOk());
  }
  function getUser() {
    try { return (sdkOk() && fb().apps.length) ? fb().auth().currentUser : null; }
    catch (e) { return null; }
  }
  function hasApp() { return !!document.getElementById('appContent'); }

  // ---------- حالة الدخول ----------
  var settled = false, resolveReady, listeners = [];
  var ready = new Promise(function (r) { resolveReady = r; });
  function settle() { if (!settled) { settled = true; resolveReady(); } }

  // ---------- رسائل الأخطاء ----------
  function authMsg(e) {
    var c = (e && e.code) || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return 'الإيميل أو كلمة السر غلط';
    if (c === 'auth/email-already-in-use') return 'هيدا الإيميل مسجّل من قبل، اضغط «دخول»';
    if (c === 'auth/weak-password') return 'كلمة السر ضعيفة، لازم 6 أحرف على الأقل';
    if (c === 'auth/invalid-email') return 'الإيميل مش مكتوب صح';
    if (c === 'auth/missing-password') return 'اكتب كلمة السر';
    if (c === 'auth/network-request-failed') return 'ما في انترنت';
    if (c === 'auth/too-many-requests') return 'محاولات كتير، استنّى شوي وجرّب';
    if (c === 'auth/operation-not-allowed') return 'لازم تفعّل Email/Password بـ Firebase Console';
    if (c === 'auth/requires-recent-login') return 'سجّل خروج وفوت من جديد وجرّب';
    return 'صار خطأ: ' + ((e && e.message) || c || '');
  }

  function el(tag, css) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    return e;
  }
  var BTN = 'width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#0B2447,#0F766E);color:#fff;font-weight:800;font-size:15px;cursor:pointer;font-family:inherit;';
  var INP = 'width:100%;padding:12px;border:1px solid #CFE6F0;border-radius:12px;margin-bottom:8px;box-sizing:border-box;font-size:15px;font-family:inherit;direction:ltr;text-align:left;';

  // ---------- نافذة صغيرة (كلمة سر / تغيير كلمة السر) ----------
  // onSubmit(values) بترجّع نص الخطأ (يبقى الشباك مفتوح) أو null (نجاح)
  function modal(opts) {
    return new Promise(function (resolve) {
      var ov = el('div', 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px;font-family:' + FONT + ';direction:rtl;');
      var box = el('div', 'background:#fff;border-radius:20px;padding:22px 18px;max-width:360px;width:100%;text-align:center;color:#0B2A3A;');
      var h = el('h3', 'margin:0 0 12px;font-size:18px;'); h.textContent = opts.title || '';
      box.appendChild(h);
      var inputs = [];
      (opts.fields || []).forEach(function (f) {
        var i = el('input', INP);
        i.type = f.type || 'password';
        i.placeholder = f.placeholder || '';
        i.autocomplete = f.autocomplete || 'off';
        box.appendChild(i); inputs.push(i);
      });
      var msg = el('div', 'color:#c0392b;font-size:13px;min-height:18px;margin:2px 0 8px;');
      var ok = el('button', BTN); ok.type = 'button'; ok.textContent = opts.ok || 'تأكيد';
      var cancel = el('button', 'width:100%;border:0;background:none;color:#4F7284;padding:10px;font-family:inherit;cursor:pointer;margin-top:4px;');
      cancel.type = 'button'; cancel.textContent = 'إلغاء';
      function close(v) { ov.remove(); resolve(v); }
      cancel.onclick = function () { close(null); };
      ok.onclick = function () {
        ok.disabled = true; msg.textContent = '';
        var vals = inputs.map(function (i) { return i.value; });
        Promise.resolve().then(function () { return opts.onSubmit ? opts.onSubmit(vals) : null; })
          .catch(function (x) { return authMsg(x); })
          .then(function (e) { ok.disabled = false; if (e) msg.textContent = e; else close(vals); });
      };
      inputs.forEach(function (i) {
        i.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); ok.click(); } });
      });
      box.appendChild(msg); box.appendChild(ok); box.appendChild(cancel);
      ov.appendChild(box); document.body.appendChild(ov);
      if (inputs[0]) inputs[0].focus();
    });
  }

  // ---------- DaftarAuth ----------
  var A = window.DaftarAuth = window.DaftarAuth || {};
  A.ready = ready;
  A.currentUser = getUser;
  A.cloudEnabled = cfgOk;
  A.sdkLoaded = sdkOk;
  A.hasPassword = function () { return !!getUser(); };
  A.onChange = function (cb) {
    listeners.push(cb);
    if (settled) setTimeout(function () { try { cb(getUser()); } catch (e) { console.error(e); } }, 0);
  };
  A.logout = function () {
    try { return fb().auth().signOut(); } catch (e) { return Promise.resolve(); }
  };
  // mode:'unlock' → بس يتأكد إنو في حساب مسجّل. mode:'confirm' → بيطلب كلمة السر فعلياً.
  A.ask = function (opts) {
    opts = opts || {};
    return ready.then(function () {
      var user = getUser();
      if (!user) return false;
      if (opts.mode !== 'confirm') return true;
      return modal({
        title: opts.title || 'حط كلمة السر للتأكيد',
        fields: [{ type: 'password', placeholder: 'كلمة السر', autocomplete: 'current-password' }],
        ok: 'تأكيد',
        onSubmit: function (v) {
          if (!v[0]) return 'اكتب كلمة السر';
          var cred = fb().auth.EmailAuthProvider.credential(user.email, v[0]);
          return user.reauthenticateWithCredential(cred).then(function () { return null; }, authMsg);
        }
      }).then(function (r) { return !!r; });
    });
  };
  A.changeInteractive = function () {
    var user = getUser();
    if (!user) return Promise.resolve(false);
    return modal({
      title: '🔑 تغيير كلمة السر',
      fields: [
        { type: 'password', placeholder: 'كلمة السر الحالية', autocomplete: 'current-password' },
        { type: 'password', placeholder: 'كلمة السر الجديدة (6 أحرف على الأقل)', autocomplete: 'new-password' },
        { type: 'password', placeholder: 'أعد كتابة الجديدة', autocomplete: 'new-password' }
      ],
      ok: 'غيّر',
      onSubmit: function (v) {
        if (!v[0]) return 'اكتب كلمة السر الحالية';
        if (v[1].length < 6) return 'كلمة السر الجديدة لازم 6 أحرف على الأقل';
        if (v[1] !== v[2]) return 'كلمتين السر مش متطابقتين';
        var cred = fb().auth.EmailAuthProvider.credential(user.email, v[0]);
        return user.reauthenticateWithCredential(cred)
          .then(function () { return user.updatePassword(v[1]); })
          .then(function () { return null; }, authMsg);
      }
    }).then(function (r) { if (r) alert('✅ تغيّرت كلمة السر'); return !!r; });
  };

  // ---------- شاشة الدخول ----------
  function $(id) { return document.getElementById(id); }
  function setErr(m, ok) { var e = $('daErr'); if (e) { e.textContent = m || ''; e.style.color = ok ? '#2f855a' : '#c0392b'; } }
  function busy(b) { ['daLogin', 'daSignup', 'daReset'].forEach(function (id) { var e = $(id); if (e) e.disabled = b; }); }
  function vals() { return { em: (($('daEmail') || {}).value || '').trim(), pw: ($('daPass') || {}).value || '' }; }

  function overlay() {
    var ov = $('loginOverlay');
    if (ov) ov.remove();
    ov = el('div', 'position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#0B2447,#14476B 50%,#0F766E);display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto;font-family:' + FONT + ';direction:rtl;');
    ov.id = 'loginOverlay';
    return ov;
  }
  function hideApp() { var app = $('appContent'); if (app) app.classList.add('hidden'); }

  function showWall() {
    if (!hasApp()) return;
    hideApp();
    if ($('daForm')) return;
    var ov = overlay();
    ov.innerHTML =
      '<div style="background:#fff;border-radius:24px;padding:28px 22px;max-width:380px;width:100%;text-align:center;">' +
      '<div style="font-size:44px;">📒</div>' +
      '<h2 style="margin:8px 0 4px;color:#0B2447;font-size:24px;">دفتر المحاسبة amhaz</h2>' +
      '<p style="color:#666;font-size:13px;margin:0 0 18px;">سجّل دخول بإيميلك لتفوت<br>كل حساب عندو محلاتو لحال</p>' +
      '<form id="daForm" novalidate>' +
      '<input id="daEmail" type="email" placeholder="الإيميل" autocomplete="username" style="' + INP + '">' +
      '<input id="daPass" type="password" placeholder="كلمة السر - 6 أحرف على الأقل" autocomplete="current-password" style="' + INP + 'margin-bottom:12px;">' +
      '<button id="daLogin" type="submit" style="' + BTN + '">دخول</button>' +
      '<button id="daSignup" type="button" style="width:100%;padding:12px;border:none;background:none;color:#14476B;font-weight:700;cursor:pointer;margin-top:6px;font-family:inherit;">عمل حساب جديد - أول مرة كبس هون</button>' +
      '<button id="daReset" type="button" style="width:100%;padding:8px;border:none;background:none;color:#4F7284;font-size:13px;cursor:pointer;font-family:inherit;">نسيت كلمة السر؟</button>' +
      '</form>' +
      '<div id="daErr" style="color:#c0392b;font-size:13px;margin-top:8px;min-height:18px;"></div></div>';
    document.body.appendChild(ov);
    $('daForm').onsubmit = function (e) { e.preventDefault(); doLogin(); };
    $('daSignup').onclick = doSignup;
    $('daReset').onclick = doReset;
  }

  function showFatal(msg) {
    if (!hasApp()) return;
    hideApp();
    var ov = overlay();
    ov.innerHTML =
      '<div style="background:#fff;border-radius:24px;padding:28px 22px;max-width:380px;width:100%;text-align:center;">' +
      '<div style="font-size:44px;">📒</div>' +
      '<p id="daFatal" style="color:#c0392b;font-size:14px;margin:14px 0 18px;"></p>' +
      '<button id="daRetry" type="button" style="' + BTN + '">حاول من جديد</button></div>';
    document.body.appendChild(ov);
    $('daFatal').textContent = msg;
    $('daRetry').onclick = function () { location.reload(); };
  }

  function hideWall() {
    var ov = $('loginOverlay'); if (ov) ov.remove();
    var app = $('appContent');
    if (app) { app.classList.remove('hidden'); app.style.display = ''; }
  }

  function needSdk() {
    if (sdkOk()) return true;
    setErr('المزامنة ما حمّلت، تأكد من الانترنت');
    return false;
  }
  function checkInput(v) {
    if (!v.em || v.em.indexOf('@') < 0) { setErr('اكتب إيميل صح - لازم يكون فيه @'); return false; }
    if (!v.pw || v.pw.length < 6) { setErr('كلمة السر لازم تكون 6 أحرف على الأقل'); return false; }
    return true;
  }
  function doLogin() {
    var v = vals(); if (!checkInput(v) || !needSdk()) return;
    setErr('عم نسجّل دخول...', true); busy(true);
    fb().auth().signInWithEmailAndPassword(v.em, v.pw)
      .catch(function (e) { setErr(authMsg(e)); })
      .then(function () { busy(false); });
  }
  function doSignup() {
    var v = vals(); if (!checkInput(v) || !needSdk()) return;
    setErr('عم نعمل الحساب...', true); busy(true);
    fb().auth().createUserWithEmailAndPassword(v.em, v.pw)
      .catch(function (e) { setErr(authMsg(e)); })
      .then(function () { busy(false); });
  }
  function doReset() {
    var v = vals();
    if (!v.em || v.em.indexOf('@') < 0) { setErr('اكتب إيميلك أول'); return; }
    if (!needSdk()) return;
    busy(true);
    fb().auth().sendPasswordResetEmail(v.em)
      .then(function () { setErr('✅ بعتنالك رابط على الإيميل لتغيّر كلمة السر', true); })
      .catch(function (e) { setErr(authMsg(e)); })
      .then(function () { busy(false); });
  }

  // ---------- claude.use('db') / claude.use('assets') ----------
  function bookId() {
    var b = new URLSearchParams(location.search).get('b') || 'default';
    return b.replace(/[\/\s]/g, '_');
  }
  function basePath() {
    var u = getUser();
    if (!u) throw new Error('مش مسجّل دخول');
    return 'users/' + u.uid + '/books/' + bookId();
  }
  function makeDb() {
    return {
      collection: function (name) { return fb().firestore().collection(basePath() + '/' + name); },
      doc: function (path) { return fb().firestore().doc(basePath() + '/' + path); }
    };
  }

  function readAsDataURL(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(r.error || new Error('read failed')); };
      r.readAsDataURL(blob);
    });
  }
  function dataUrlToBlob(d) {
    var p = d.split(',');
    var mime = (p[0].match(/:(.*?);/) || [])[1] || 'application/octet-stream';
    var bin = atob(p[1]), n = bin.length, u8 = new Uint8Array(n);
    while (n--) u8[n] = bin.charCodeAt(n);
    return new Blob([u8], { type: mime });
  }
  // الصور بتنحفظ داخل Firestore (حد المستند ~1MB) - الدفتر بيصغّر الصور قبل الرفع
  var MAX_DATAURL = 900000;
  function makeAssets() {
    var cache = {};
    function col() { return fb().firestore().collection(basePath() + '/assets'); }
    return {
      upload: function (blob, opts) {
        var type = (opts && opts.type) || blob.type || 'application/octet-stream';
        return readAsDataURL(blob).then(function (data) {
          if (data.length > MAX_DATAURL) throw { code: 'too_large', message: 'الملف كبير كتير' };
          var id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
          return col().doc(id).set({ data: data, contentType: type, size: blob.size || 0, ts: Date.now() })
            .then(function () { return { id: id, contentType: type }; }, function (e) {
              var c = (e && e.code) || '';
              throw {
                code: c === 'resource-exhausted' ? 'quota_or_state' : (c === 'unavailable' ? 'store_unavailable' : (c || 'store_unavailable')),
                message: (e && e.message) || ''
              };
            });
        });
      },
      url: function (id) {
        if (cache[id]) return Promise.resolve(cache[id]);
        return col().doc(id).get().then(function (s) {
          if (!s.exists) return null;
          var u = URL.createObjectURL(dataUrlToBlob(s.data().data));
          cache[id] = u;
          return u;
        });
      },
      delete: function (id) {
        delete cache[id];
        return col().doc(id).delete();
      }
    };
  }

  window.claude = window.claude || {};
  window.claude.use = function (name) {
    return ready.then(function () {
      if (!getUser()) throw new Error('مش مسجّل دخول');
      if (name === 'db') return makeDb();
      if (name === 'assets') return makeAssets();
      throw new Error('غير مدعوم: ' + name);
    });
  };

  // ---------- تشغيل ----------
  function start() {
    try { if (!fb().apps.length) fb().initializeApp(window.FIREBASE_CONFIG); } catch (e) { }
    fb().auth().onAuthStateChanged(function (user) {
      window.CURRENT_UID = user ? user.uid : null;
      window.CURRENT_EMAIL = user ? user.email : null;
      settle();
      if (user) hideWall(); else showWall();
      listeners.forEach(function (cb) { try { cb(user); } catch (e) { console.error(e); } });
    }, function (e) { settle(); showFatal(authMsg(e)); });
  }
  function init() {
    if (!cfgOk()) { settle(); showFatal('لازم صاحب التطبيق يعبّي firebase-config.js'); return; }
    var t0 = Date.now();
    (function wait() {
      if (sdkOk()) { start(); return; }
      if (Date.now() - t0 > 8000) {
        settle();
        showFatal('ما قدرنا نحمّل المزامنة. تأكد من الانترنت وحاول من جديد.');
        return;
      }
      setTimeout(wait, 150);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
