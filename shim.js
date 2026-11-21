// دفتر المحاسبة 2 — shim.js (نسخة مصلّحة)
// - كلمة السر محفوظة مشفّرة (مش نص، ومش مكتوبة بالكود)
// - مزامنة سحابية بحساب Firebase حقيقي (إيميل + كلمة سر)، وكل مستخدم بيشوف بياناته بس
// - إذا Firebase مش معبّى: بيشتغل محلي على التلفون
// - صور الفواتير بتنحفظ على التلفون (IndexedDB)
(function(){
  const BOOK = new URLSearchParams(location.search).get('b') || 'ruwais-2026';
  const STORAGE_KEY = 'daftar_local_' + BOOK;
  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }

  // ================= SHA-256 (sync) =================
  const K256=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  function utf8Bytes(str){
    const out=[]; str=String(str);
    for(let i=0;i<str.length;i++){
      let c=str.charCodeAt(i);
      if(c>=0xd800&&c<0xdc00&&i+1<str.length){ const d=str.charCodeAt(i+1); if(d>=0xdc00&&d<0xe000){ c=0x10000+((c-0xd800)<<10)+(d-0xdc00); i++; } }
      if(c<0x80) out.push(c);
      else if(c<0x800) out.push(0xc0|(c>>6),0x80|(c&63));
      else if(c<0x10000) out.push(0xe0|(c>>12),0x80|((c>>6)&63),0x80|(c&63));
      else out.push(0xf0|(c>>18),0x80|((c>>12)&63),0x80|((c>>6)&63),0x80|(c&63));
    }
    return out;
  }
  function sha256(str){
    const bytes=utf8Bytes(str); const l=bytes.length;
    bytes.push(0x80); while(bytes.length%64!==56) bytes.push(0);
    const hi=Math.floor(l*8/4294967296), lo=(l*8)>>>0;
    bytes.push((hi>>>24)&255,(hi>>>16)&255,(hi>>>8)&255,hi&255,(lo>>>24)&255,(lo>>>16)&255,(lo>>>8)&255,lo&255);
    let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
    const w=new Array(64);
    for(let off=0;off<bytes.length;off+=64){
      for(let i=0;i<16;i++) w[i]=((bytes[off+i*4]<<24)|(bytes[off+i*4+1]<<16)|(bytes[off+i*4+2]<<8)|bytes[off+i*4+3])>>>0;
      for(let i=16;i<64;i++){
        const a=w[i-15], b=w[i-2];
        const s0=((a>>>7)|(a<<25))^((a>>>18)|(a<<14))^(a>>>3);
        const s1=((b>>>17)|(b<<15))^((b>>>19)|(b<<13))^(b>>>10);
        w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;
      }
      let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
      for(let i=0;i<64;i++){
        const S1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7));
        const ch=(e&f)^((~e)&g);
        const t1=(h+S1+ch+K256[i]+w[i])>>>0;
        const S0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10));
        const maj=(a&b)^(a&c)^(b&c);
        const t2=(S0+maj)>>>0;
        h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
      }
      h0=(h0+a)>>>0; h1=(h1+b)>>>0; h2=(h2+c)>>>0; h3=(h3+d)>>>0; h4=(h4+e)>>>0; h5=(h5+f)>>>0; h6=(h6+g)>>>0; h7=(h7+h)>>>0;
    }
    return [h0,h1,h2,h3,h4,h5,h6,h7].map(x=>('00000000'+x.toString(16)).slice(-8)).join('');
  }

  // ================= كلمة السر (مشفّرة، محلية) =================
  const PW_KEY='daftar_pw_v1', FAIL_KEY='daftar_pw_fail';
  const ROUNDS=5000;
  function randSalt(){
    try{ const a=new Uint8Array(16); crypto.getRandomValues(a); return Array.from(a).map(x=>('0'+x.toString(16)).slice(-2)).join(''); }
    catch(e){ let s=''; for(let i=0;i<32;i++) s+=Math.floor(Math.random()*16).toString(16); return s; }
  }
  function hashPw(pw,salt){ let h=sha256(salt+':'+pw); for(let i=0;i<ROUNDS;i++) h=sha256(h+salt+pw); return h; }
  function readPw(){ try{ const o=JSON.parse(lsGet(PW_KEY)||'null'); return (o&&o.salt&&o.hash)?o:null; }catch(e){ return null; } }
  function setPwSync(pw){ const salt=randSalt(); lsSet(PW_KEY, JSON.stringify({salt:salt,hash:hashPw(String(pw),salt),v:1})); lsDel(FAIL_KEY); }
  // ترحيل كلمة السر القديمة (نص عادي) إلى نسخة مشفّرة، وبعدين مسح القديمة
  (function migrateLegacy(){
    const legacy=lsGet('daftar2_password')||lsGet('dm_pass');
    if(!readPw() && legacy && String(legacy).length>=4) setPwSync(legacy);
    lsDel('daftar2_password'); lsDel('dm_pass'); lsDel('dm_auth');
  })();
  function lockLeft(){ try{ const f=JSON.parse(lsGet(FAIL_KEY)||'null'); if(f&&f.until&&f.until>Date.now()) return Math.ceil((f.until-Date.now())/1000); }catch(e){} return 0; }
  function registerFail(){
    let f={n:0,until:0}; try{ f=JSON.parse(lsGet(FAIL_KEY)||'null')||f; }catch(e){}
    f.n=(f.n||0)+1; if(f.n>=5){ f.until=Date.now()+30000*Math.min(8,f.n-4); }
    lsSet(FAIL_KEY, JSON.stringify(f));
  }
  async function verify(pw){
    const o=readPw(); if(!o) return false;
    if(lockLeft()>0) return false;
    const ok=hashPw(String(pw||''),o.salt)===o.hash;
    if(ok) lsDel(FAIL_KEY); else registerFail();
    return ok;
  }

  // ---------- شبابيك الإدخال ----------
  function whenBody(fn){ if(document.body) fn(); else document.addEventListener('DOMContentLoaded',fn); }
  function dialog(cfg){
    return new Promise(resolve=>{
      whenBody(()=>{
        const ov=document.createElement('div');
        ov.style.cssText='position:fixed;inset:0;background:linear-gradient(180deg,#071a31,#174b7c);z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:20px;direction:rtl;font-family:Tahoma,Arial,sans-serif';
        const box=document.createElement('div');
        box.style.cssText='background:#fff;border-radius:20px;padding:24px 20px;max-width:360px;width:100%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.35);color:#071a31';
        const ic=document.createElement('div'); ic.textContent='🔒'; ic.style.cssText='font-size:38px;margin-bottom:6px'; box.appendChild(ic);
        const h=document.createElement('div'); h.textContent=cfg.title; h.style.cssText='font-weight:bold;font-size:17px;margin-bottom:6px'; box.appendChild(h);
        if(cfg.note){ const n=document.createElement('div'); n.textContent=cfg.note; n.style.cssText='font-size:13px;color:#718096;margin-bottom:10px;line-height:1.6'; box.appendChild(n); }
        const inputs=cfg.fields.map(ph=>{
          const i=document.createElement('input'); i.type='password'; i.placeholder=ph; i.autocomplete='off';
          i.style.cssText='display:block;width:100%;padding:12px;margin:8px 0;border:1px solid #dce6f2;border-radius:10px;font-size:16px;text-align:center;box-sizing:border-box';
          box.appendChild(i); return i;
        });
        const err=document.createElement('div'); err.style.cssText='color:#c0392b;font-size:13px;min-height:18px;margin:4px 0'; box.appendChild(err);
        const ok=document.createElement('button'); ok.textContent=cfg.okText||'تأكيد';
        ok.style.cssText='width:100%;padding:13px;border:none;border-radius:12px;background:#174675;color:#fff;font-weight:bold;font-size:16px;cursor:pointer;margin-top:4px';
        box.appendChild(ok);
        let cancel=null;
        if(cfg.cancelText){ cancel=document.createElement('button'); cancel.textContent=cfg.cancelText; cancel.style.cssText='width:100%;padding:10px;border:none;background:transparent;color:#718096;font-size:14px;cursor:pointer;margin-top:4px'; box.appendChild(cancel); }
        ov.appendChild(box); document.body.appendChild(ov);
        setTimeout(()=>{ try{ inputs[0].focus(); }catch(e){} },80);
        let busy=false;
        async function submit(){
          if(busy) return; busy=true; ok.disabled=true;
          let msg=null;
          try{ msg=await cfg.validate(inputs.map(i=>i.value)); }catch(e){ msg='صار خطأ، جرّب كمان'; }
          busy=false; ok.disabled=false;
          if(msg){ err.textContent=msg; inputs.forEach(i=>{ i.value=''; }); try{ inputs[0].focus(); }catch(e){} return; }
          ov.remove(); resolve(true);
        }
        ok.onclick=submit;
        inputs.forEach(i=>i.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); submit(); } }));
        if(cancel) cancel.onclick=()=>{ ov.remove(); resolve(false); };
      });
    });
  }
  function checkNew(v,c){
    if(!v||String(v).length<4) return 'كلمة السر لازم تكون 4 أحرف أو أرقام على الأقل';
    if(v!==c) return 'التأكيد مش متطابق';
    return null;
  }
  const unlockValidate=async function(vals){
    const left=lockLeft(); if(left>0) return 'محاولات كتير غلط. استنّى '+left+' ثانية';
    return (await verify(vals[0])) ? null : (lockLeft()>0?'محاولات كتير غلط. استنّى شوي':'كلمة السر غلط');
  };
  const Auth={
    hasPassword:function(){ return !!readPw(); },
    verify:verify,
    // mode: 'setup' | 'unlock' | 'confirm' | 'change'
    ask:function(o){
      o=o||{}; let mode=o.mode||'unlock';
      if(!readPw() && mode!=='setup') mode='setup';
      if(mode==='setup') return dialog({title:o.title||'اختار كلمة سر للدفتر', note:'بتحتاجها كل ما تفتح الدفتر. ما في طريقة لاسترجاعها، فاحفظها منيح.', fields:['كلمة السر الجديدة','أكّد كلمة السر'], okText:'حفظ', validate:async function(v){ const m=checkNew(v[0],v[1]); if(m) return m; setPwSync(v[0]); return null; }});
      if(mode==='change') return dialog({title:o.title||'تغيير كلمة السر', fields:['كلمة السر القديمة','كلمة السر الجديدة','أكّد الجديدة'], okText:'تغيير', cancelText:'إلغاء', validate:async function(v){ const left=lockLeft(); if(left>0) return 'استنّى '+left+' ثانية'; if(!(await verify(v[0]))) return 'كلمة السر القديمة غلط'; const m=checkNew(v[1],v[2]); if(m) return m; setPwSync(v[1]); return null; }});
      if(mode==='confirm') return dialog({title:o.title||'حط كلمة السر', fields:['كلمة السر'], okText:'تأكيد', cancelText:'إلغاء', validate:unlockValidate});
      return dialog({title:o.title||'أدخل كلمة السر للدخول', fields:['كلمة السر'], okText:'دخول', cancelText:o.cancelText||null, validate:unlockValidate});
    },
    changeInteractive:function(){ return Auth.ask({mode:readPw()?'change':'setup'}); }
  };
  window.DaftarAuth=Auth;

  // ================= الحساب السحابي (Firebase Auth) =================
  function isFirebaseValid(){
    const c = window.FIREBASE_CONFIG;
    return !!(c && c.apiKey && c.apiKey !== 'PASTE_HERE' && c.apiKey.length > 10 && c.projectId && c.projectId !== 'PASTE_HERE' && c.authDomain && c.authDomain !== 'PASTE_HERE' && c.appId && c.appId !== 'PASTE_HERE');
  }
  function fbInit(){
    if(!window.firebase) throw new Error('firebase sdk missing');
    if(!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
  }
  Auth.cloudEnabled=function(){ return isFirebaseValid(); };
  Auth.sdkLoaded=function(){ return !!(window.firebase && firebase.auth && firebase.firestore); };
  Auth.currentUser=function(){ try{ if(!isFirebaseValid()||!Auth.sdkLoaded()) return null; fbInit(); return firebase.auth().currentUser||null; }catch(e){ return null; } };
  Auth.waitForUser=function(){
    return new Promise(function(res){
      try{
        if(!isFirebaseValid()||!Auth.sdkLoaded()){ res(null); return; }
        fbInit(); const a=firebase.auth(); let done=false;
        const t=setTimeout(function(){ if(!done){ done=true; res(a.currentUser||null); } },8000);
        const un=a.onAuthStateChanged(function(u){ if(done) return; done=true; clearTimeout(t); try{ un(); }catch(e){} res(u||null); });
      }catch(e){ res(null); }
    });
  };

  // ================= قاعدة البيانات =================
  function loadStore(){ try{ const s = JSON.parse(lsGet(STORAGE_KEY) || '{}'); if(!s.collections) s.collections={}; return s; }catch(e){ return {collections:{}}; } }
  function saveStore(s){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }catch(e){} }
  function makeLocalDB(){
    let store = loadStore();
    let listeners = [];
    function getColl(name){ if(!store.collections[name]) store.collections[name]={}; return store.collections[name]; }
    function makeSnapshot(collName, field, dir){
      const coll = getColl(collName);
      let docs = Object.keys(coll).map(id => ({ id: id, data: function(){ return JSON.parse(JSON.stringify(coll[id])); }, exists: true }));
      if(field){
        docs.sort((a,b)=>{
          const av = a.data()[field] || 0, bv = b.data()[field] || 0;
          if(av < bv) return dir === 'desc' ? 1 : -1;
          if(av > bv) return dir === 'desc' ? -1 : 1;
          return 0;
        });
      }
      return { docs: docs, forEach: function(fn){ docs.forEach(fn); }, empty: docs.length===0, size: docs.length };
    }
    function notify(collName){
      saveStore(store);
      listeners.filter(l=>l.coll===collName).forEach(l=>{
        try{ l.cb(makeSnapshot(collName, l.field, l.dir)); }catch(e){}
      });
    }
    function parsePath(p){
      const parts = String(p).split('/');
      return { coll: parts[0], id: parts.slice(1).join('/') };
    }
    function docRef(path){
      const {coll, id} = parsePath(path);
      return {
        id: id,
        path: path,
        get: async function(){
          const c = getColl(coll);
          const exists = !!(c && c[id] !== undefined);
          const val = exists ? JSON.parse(JSON.stringify(c[id])) : null;
          return { exists: exists, id: id, data: function(){ return val; } };
        },
        set: async function(data){
          const c = getColl(coll); c[id] = JSON.parse(JSON.stringify(data||{})); notify(coll); return;
        },
        update: async function(partial){
          const c = getColl(coll); const cur = c[id] || {}; c[id] = Object.assign({}, cur, partial); notify(coll); return;
        },
        delete: async function(){
          const c = getColl(coll); delete c[id]; notify(coll); return;
        },
        onSnapshot: function(cb){
          const wrapper = function(snap){
            const found = snap.docs.find(d=>d.id===id);
            cb({ exists: !!found, id: id, data: function(){ return found ? found.data() : null; } });
          };
          listeners.push({coll: coll, field: null, dir: null, cb: wrapper, isDoc: true, docId: id});
          const c = getColl(coll);
          const exists = !!(c && c[id] !== undefined);
          const val = exists ? JSON.parse(JSON.stringify(c[id])) : null;
          setTimeout(()=>cb({ exists: exists, id: id, data: function(){ return val; } }), 0);
          return function(){ listeners = listeners.filter(l=>l.cb!==wrapper); };
        }
      };
    }
    function collRef(name){
      return {
        _name: name,
        doc: function(id){ return docRef(name + '/' + id); },
        add: async function(data){
          const c = getColl(name);
          const id = 'local_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
          c[id] = JSON.parse(JSON.stringify(data||{})); notify(name); return { id: id };
        },
        get: async function(){ return makeSnapshot(name, null, null); },
        onSnapshot: function(cb){
          listeners.push({coll: name, field: null, dir: null, cb: cb});
          setTimeout(()=>{ try{ cb(makeSnapshot(name, null, null)); }catch(e){} }, 0);
          return function(){ listeners = listeners.filter(l=>l.cb!==cb); };
        },
        orderBy: function(field, dir){
          return {
            get: async function(){ return makeSnapshot(name, field, dir); },
            onSnapshot: function(cb){
              listeners.push({coll: name, field: field, dir: dir, cb: cb});
              setTimeout(()=>{ try{ cb(makeSnapshot(name, field, dir)); }catch(e){} }, 0);
              return function(){ listeners = listeners.filter(l=>l.cb!==cb); };
            }
          };
        },
        where: function(){ return collRef(name); }
      };
    }
    return { collection: collRef, doc: docRef };
  }

  let fs = null;
  async function migrateLocalToCloud(rootFn){
    const flag='daftar_migrated_'+(firebase.auth().currentUser?firebase.auth().currentUser.uid:'x')+'_'+BOOK;
    if(lsGet(flag)) return;
    const s=loadStore(); const cols=Object.keys(s.collections||{});
    let allOk=true;
    for(const c of cols){
      const ids=Object.keys(s.collections[c]||{}); if(!ids.length) continue;
      try{
        const snap=await rootFn().collection(c).limit(1).get({source:'server'});
        if(!snap.empty) continue; // السحابة فيها بيانات أصلاً - ما منكتب فوقها
        for(let i=0;i<ids.length;i+=400){
          const bt=fs.batch();
          ids.slice(i,i+400).forEach(id=>bt.set(rootFn().collection(c).doc(id), s.collections[c][id]));
          await bt.commit();
        }
      }catch(e){ allOk=false; }
    }
    if(allOk) lsSet(flag,'1');
  }
  function makeFirebaseDB(user){
    fbInit();
    if(!fs){
      fs = firebase.firestore();
      try{ fs.enablePersistence({synchronizeTabs:true}).catch(()=>{}); }catch(e){}
    }
    function root(){ return fs.collection('users').doc(user.uid).collection('books').doc(BOOK); }
    migrateLocalToCloud(root).catch(()=>{});
    return {
      collection: function(n){ return root().collection(n); },
      doc: function(p){ const a=p.split('/'); return root().collection(a[0]).doc(a.slice(1).join('/')); }
    };
  }

  // ================= تنزيل / مشاركة ملفات =================
  const dl = {
    async save({filename, data}){
      const blob = data instanceof Blob ? data : new Blob([data]);
      const C = window.Capacitor;
      if(C && C.isNativePlatform && C.isNativePlatform() && C.Plugins.Filesystem && C.Plugins.Share){
        const b64 = await new Promise(r=>{ const f=new FileReader(); f.onload=()=>r(String(f.result).split(',')[1]); f.readAsDataURL(blob); });
        const w = await C.Plugins.Filesystem.writeFile({path: filename, data: b64, directory: 'CACHE'});
        await C.Plugins.Share.share({title: filename, url: w.uri});
      } else {
        const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); a.remove();
      }
    }
  };

  // ================= صور الفواتير (محفوظة على التلفون - IndexedDB) =================
  function idb(){ return new Promise(function(res,rej){ const r=indexedDB.open('daftar_assets',1); r.onupgradeneeded=function(){ r.result.createObjectStore('f'); }; r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }); }
  async function idbOp(mode,fn){ const d=await idb(); return new Promise(function(res,rej){ const tx=d.transaction('f',mode); const rq=fn(tx.objectStore('f')); tx.oncomplete=function(){ res(rq&&rq.result); }; tx.onerror=tx.onabort=function(){ rej(tx.error); }; }); }
  const assets={
    async upload(blob,opts){
      if(blob.size>8*1024*1024) throw {code:'too_large',message:'الملف كبير'};
      const id='a'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
      const type=(opts&&opts.type)||blob.type||'application/octet-stream';
      try{ await idbOp('readwrite',function(s){ return s.put({blob:blob,type:type},id); }); }
      catch(e){ throw {code:'quota_or_state',message:String(e&&e.message||e)}; }
      return {id:id, contentType:type};
    },
    async delete(id){ try{ await idbOp('readwrite',function(s){ return s.delete(id); }); }catch(e){} }
  };
  const urlCache={};
  async function getRec(id){ try{ return await idbOp('readonly',function(s){ return s.get(id); }); }catch(e){ return null; } }
  async function blobUrl(id){ if(urlCache[id]) return urlCache[id]; const r=await getRec(id); if(!r) return null; urlCache[id]=URL.createObjectURL(r.blob); return urlCache[id]; }
  function patchEl(el){
    if(!el||el.nodeType!==1) return;
    const list=[el].concat(Array.prototype.slice.call(el.querySelectorAll?el.querySelectorAll('[src^="/_blob/"],[href^="/_blob/"]'):[]));
    list.forEach(function(x){
      ['src','href'].forEach(function(attr){
        const v=x.getAttribute&&x.getAttribute(attr);
        if(v&&v.indexOf('/_blob/')===0){
          const id=v.slice(7); x.setAttribute('data-blob',id);
          if(attr==='href') x.setAttribute('href','#');
          else x.removeAttribute('src');
          blobUrl(id).then(function(u){ if(u){ if(attr==='src') x.setAttribute('src',u); } else if(attr==='src'){ x.dispatchEvent(new Event('error')); } });
        }
      });
    });
  }
  function startBlobPatcher(){
    whenBody(function(){
      patchEl(document.body);
      new MutationObserver(function(ms){ ms.forEach(function(m){ m.addedNodes.forEach(patchEl); }); }).observe(document.body,{childList:true,subtree:true});
      document.addEventListener('click',async function(e){
        const a=e.target&&e.target.closest&&e.target.closest('a[data-blob]'); if(!a) return;
        e.preventDefault(); e.stopPropagation();
        const rec=await getRec(a.getAttribute('data-blob')); if(!rec){ alert('الملف مش موجود على هالتلفون'); return; }
        if(String(rec.type).indexOf('image/')===0){
          const u=await blobUrl(a.getAttribute('data-blob'));
          const ov=document.createElement('div'); ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:2147482000;display:flex;align-items:center;justify-content:center';
          const im=document.createElement('img'); im.src=u; im.style.cssText='max-width:100%;max-height:100%;object-fit:contain';
          ov.appendChild(im); ov.onclick=function(){ ov.remove(); }; document.body.appendChild(ov);
        } else {
          try{ await dl.save({filename:'فاتورة.pdf', data:rec.blob}); }catch(err){}
        }
      },true);
    });
  }
  startBlobPatcher();

  // ================= claude.use =================
  let cachedDB = null;
  window.claude = { use: async function(n){
    if(n==='downloads') return dl;
    if(n==='assets') return assets;
    if(n==='db'){
      if(cachedDB) return cachedDB;
      if(isFirebaseValid()){
        if(!Auth.sdkLoaded()){
          whenBody(function(){ alert('ما قدرت حمّل مكتبة المزامنة. تأكد من الانترنت وافتح البرنامج من جديد.'); });
          return null; // ما منفتح محلي بالغلط حتى ما تتفرّق البيانات
        }
        const u=await Auth.waitForUser();
        if(!u){ location.replace('index.html'); return new Promise(function(){}); }
        try{ cachedDB=makeFirebaseDB(u); window.__DAFTAR_MODE__='firebase'; return cachedDB; }
        catch(e){ console.log('Firebase failed', e); return null; }
      }
      cachedDB = makeLocalDB();
      window.__DAFTAR_MODE__ = 'local';
      return cachedDB;
    }
    return null;
  }};

  // ---------- زر الرجوع: نسخة نهائية بسيطة ----------
  // الفكرة: ما نعتمد على Capacitor App بس. نعتمد على التاريخ نفسه.
  // كل صفحة بتحط حاجز بالتاريخ، والرجوع بيفك الحاجز مش بيطلعك.
  let lastBack = 0;
  function isLedger(){
    return location.href.indexOf('ledger.html') !== -1;
  }
  function toastBack(msg){
    let t = document.getElementById('backToast2');
    if(!t){
      t = document.createElement('div');
      t.id = 'backToast2';
      t.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#071a31;color:#fff;padding:11px 20px;border-radius:22px;font-size:15px;font-family:Tahoma;z-index:999999;box-shadow:0 10px 25px rgba(0,0,0,.35);white-space:nowrap';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._h);
    t._h = setTimeout(()=>{ t.style.display='none'; }, 2000);
  }
  function goHome(){
    window.location.href = 'index.html';
  }
  function setupBackFinal(){
    // 1) حط حاجز فوراً
    try{ history.pushState({guard:1}, '', location.href); }catch(e){}
    // 2) إذا ضغط رجوع، هيدا الحدث بيجي
    window.addEventListener('popstate', function(){
      if(isLedger()){
        // بالحساب -> روح على الرئيسية
        goHome();
      } else {
        // بالرئيسية -> مرتين لتطلع
        const now = Date.now();
        if(now - lastBack < 2000){
          // تاني مرة: خليه يطلع طبيعي - ما تحط حاجز، خليه يروح
          // بنرجع حاجز واحد كرمال ما يعلق، وبعدين منخليه يطلع عبر Capacitor إذا موجود
          const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
          if(App && App.exitApp){ try{ App.exitApp(); }catch(e){} }
          else { history.back(); }
          return;
        }
        lastBack = now;
        toastBack('كبس رجوع مرة تانية لتطلع من البرنامج');
        // رجّع الحاجز كرمال ما يطلع هلق
        try{ history.pushState({guard:1}, '', location.href); }catch(e){}
      }
    });
    // 3) Capacitor App - إذا موجود، سجّل كمان، بس كرمال يمنع الطلعة
    let tries = 0;
    function tryApp(){
      const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
      if(App && App.addListener){
        try{
          App.addListener('backButton', function(){
            if(isLedger()){ goHome(); }
            else {
              const now = Date.now();
              if(now - lastBack < 2000){
                try{ App.exitApp(); }catch(e){}
              } else {
                lastBack = now;
                toastBack('كبس رجوع مرة تانية لتطلع من البرنامج');
              }
            }
          });
          return true;
        }catch(e){ return false; }
      }
      return false;
    }
    if(!tryApp()){
      const iv = setInterval(()=>{
        tries++;
        if(tryApp() || tries > 30) clearInterval(iv);
      }, 400);
    }
    // 4) زر الرجوع تبع المتصفح (Cordova قديم)
    document.addEventListener('backbutton', function(e){
      try{ e.preventDefault(); }catch(err){}
      if(isLedger()) goHome();
      else toastBack('كبس رجوع مرة تانية لتطلع من البرنامج');
    }, false);
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', setupBackFinal);
  } else {
    setupBackFinal();
  }
  // تأكيد انو الشيم تحمّل - بيبين ثانية وحدة أول ما تفتح الصفحة
  // إذا شفت هالرسالة، يعني shim.js عم يتحمّل صح
  // (منشيلها بعد ما نتأكد)
})();
