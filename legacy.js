
// Fix PWA viewport height en iOS standalone

// ── CONFIG ────────────────────────────────────────────────────────────────────
// Reemplaza con la URL de tu proyecto Supabase:
// https://<proyecto>.supabase.co/functions/v1/scan-payment
const SCAN_URL='https://joavdkofhurqtfuzneid.supabase.co/functions/v1/scan-payment';

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const SUPABASE_URL='https://joavdkofhurqtfuzneid.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvYXZka29maHVycXRmdXpuZWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NzEwMDAsImV4cCI6MjA5MjA0NzAwMH0.zBdEaxj3UoaqZ8-eL8Z0cH6-3svTDUBEdlSPIvmL-j4';
/*
  SQL to run in Supabase dashboard:
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city text;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation text;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age integer;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS guide_seen boolean DEFAULT false;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_user_data jsonb;
*/
const _sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{
  auth:{
    autoRefreshToken:true,
    persistSession:true,
    detectSessionInUrl:true,
    flowType:'pkce'
  }
});
let _supaUser=null;
let _appReady=false;

// ── DATA ──────────────────────────────────────────────────────────────────────
const SK='hormi_v2';
const CATS=[
  {id:'food',e:'🍔',l:'comida'},{id:'drink',e:'☕',l:'café/bebidas'},{id:'snack',e:'🍪',l:'snacks'},
  {id:'del',e:'📦',l:'delivery'},{id:'trans',e:'🚗',l:'transporte'},{id:'subs',e:'📱',l:'apps/subs'},
  {id:'health',e:'💊',l:'salud'},{id:'beauty',e:'💅',l:'belleza'},{id:'sport',e:'🏋️',l:'deporte'},
  {id:'edu',e:'📚',l:'educación'},{id:'shop',e:'👗',l:'ropa'},{id:'soc',e:'🥂',l:'social'},
  {id:'enter',e:'🎮',l:'entret.'},{id:'market',e:'🛒',l:'mercado'},{id:'other',e:'🫙',l:'otros'}
];
const HP=[
  {e:'☕',l:'café diario'},{e:'🍪',l:'snacks'},{e:'🥤',l:'gaseosa'},{e:'🥐',l:'empanadas'},
  {e:'🧋',l:'bubble tea'},{e:'🚕',l:'taxi extra'},{e:'🎮',l:'compras in-app'},
  {e:'🛒',l:'compras sin lista'},{e:'🍕',l:'antojos nocturnos'},{e:'🧴',l:'cosméticos impulso'},
  {e:'🛍️',l:'ropa innecesaria'},{e:'🎬',l:'más suscripciones'}
];
const MO=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function capFirst(s){return s?s.charAt(0).toUpperCase()+s.slice(1):s;}
const DA=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

let D={name:'',budget:30,threshold:25,hormis:[],goals:[],transactions:[],customCats:[],aliases:{},
  isPro:false,trialStart:null,trialUsed:false,scanCount:0,scanCountDate:'',onboarded:false,
  proCode:null,proSince:null,tooltipsSeen:[],guideSeen:false,trialUserData:null,plan:null,planChecked:{},planOutput:null};
let _statsMonth = new Date().toISOString().slice(0,7); // YYYY-MM seleccionado en Análisis
let aCat='food',aHormi=true,obGoalHormi=null,mgHormi=null;
let wkOffset=0,calY=new Date().getFullYear(),calM=new Date().getMonth();
let txDate=null,scanReceiptTs=null,_currentThumb=null,_scanPending=null,_dayDs=null,_selDay=null,_txSource='manual';
let _scanState='idle'; // idle | processing | ready | error
let _voiceMode=false;
let _scanSheetOpen=false;
let _swipeX=0,_swipeY=0,_swipeReady=false;
let _selectedPlan='mensual',_pendingProCallback=null;
let _editHormi=false,_editCat='other';
let _planStage=1;
let _planFD={objetivo:'',objetivoCustom:'',metaTotal:0,meses:6,ingresoFijo:0,ingresoVariable:0,gastosFijos:[{label:'Alquiler',monto:500},{label:'Luz/Agua',monto:80}],alimentacion:0,transporte:0,ocio:0};
let _planChecked={},_planLimitApplied=false,_planPastOpen=false,_planCachedPastMonths=[],_planSelectedOpt=null;

function load(){try{const s=localStorage.getItem(SK);if(s)D={...D,...JSON.parse(s)};}catch(e){}}
let _sdTimer=null;
function save(){
  localStorage.setItem(SK,JSON.stringify(D));
  // debounced remote sync (1.5s after last save)
  if(_supaUser){clearTimeout(_sdTimer);_sdTimer=setTimeout(saveUserData,1500);}
}
function td(){const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;}
function fmt(n){return'S/ '+(+n).toFixed(2);}

// ── BOOT ──────────────────────────────────────────────────────────────────────
load();

let _loadingUser=false;

_sb.auth.onAuthStateChange(async(event,session)=>{
  console.log('Auth event:',event,session?.user?.email);
  if(event==='SIGNED_IN'&&session?.user){
    if(_supaUser?.id===session.user.id)return;
    _supaUser=session.user;
    // Show s-ready — título neutro porque D.onboarded no está cargado aún
    document.getElementById('ready-title').textContent='¡Hola!';
    document.getElementById('ready-msg').textContent='Cargando tu cuenta...';
    const btn=document.getElementById('ready-btn');
    if(btn){btn.textContent='Comencemos';btn.disabled=false;}
    _hideAllScreens();
    document.getElementById('s-welcome').style.display='none';
    document.getElementById('s-ready').style.display='flex';
    return;
  }
  if(event==='SIGNED_OUT'){
    _supaUser=null;
    localStorage.removeItem(SK);
    _hideAllScreens();
    document.getElementById('s-welcome').style.display='flex';
  }
  if(event==='TOKEN_REFRESHED'&&!session){
    // Refresh failed — session expired, send to welcome
    _supaUser=null;
    localStorage.removeItem(SK);
    showWelcome();
  }
});

async function initApp(){
  const url=new URL(window.location.href);
  const hasCode=url.searchParams.has('code');
  if(hasCode){
    console.log('OAuth callback — procesando code...');
    // Let Supabase process the code FIRST, then clean URL
    const{data:{session},error}=await _sb.auth.getSession();
    console.log('Session after code:',session?.user?.email,error?.message);
    window.history.replaceState({},'','/');
    if(session?.user){
      _supaUser=session.user;
      // Show s-ready — título neutro porque D.onboarded no está cargado aún
      document.getElementById('ready-title').textContent='¡Hola!';
      document.getElementById('ready-msg').textContent='Cargando tu cuenta...';
      const btn=document.getElementById('ready-btn');
      if(btn){btn.textContent='Comencemos';btn.disabled=false;}
      _hideAllScreens();
      document.getElementById('s-welcome').style.display='none';
      document.getElementById('s-ready').style.display='flex';
    }else{
      // Exchange failed — show welcome
      document.getElementById('s-welcome').style.display='flex';
    }
    return;
  }
  // No code — check for existing session
  try{
    const{data:{session}}=await _sb.auth.getSession();
    if(session?.user){
      _supaUser=session.user;
      await loadUserData(session.user.id);
    }
  }catch(e){
    console.error('initApp:',e);
  }
}
initApp();


function showOb(){
  _hideAllScreens();
  document.getElementById('s-welcome').style.display='none';
  const obEl=document.getElementById('ob');
  if(obEl){obEl.style.display='flex';console.log('showOb: ob display=',obEl.style.display);}
  else{console.error('showOb: #ob element NOT FOUND');}
  buildHormiChips();
  obProg(0);
}
let _guideShown=false;
function showMain(){
  _hideAllScreens();
  document.getElementById('s-welcome').style.display='none';
  document.getElementById('main').style.display='block';
  if(!D.customCats)D.customCats=[];if(!D.aliases)D.aliases={};
  // init new D fields if missing
  if(D.isPro===undefined)D.isPro=false;
  if(!D.trialStart)D.trialStart=null;
  if(!D.trialUsed)D.trialUsed=false;
  if(!D.scanCount)D.scanCount=0;
  if(!D.scanCountDate)D.scanCountDate='';
  if(!D.tooltipsSeen)D.tooltipsSeen=[];
  if(!_guideShown&&!D.guideSeen){_guideShown=true;setTimeout(()=>showGuide(),800);}
  if(!D.proCode)D.proCode=null;
  if(!D.proSince)D.proSince=null;
  // pre-fill date field
  const dateIn=document.getElementById('a-date');if(dateIn)dateIn.value=_selDay||td();
  buildAddGrid();buildMgChips();
  // touch swipe en semana
  const wr=document.getElementById('wk-row');
  let _tx0=0;
  wr.addEventListener('touchstart',e=>{_tx0=e.touches[0].clientX;},{passive:true});
  wr.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-_tx0;if(Math.abs(dx)>45)navWeek(dx>0?-1:1);},{passive:true});
  renderHome();
  // Welcome-back toast — once per app session
  if(D.name&&!D._welcomeShown){
    D._welcomeShown=true;
    const h=new Date().getHours();
    const g=h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';
    setTimeout(()=>toast(`${g}, ${esc(D.name)} 🐜`,'ok'),500);
  }
}

// ── AUTH SCREENS ──────────────────────────────────────────────────────────────
function _hideAllScreens(){
  // Hide everything EXCEPT s-welcome (visible by default via CSS)
  ['s-register','s-login','s-confirm','s-verify','s-ready','s-terms','s-forgot'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.classList.remove('on');el.style.display='none';}
  });
  ['ob','main'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.style.display='none';
  });
}
function showWelcome(){
  _hideAllScreens();
  document.getElementById('s-welcome').style.display=''; // let CSS display:flex take over
  setTimeout(()=>_initWcSwipe(),50);
}
function showAuthScreen(id){
  _hideAllScreens();
  const el=document.getElementById(id);
  if(el){el.style.display='flex';el.classList.add('on');}
  ['reg-err','login-err'].forEach(e=>{const el=document.getElementById(e);if(el)el.textContent='';});
}

function _authSpinner(btnId,on){
  const btn=document.getElementById(btnId);
  if(!btn)return;
  btn.disabled=on;
  if(on){btn.dataset.orig=btn.innerHTML;btn.innerHTML='<span class="auth-spin"></span>';}
  else btn.innerHTML=btn.dataset.orig||btn.innerHTML;
}
function _gDisable(ids,on){ids.forEach(id=>{const b=document.getElementById(id);if(b)b.disabled=on;});}

function _authErrMsg(err){
  const m=err?.message||'';
  if(/invalid.*credentials|invalid login/i.test(m))return'Email o contraseña incorrectos';
  if(/email.*confirm|not confirmed/i.test(m))return'Confirma tu email antes de continuar';
  if(/already registered|already exists/i.test(m))return'Ya existe una cuenta con ese email';
  if(/password.*6|at least 6/i.test(m))return'La contraseña debe tener al menos 6 caracteres';
  if(/invalid.*email/i.test(m))return'Email inválido';
  if(m)return m;
  return'Algo salió mal — intenta de nuevo';
}

function togglePass(inputId,btnId){
  const inp=document.getElementById(inputId);
  if(!inp)return;
  const isText=inp.type==='text';
  inp.type=isText?'password':'text';
  const openIco=document.getElementById(btnId+'-open');
  const closedIco=document.getElementById(btnId+'-closed');
  if(openIco)openIco.style.display=isText?'':'none';
  if(closedIco)closedIco.style.display=isText?'none':'';
}

async function doRegister(){
  const email=document.getElementById('reg-email').value.trim();
  const pass=document.getElementById('reg-pass').value;
  const pass2=document.getElementById('reg-pass2').value;
  const errEl=document.getElementById('reg-err');
  errEl.textContent='';
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){errEl.textContent='Email inválido';return;}
  if(pass.length<6){errEl.textContent='La contraseña debe tener al menos 6 caracteres';return;}
  if(pass!==pass2){errEl.textContent='Las contraseñas no coinciden';return;}
  _authSpinner('reg-btn',true);_gDisable(['reg-google-btn'],true);
  const{data,error}=await _sb.auth.signUp({email,password:pass});
  _authSpinner('reg-btn',false);_gDisable(['reg-google-btn'],false);
  if(error){errEl.textContent=_authErrMsg(error);return;}
  if(data.session){
    // Email confirmation disabled — SIGNED_IN will fire → shows s-ready
    _supaUser=data.session.user;
  }else if(data.user){
    // Email confirmation enabled — show s-verify
    _lastRegEmail=email;
    const msg=document.getElementById('verify-email-msg');
    if(msg)msg.textContent=`Te enviamos un link de verificación a ${email}. Haz clic en él y luego vuelve aquí.`;
    _hideAllScreens();
    document.getElementById('s-welcome').style.display='none';
    document.getElementById('s-verify').style.display='flex';
  }
}

async function doLogin(){
  const email=document.getElementById('login-email').value.trim();
  const pass=document.getElementById('login-pass').value;
  const errEl=document.getElementById('login-err');
  errEl.textContent='';
  if(!email){errEl.textContent='Ingresa tu email';return;}
  if(!pass){errEl.textContent='Ingresa tu contraseña';return;}
  _authSpinner('login-btn',true);_gDisable(['login-google-btn'],true);
  const{error}=await _sb.auth.signInWithPassword({email,password:pass});
  _authSpinner('login-btn',false);_gDisable(['login-google-btn'],false);
  if(error){errEl.textContent=_authErrMsg(error);return;}
  // onAuthStateChange fires SIGNED_IN → shows s-ready
}

async function onReadyContinue(){
  const btn=document.getElementById('ready-btn');
  if(btn){btn.textContent='Cargando...';btn.disabled=true;}
  if(_supaUser)await loadUserData(_supaUser.id);
}

async function doGoogleAuth(){
  _gDisable(['reg-google-btn','login-google-btn'],true);
  const{error}=await _sb.auth.signInWithOAuth({
    provider:'google',
    options:{
      redirectTo:'https://www.hormi.com.pe',
      queryParams:{access_type:'offline',prompt:'consent'}
    }
  });
  if(error){toast(esc(_authErrMsg(error)),'err');_gDisable(['reg-google-btn','login-google-btn'],false);}
}

let _lastRegEmail='';
function showConfirmEmail(email){
  _hideAllScreens();
  const el=document.getElementById('s-confirm');
  if(el){el.style.display='flex';}
  const txt=document.getElementById('confirm-email-txt');
  if(txt)txt.textContent=`Te enviamos un link de confirmación a ${email||_lastRegEmail}. Revísalo y vuelve aquí.`;
}
async function showConfirmEmailCheck(){
  try{
    const{data:{session}}=await _sb.auth.getSession();
    if(session?.user){
      _supaUser=session.user;
      await loadUserData(session.user.id);
    }else{
      toast('Aún no hemos recibido la confirmación — revisa tu email','warn');
    }
  }catch(e){toast('Error al verificar — intenta de nuevo','err');}
}
async function doResendEmail(){
  const btn=document.getElementById('resend-btn');
  if(btn){btn.disabled=true;btn.textContent='Enviando...';}
  try{
    const{error}=await _sb.auth.resend({type:'signup',email:_lastRegEmail});
    if(error)toast(esc(_authErrMsg(error)),'err');
    else toast('Email reenviado 📬','ok');
  }catch(e){toast('Error al reenviar','err');}
  if(btn){btn.disabled=false;btn.textContent='Reenviar email';}
}

async function doForgotPassword(){
  const email=document.getElementById('login-email').value.trim();
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    document.getElementById('login-err').textContent='Ingresa tu email arriba primero';return;
  }
  const{error}=await _sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.href});
  if(error){toast(esc(_authErrMsg(error)),'err');return;}
  toast('Te enviamos un email para recuperar tu contraseña 📬');
}
function showForgotPassword(){
  const loginEmail=document.getElementById('login-email')?.value.trim()||'';
  showAuthScreen('s-forgot');
  const fe=document.getElementById('forgot-email');if(fe&&loginEmail)fe.value=loginEmail;
  const msg=document.getElementById('forgot-msg');if(msg){msg.textContent='';msg.style.color='';}
}
async function sendResetEmail(){
  const email=document.getElementById('forgot-email').value.trim();
  const msg=document.getElementById('forgot-msg');
  if(!email){msg.textContent='Ingresa tu correo.';return;}
  const btn=document.getElementById('forgot-btn');
  btn.disabled=true;msg.textContent='Enviando...';msg.style.color='';
  const{error}=await _sb.auth.resetPasswordForEmail(email,{redirectTo:'https://www.hormi.com.pe'});
  btn.disabled=false;
  if(error){msg.textContent='Error: '+(_authErrMsg(error)||error.message);msg.style.color='var(--red)';}
  else{msg.textContent='✓ Link enviado. Revisa tu correo.';msg.style.color='var(--green)';}
}

async function signOut(){
  if(!confirm('¿Cerrar sesión?'))return;
  try{
    await saveUserData();
    await _sb.auth.signOut();
  }catch(e){console.error('signOut error:',e);}
  D={name:'',budget:30,threshold:25,hormis:[],goals:[],
    transactions:[],customCats:[],aliases:{},
    isPro:false,trialStart:null,trialUsed:false,
    scanCount:0,scanCountDate:'',onboarded:false,
    proCode:null,proSince:null,guideSeen:false,
    tooltipsSeen:[],trialUserData:null,plan:null,planChecked:{}};
  localStorage.removeItem(SK);
  _supaUser=null;
  _appReady=false;
  _guideShown=false;
  _loadingUser=false;
  showWelcome();
}
const doSignOut=signOut;

function openDeleteAccount(){
  const inp=document.getElementById('del-confirm-in');
  if(inp)inp.value='';
  const btn=document.getElementById('del-confirm-btn');
  if(btn)btn.disabled=true;
  openSheet('sh-delete-account');
}
async function doDeleteAccount(){
  const{data:{user}}=await _sb.auth.getUser();
  if(!user){toast('No autenticado','err');return;}
  // Call edge function to delete user data
  try{
    await fetch(`${SUPABASE_URL}/functions/v1/delete-account`,{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${(await _sb.auth.getSession()).data.session?.access_token}`}
    });
  }catch(e){/* best effort */}
  await _sb.auth.signOut();
  localStorage.removeItem(SK);
  _supaUser=null;
  showWelcome();
  toast('Cuenta eliminada');
}

// ── SUPABASE DATA SYNC ────────────────────────────────────────────────────────
async function loadUserData(userId){
  if(_loadingUser)return;
  _loadingUser=true;
  console.log('loadUserData START',userId);
  try{
    // Step 1 — fetch profile (maybeSingle retorna null si no existe, NO lanza error 406)
    const{data:profile,error:fetchError}=await _sb
      .from('profiles')
      .select('onboarded,name,is_pro,budget,threshold,hormis,goals,trial_start,trial_used,guide_seen')
      .eq('id',userId)
      .maybeSingle();

    console.log('Profile result:',profile,'error:',fetchError?.message);

    if(fetchError){
      console.error('fetch error:',fetchError.message);
      // continuar con profile=null
    }

    // Step 2 — si no existe, crear
    let finalProfile=profile;
    if(!profile){
      console.log('Sin perfil — creando...');
      const{data:newProfile,error:upsertError}=await _sb
        .from('profiles')
        .upsert({id:userId,onboarded:false},{onConflict:'id'})
        .select('onboarded,name,is_pro,budget,threshold,hormis,goals,trial_start,trial_used,guide_seen')
        .maybeSingle();
      if(upsertError){
        console.error('upsert error:',upsertError.message);
      }else{
        finalProfile=newProfile;
        console.log('Perfil creado OK');
      }
    }

    // Step 3 — aplicar a D
    if(finalProfile){
      D.onboarded=finalProfile.onboarded===true;
      D.name=finalProfile.name||'';
      D.isPro=finalProfile.is_pro||false;
      D.budget=finalProfile.budget||30;
      D.threshold=finalProfile.threshold||25;
      D.hormis=finalProfile.hormis||[];
      D.goals=finalProfile.goals||[];
      D.trialStart=finalProfile.trial_start||null;
      D.trialUsed=finalProfile.trial_used||false;
      D.guideSeen=finalProfile.guide_seen||false;
    }else{
      D.onboarded=false;
    }

    // Step 4 — cargar transacciones desde Supabase
    const{data:remoteTxs,error:txError}=await _sb
      .from('transactions')
      .select('*')
      .eq('user_id',userId)
      .order('ts',{ascending:false});

    if(txError){
      console.error('Error cargando transacciones:',txError.message);
    }else if(remoteTxs&&remoteTxs.length>0){
      D.transactions=remoteTxs.map(t=>({
        id:t.id,
        date:t.date,
        ts:t.ts,
        amount:t.amount,
        description:t.description,
        category:t.category,
        emoji:t.emoji,
        isHormi:t.is_hormi,
        isDraft:t.is_draft,
        hasTime:t.has_time,
        receiptTime:t.receipt_time,
        imageThumb:t.image_thumb,
        alias:t.alias,
        rawDescription:t.raw_description
      }));
      console.log('Transacciones cargadas desde Supabase:',D.transactions.length);
    }else{
      console.log('Sin transacciones en Supabase aún');
    }

    save();
  }catch(e){
    console.error('loadUserData error:',e);
    D.onboarded=false;
  }finally{
    _loadingUser=false;
    console.log('Navegando a:',D.onboarded?'home':'ob');
    if(D.onboarded===true)showMain();
    else showOb();
    updateTrialButton();
  }
}

async function saveUserData(){
  if(!_supaUser)return;
  try{
    await _sb.from('profiles').upsert({
      id:_supaUser.id,
      name:D.name,is_pro:D.isPro,budget:D.budget,threshold:D.threshold,
      hormis:D.hormis,goals:D.goals,onboarded:D.onboarded,
      trial_start:D.trialStart,trial_used:D.trialUsed,
      pro_code:D.proCode||null,pro_since:D.proSince||null,
      guide_seen:D.guideSeen||false
    });
  }catch(e){console.error('saveUserData error:',e.message||e);}
}

async function saveTx(tx){
  if(!_supaUser)return;
  try{
    await _sb.from('transactions').upsert({
      id:tx.id,user_id:_supaUser.id,date:tx.date,ts:tx.ts,amount:tx.amount,
      description:tx.description,category:tx.category,emoji:tx.emoji,
      is_hormi:tx.isHormi||false,is_draft:tx.isDraft||false,
      receipt_time:tx.receiptTime||null,
      image_thumb:tx.imageThumb||null,alias:tx.alias||null,
      source:tx.source||'manual'
    });
  }catch(e){console.error('saveTx error:',e.message||e);}
}

async function deleteTxRemote(id){
  if(!_supaUser)return;
  try{await _sb.from('transactions').delete().eq('id',id).eq('user_id',_supaUser.id);}
  catch(e){console.error('deleteTxRemote error:',e.message||e);}
}

async function submitFeedback(msg){
  if(!_supaUser)return;
  try{
    await _sb.from('feedback').insert({
      user_id:_supaUser.id,
      email:_supaUser.email||'',
      message:msg,
      created_at:new Date().toISOString()
    });
  }catch(e){/* offline */}
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────
function obProg(n){for(let i=0;i<4;i++)document.getElementById('d'+i).className='ob-dot'+(i<=n?' done':'');}
function obStep(n){document.querySelectorAll('.ob-step').forEach((s,i)=>s.classList.toggle('on',i===n));obProg(n);}

document.getElementById('ob-name')?.addEventListener('keydown',function(e){
  if(e.key==='Enter'){e.preventDefault();obNext(0);}
});

async function obNext(from){
  if(from===0){
    const n=document.getElementById('ob-name').value.trim();
    if(!n){toast('Ingresa tu nombre','warn');return;}
    D.name=n;save();
    // Persist name to Supabase immediately
    if(_supaUser){
      const{error}=await _sb.from('profiles').upsert({id:_supaUser.id,name:n},{onConflict:'id'});
      if(error)console.error('obNext upsert error:',error);
    }
  }
  if(from===1){buildGoalChips();}
  if(from===2){
    const a=parseFloat(document.getElementById('ob-goal-amt').value);
    const b=parseFloat(document.getElementById('ob-budget').value);
    if(obGoalHormi&&!isNaN(a)&&a>0)D.goals=[{id:Date.now(),hormi:obGoalHormi,budget:a,month:new Date().toISOString().slice(0,7)}];
    if(!isNaN(b)&&b>0)D.budget=b;save();
  }
  obStep(from+1);
  if(from+1===3)buildObSummary();
}

function buildHormiChips(){
  const el=document.getElementById('hormi-chips');
  el.innerHTML=HP.map(h=>`<div class="chip" onclick="togHormiChip(this,'${h.l}')">${h.e} ${h.l}</div>`).join('');
  (D.hormis||[]).forEach(h=>{
    const ex=[...el.querySelectorAll('.chip')].find(c=>c.textContent.trim().includes(h));
    if(ex)ex.classList.add('on');else el.innerHTML+=`<div class="chip on" onclick="togHormiChip(this,'${h}')">${h}</div>`;
  });
}
function togHormiChip(el,raw){
  el.classList.toggle('on');
  const l=raw.replace(/^[^\s]+\s/,'').trim();
  if(el.classList.contains('on')){if(!D.hormis.includes(l))D.hormis.push(l);}
  else D.hormis=D.hormis.filter(x=>x!==l);
  save();
}
function addCustom(){
  const v=document.getElementById('ob-custom').value.trim();if(!v)return;
  const el=document.getElementById('hormi-chips');
  el.innerHTML+=`<div class="chip on" onclick="togHormiChip(this,'${v}')">${v}</div>`;
  if(!D.hormis.includes(v))D.hormis.push(v);
  document.getElementById('ob-custom').value='';save();
}
function buildGoalChips(){
  const el=document.getElementById('goal-chips');
  const items=D.hormis.length?D.hormis:HP.map(h=>h.e+' '+h.l);
  if(!items.length){el.innerHTML=`<div style="font-size:12px;color:var(--t3)">Selecciona tus hormigas en el paso anterior primero.</div>`;return;}
  el.innerHTML=items.map(h=>`<div class="chip" onclick="selObGoal(this,'${h.replace(/'/g,"\\'")}')">${h}</div>`).join('');
}
function selObGoal(el,label){document.querySelectorAll('#goal-chips .chip').forEach(c=>c.classList.remove('on'));el.classList.add('on');obGoalHormi=label;}

function buildObSummary(){
  document.getElementById('ob-fn').textContent=D.name;
  const g=D.goals[0];
  const metaLbl=g?(g.hormi?`${g.hormi} — máx. S/ ${g.budget}/mes`:`${(CATS.find(c=>c.id===g.cat)||{}).l||'meta'} — máx. S/ ${g.budget}/mes`):'sin meta aún';
  document.getElementById('ob-summary').innerHTML=`
    <div style="display:flex;flex-direction:column;gap:7px">
      <div>🐜 <strong style="color:var(--t1)">${D.hormis.length}</strong> hormiga${D.hormis.length!==1?'s':''} identificada${D.hormis.length!==1?'s':''}: ${D.hormis.slice(0,4).join(', ')}${D.hormis.length>4?'...':''}</div>
      <div>🎯 Meta: ${metaLbl}</div>
      <div>📊 Límite diario: S/ ${D.budget}</div>
      <div>📸 Escaneo con IA: activado</div>
    </div>`;
}
async function finishOb(){
  D.onboarded=true;
  save();
  try{
    const{data:{user}}=await _sb.auth.getUser();
    if(user){
      const{error}=await _sb.from('profiles').upsert({
        id:user.id,
        name:D.name||'',
        onboarded:true,
        budget:D.budget||30,
        threshold:D.threshold||25,
        hormis:D.hormis||[],
        goals:D.goals||[],
        is_pro:D.isPro||false,
        trial_start:D.trialStart||null,
        trial_used:D.trialUsed||false
      },{onConflict:'id'});
      if(error)console.error('Error finishOb:',error);
      else console.log('Onboarding guardado en Supabase ✓');
    }
  }catch(e){console.error('finishOb sync error:',e);}
  showMain();
}

// ── ANALYZE STATEMENT (onboarding) ───────────────────────────────────────────
function analyzeStatement(){}

function processImportedTxs(txs,dw){
  txs.forEach(t=>{if(!D.transactions.find(x=>x.description===t.description&&x.amount===t.amount&&x.date===t.date))D.transactions.unshift(t);});
  D.transactions.sort((a,b)=>new Date(b.ts)-new Date(a.ts));save();
  const small=txs.filter(t=>t.amount<=35);
  const freq={};
  small.forEach(t=>{const k=t.description.toLowerCase().slice(0,18);if(!freq[k])freq[k]={count:0,amt:0,desc:t.description,cat:guessCat(t.description)};freq[k].count++;freq[k].amt+=t.amount;});
  const top=Object.values(freq).filter(v=>v.count>=2).sort((a,b)=>b.count-a.count).slice(0,6);
  if(!top.length){if(dw)dw.innerHTML=`<div style="font-size:12px;color:var(--t3)">${txs.length} gastos importados. No se detectaron patrones repetidos.</div>`;return;}
  if(dw)dw.innerHTML=`<div style="margin-bottom:10px"><div style="font-size:11px;color:var(--t3);letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px">HORMI detectó estos patrones — ¿cuáles quieres reducir?</div>
    ${top.map(v=>`<div class="det-item" onclick="togDet(this,'${v.desc.replace(/'/g,"\\'")}')">
      <div class="det-left"><div class="det-emo">${v.cat.e}</div><div><div class="det-nm">${v.desc.slice(0,26)}</div><div class="det-sub">${v.count}x · S/ ${v.amt.toFixed(0)} total</div></div></div>
      <div style="display:flex;align-items:center;gap:8px"><div class="det-amt">S/ ${(v.amt/v.count).toFixed(0)}/vez</div><div class="det-chk"><svg viewBox="0 0 12 12"><polyline points="2 6 5 9 10 3"/></svg></div></div>
    </div>`).join('')}
  </div>`;
}
function togDet(el,desc){
  el.classList.toggle('on');
  const k=desc.slice(0,20);
  if(el.classList.contains('on')){if(!D.hormis.includes(k))D.hormis.push(k);}
  else D.hormis=D.hormis.filter(h=>h!==k);
}

// ── FREEMIUM ──────────────────────────────────────────────────────────────────
function isPro(){
  if(D.isPro===true)return true;
  if(D.trialStart){
    const end=new Date(D.trialStart);end.setDate(end.getDate()+15);
    if(new Date()<=end)return true;
  }
  return false;
}
function checkScanLimit(){
  if(isPro())return true;
  const today=td();
  if(D.scanCountDate!==today){D.scanCount=0;D.scanCountDate=today;}
  if(D.scanCount>=3){
    toast('Has usado tus 3 escaneos de hoy. Actualiza a Pro para escaneos ilimitados','warn');
    requirePro('escaneo',null);
    return false;
  }
  D.scanCount++;D.scanCountDate=today;save();
  updateScanCountRemote();
  return true;
}
async function updateScanCountRemote(){
  if(!_supaUser||!_sb)return;
  try{await _sb.from('profiles').upsert({id:_supaUser.id,scan_count:D.scanCount,last_scan_date:D.scanCountDate});}
  catch(e){/* non-blocking */}
}
function requirePro(feature,callback){
  _pendingProCallback=callback;
  if(!D.trialStart&&!D.trialUsed)openSheet('sh-trial');
  else openUpgrade();
}
function activateTrial(){
  D.trialStart=td();D.trialUsed=true;D.isPro=false;save();saveUserData();
  closeOv('sh-trial');renderHome();
  updateTrialButton();
  toast('¡Trial Pro activado! 15 días gratis 🎉','ok');
  if(_pendingProCallback){_pendingProCallback();_pendingProCallback=null;}
}
const PLANS={
  mensual:{name:'Mensual',old:'S/ 19.90',price:'S/ 15.90',sub:'/mes',popular:false},
  trimestral:{name:'3 Meses',old:'S/ 49.90',price:'S/ 38.90',sub:'(S/ 12.97/mes)',popular:false},
  anual:{name:'Anual',old:'S/ 179',price:'S/ 130.90',sub:'(S/ 10.91/mes · ahorra 27%)',popular:true}
};
function renderUpgradePlans(){
  const el=document.getElementById('upgrade-plans');if(!el)return;
  el.innerHTML=Object.entries(PLANS).map(([k,p])=>`
    <div class="plan-opt${_selectedPlan===k?' selected':''}" onclick="selPlan('${k}')">
      ${p.popular?`<div class="plan-popular">más popular</div>`:''}
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-family:var(--font-title);font-weight:800;font-size:15px">${p.name}</div><div style="font-size:11px;color:var(--t3);margin-top:2px">${p.sub}</div></div>
        <div style="text-align:right"><div style="font-size:11px;color:var(--t3);text-decoration:line-through">${p.old}</div><div style="font-family:var(--font-title);font-size:20px;font-weight:800;color:var(--lime-t)">${p.price}</div></div>
      </div>
    </div>`).join('');
}
function selPlan(k){_selectedPlan=k;renderUpgradePlans();}
function goToPurchase(){
  const labels={mensual:'Mensual a S/ 15.90/mes',trimestral:'3 Meses a S/ 38.90',anual:'Anual a S/ 130.90'};
  window.open(`https://wa.me/51970300434?text=${encodeURIComponent('Hola, quiero adquirir HORMI Pro 🐜 Plan: '+labels[_selectedPlan])}`,'_blank');
}

// ── NAV ───────────────────────────────────────────────────────────────────────
function go(sc){
  ['home','stats','goals','plan','set'].forEach(s=>{
    document.getElementById('s-'+s)?.classList.toggle('on',s===sc);
    document.getElementById('n-'+s)?.classList.toggle('on',s===sc);
  });
  if(sc==='home'){if(!_selDay)_selDay=td();renderHome();document.getElementById('s-home').scrollTop=0;}
  if(sc==='stats')renderStats();
  if(sc==='goals')renderGoals();
  if(sc==='set')renderSet();
  if(sc==='plan')renderPlan();
}
function refreshCurrent(){renderHome();}

// ── OVERLAYS ─────────────────────────────────────────────────────────────────
function openSheet(id){document.getElementById(id).classList.add('open');}
function closeOv(id){document.getElementById(id).classList.remove('open');}
function maybeClose(e,id){
  if(e.target!==document.getElementById(id))return;
  if(id==='sh-add'){closeAddSheet();return;}
  closeOv(id);
}
function openModal(id){
  if(id==='m-budget'){document.getElementById('bud-in').value=D.budget;}
  if(id==='m-goal'){mgSelectedHormis={};mgSelectedCats={};buildMgChipsMulti();}
  document.getElementById(id).classList.add('open');
}

// ── HELPERS: DATE / THUMB / DUPLICATE / VOICE ─────────────────────────────────
function parseReceiptDate(str){
  if(!str)return null;
  let y,mo,d;
  const iso=str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(iso){y=+iso[1];mo=iso[2];d=iso[3];}
  else{
    const m=str.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if(!m)return null;
    y=+(m[3].length===2?'20'+m[3]:m[3]);mo=m[2].padStart(2,'0');d=m[1].padStart(2,'0');
  }
  let ds=`${y}-${mo}-${d}`;
  // Si cae en el futuro, el año suele ser lo mal leído: resta años (máx 3).
  let guard=0;
  while(ds>td()&&guard<3){y--;ds=`${y}-${mo}-${d}`;guard++;}
  if(ds>td())return null; // no se pudo corregir: mejor null que fecha falsa
  return ds;
}

async function compressImageThumb(b64,mime){
  return new Promise(res=>{
    const img=new Image();
    img.onload=()=>{
      const cv=document.createElement('canvas');cv.width=200;cv.height=200;
      const ctx=cv.getContext('2d');
      const s=Math.min(img.width,img.height);
      ctx.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,200,200);
      res(cv.toDataURL('image/jpeg',0.6).split(',')[1]);
    };
    img.onerror=()=>res(null);
    img.src=`data:${mime};base64,${b64}`;
  });
}

function checkDuplicate(desc,excludeId){
  if(!desc||desc.length<5)return null;
  const cutoff=new Date(Date.now()-7*86400000).toISOString().slice(0,10);
  const prefix=desc.slice(0,5).toLowerCase();
  return D.transactions.find(t=>t.id!==excludeId&&t.date>=cutoff&&!t.isDraft&&t.description.toLowerCase().includes(prefix))||null;
}
function checkAndShowDuplicate(desc){
  const dup=checkDuplicate(desc,null);
  const el=document.getElementById('dup-warn');if(!el)return;
  if(dup){
    const daysAgo=Math.max(1,Math.round((Date.now()-new Date(dup.date+'T12:00:00'))/86400000));
    el.style.display='';
    el.innerHTML=`<div>¿Gasto duplicado? Encontré <strong>"${dup.description}"</strong> (${fmt(dup.amount)}) hace ${daysAgo} día${daysAgo!==1?'s':''}</div>
      <div style="display:flex;gap:8px;margin-top:7px">
        <button onclick="confirmSameExpense()" style="flex:1;padding:7px;background:var(--amber-bg);border:1px solid rgba(217,119,6,.25);border-radius:var(--rsm);color:var(--amber-t);font-size:12px;font-weight:600;cursor:pointer">Sí, el mismo</button>
        <button onclick="hideDupWarn()" style="flex:1;padding:7px;background:transparent;border:1px solid var(--b2);border-radius:var(--rsm);color:var(--t2);font-size:12px;cursor:pointer">No, diferente</button>
      </div>`;
  }else{el.style.display='none';}
}
function hideDupWarn(){const el=document.getElementById('dup-warn');if(el)el.style.display='none';}
function confirmSameExpense(){
  // Usuario confirma que es el mismo gasto ya registrado — limpiar el form para no duplicarlo
  hideDupWarn();
  document.getElementById('a-amt').value='';
  document.getElementById('tx-consumo').value='';
  document.getElementById('tx-lugar').value='';
  toast('Gasto no registrado — ya lo tenías guardado','ok');
}

function openAddSheet(ds){
  _scanSheetOpen=true;
  const dateIn=document.getElementById('a-date');
  if(dateIn)dateIn.value=ds||_selDay||td();
  const timeIn=document.getElementById('a-time');
  if(timeIn)timeIn.value='';
  txDate=ds||null;
  openSheet('sh-add');
  syncHeaderButtons();
}

// ── SCAN IMAGE ────────────────────────────────────────────────────────────────
const SCAN_PROMPT=`Eres un extractor de datos de comprobantes de pago peruanos. Analiza esta imagen que puede ser:
- Captura de pantalla de Yape (app de BCP)
- Captura de pantalla de Plin
- Boleta o factura peruana
- Comprobante de transferencia

Si la imagen NO es un comprobante de pago (no es Yape, Plin, boleta, factura, voucher ni similar), responde SOLO: {"error":"no_receipt"}

Para Yape/Plin busca específicamente:
- El monto: número con "S/" o "soles", puede estar grande en el centro
- El destinatario: nombre de la persona o negocio al que se yapeo
- La fecha: formato DD/MM/YYYY o similar
- La hora: si está visible en el comprobante (formato HH:MM), inclúyela. Si no se ve, pon null
- El concepto/mensaje: texto opcional que acompaña el pago

FECHA — REGLA CRÍTICA (aplica a TODOS los tipos de comprobante):
- En boletas y facturas peruanas la fecha de emisión aparece etiquetada explícitamente: "FECHA:", "FECHA DE EMISION:", "F. EMISION:". Usa SOLO ese campo etiquetado. Está normalmente en la cabecera, cerca del número de boleta y el terminal/caja.
- NUNCA uses: fechas de vencimiento, vigencia de promociones, fechas de garantía, correlativos, números de operación, ni cualquier número que no esté junto a una etiqueta de fecha de emisión.
- El formato peruano es DD/MM/AAAA: el PRIMER número es el DÍA, el SEGUNDO es el MES, el ÚLTIMO es el AÑO. "27/07/2026" = 27 de julio de 2026. Nunca lo interpretes como MM/DD.
- Devuélvela SIEMPRE convertida a "YYYY-MM-DD".
- El año se lee COMPLETO del comprobante. No asumas el año actual ni ningún otro: cópialo tal como aparece.
- Si NO encuentras un campo de fecha de emisión claramente etiquetado, devuelve "fecha":null. NUNCA inventes ni aproximes una fecha — es preferible null a una fecha equivocada.

CALIDAD DE LA IMAGEN — EVALÚA ANTES DE EXTRAER:
Si la imagen está borrosa, cortada, con reflejos, muy oscura, o si no puedes leer con certeza los montos, el total o la fecha, responde SOLO:
{"error":"low_quality","message":"La foto no se lee con claridad"}
No intentes adivinar valores de una imagen ilegible.
Además, si SÍ pudiste extraer pero tienes dudas en algún dato, agrega al JSON el campo "confianza":"baja" (o "alta" si estás seguro de todo).
Esta decisión (calidad de imagen) va PRIMERO y es DEFINITIVA: si tienes cualquier duda entre reportar low_quality o intentar extraer datos parciales, SIEMPRE elige low_quality. Nunca generes un JSON parcial o mezclado — es todo o nada.

AUTOVERIFICACIÓN: después de extraer los items, suma sus montos y compárala con el total impreso del ticket. Si la diferencia es mayor a S/1.00, o si la cantidad de items que extrajiste no coincide con el 'NUMERO DE ITEMS' impreso, marca confianza:'baja'. Nunca ajustes montos para que cuadren — reporta lo que leíste y marca la confianza.
"total_impreso" es el IMPORTE TOTAL / TOTAL que aparece impreso en el ticket, o null si no se ve. "num_items_impreso" es el campo "NUMERO DE ITEMS" si aparece, o null si no aparece.

Responde SOLO con este JSON sin texto adicional ni backticks:
{"items":[{"descripcion":"concepto o nombre del destinatario","monto":0.00,"categoria":"ID"}],"lugar":"nombre comercial + distrito (ej: Listo Monterrico)","fecha":"YYYY-MM-DD","hora":"HH:MM","categoria_sugerida":"ID","total_impreso":0.00,"num_items_impreso":0,"confianza":"alta"}

DECODIFICACIÓN DE CÓDIGOS ABREVIADOS (para cada item.descripcion):
Los supermercados y tiendas de conveniencia suelen imprimir el producto como un código abreviado en vez del nombre completo. Antes de devolver descripcion, revisa si el texto cumple CUALQUIERA de estas señales de código:
- Tokens en mayúsculas de 2 a 6 letras que no son palabra en español ni inglés
- Faltan vocales: JUI, PROT, CONC, YOG, GALL, BEB, CHOC
- Medida pegada al final: 45G, 295ML, X6, 1L, X12
- Palabras truncadas o unidas con punto: YOG.BOLSA, SM CERDO
Si se lee como frase natural ("Café Americano", "Uber") NO es código, úsalo tal cual. Si SÍ es código:
1. Separa el string en MARCA + TIPO DE PRODUCTO + SABOR/VARIANTE + TAMAÑO.
2. Expande cada truncamiento. Regla general: una abreviatura suele ser las primeras letras de la palabra completa, o la palabra sin vocales. Ejemplos del patrón, NO una lista cerrada: PROT→proteína · CONC→concentrado · JUI→jugo · CF→cold foam · YOG→yogurt · BEB→bebida · GALL→galleta · CHOC→chocolate · BAR→barra · H+fruta→esa fruta (HLUCUMA→lúcuma).
3. Usa 'lugar' como contexto para acotar: cafetería (Starbucks, Juan Valdez)→bebidas y snacks de café; conveniencia (OXXO, Tambo, Listo, Repshop)→snacks, bebidas, golosinas; supermercado (Metro, Wong, Plaza Vea, Tottus, Vivanda)→abarrotes; farmacia (Inkafarma, Mifarma)→salud y cuidado personal.
4. Usa web_search con "{código completo} {lugar}". Si no da resultado, intenta "{marca expandida} {tipo de producto} Perú".
5. Devuelve nombre legible en español, formato "Tipo Marca Sabor Tamaño". Ejemplos de resultado esperado: "DYFF BAR HLUCUMA 45G" en OXXO → "Barra Dayfit Lúcuma 45g" · "Vainilla CF PROT" en Starbucks → "Cold Foam Proteína Vainilla" · "WEL JUI CONC 295ML" en Metro → "Jugo Concentrado Welchs 295ml".
Si NO logras resolverlo con certeza, deja el código original tal cual en descripcion. NUNCA inventes una marca ni un producto que no confirmaste — es preferible el código crudo a un nombre inventado.

ABREVIATURAS Y LETRAS SUELTAS — REGLA GENERAL:
Expande una abreviatura SOLO si (a) la expansión es inequívoca por contexto del rubro, o (b) la verificaste con web_search. Si una letra o sigla admite más de una expansión posible y no la verificaste, consérvala tal cual. Nunca agregues al nombre palabras que el ticket no contiene y que no confirmaste. Es preferible un nombre parcialmente crudo a un nombre inventado con seguridad falsa.

Para categoria_sugerida elige UNO de estos IDs según el tipo de gasto:
- food: restaurantes, fast food, menús, cualquier comida preparada. Ej: McDonald's, KFC, Bembos, Norky's, cualquier plato o combo
- drink: café, bebidas, jugos, cocteles. Ej: Starbucks, Juan Valdez, cualquier bebida
- snack: postres, helados, pasteles, dulces, waffles, croissants. Ej: El Bigote Coffee, Puku Puku, D'onofrio
- del: delivery, pedidos online, Rappi, Glovo, Uber Eats
- trans: taxi, Uber, bus, combustible, peajes, grifos. Ej: Listo (COESTI), Primax, Repsol, Beat, Cabify
- subs: apps, suscripciones digitales, streaming. Ej: Netflix, Spotify, Adobe
- health: farmacias, clínicas, médicos. Ej: Mifarma, Inkafarma, Boticas
- beauty: peluquerías, salones, spa, cosméticos
- sport: gimnasios, deportes, canchas. Ej: SmartFit, Bodytech
- edu: libros, cursos, universidades, colegios
- shop: ropa, calzado, accesorios, tiendas. Ej: Saga Falabella, Ripley, Zara, Topitop
- soc: bares, discotecas, alcohol, salidas sociales
- enter: cine, teatro, conciertos. Ej: Cineplanet, Cinemark
- market: supermercados, mercados, abarrotes, insumos crudos para cocinar, productos de limpieza y hogar. Ej: Tottus, Metro, Wong, Plaza Vea, Vivanda, Makro, mercados de barrio
- other: todo lo demás

MÉTODO DE CATEGORIZACIÓN — aplícalo a CADA item por separado, en este orden:

PASO 1 — PREGUNTA QUÉ ES EL PRODUCTO, no dónde se compró.
Responde: ¿qué haría el usuario con esto?
- ¿Se come preparado/listo (plato, menú, combo, porción)? → food
- ¿Se bebe? → drink
- ¿Es un antojo empaquetado o dulce (se come sin preparación)? → snack
- ¿Es un insumo crudo o del hogar (se cocina, se almacena, se usa para limpiar)? → market
- ¿Es un servicio de transporte o combustible? → trans
- ¿Es medicina o atención de salud? → health
- ¿Es cuidado personal o estética? → beauty
- ¿Se viste o se usa como accesorio? → shop
- ¿Es digital o una suscripción? → subs
- ¿Es una entrada, evento o diversión? → enter / soc según contexto
- ¿Es educativo (libro, curso, matrícula)? → edu
- ¿Es deporte o gimnasio? → sport
- ¿Es un pedido por app de delivery? → del

La pregunta funcional ('¿qué hace el usuario con esto?') decide, no una lista de palabras. Un producto que se bebe es drink aunque se compre en una farmacia; una pastilla es health aunque se compre en un supermercado.

PASO 2 — SI EL PRODUCTO NO DA SEÑAL (código ilegible, nombre genérico como 'ITEM 001'), usa el TIPO de establecimiento como proxy: restaurante→food, cafetería→drink, farmacia→health, grifo→trans, y así según su rubro principal.

PASO 3 — 'other' SOLO si ni el producto ni el establecimiento dan señal alguna. 'other' es el último recurso, nunca un atajo.

REGLAS TRANSVERSALES:
- Items de la misma boleta PUEDEN Y DEBEN tener categorías distintas si sus productos son de tipos distintos.
- En pagos Yape/Plin a personas, usa el concepto escrito; si no hay concepto, aplica PASO 2 con lo que sepas del contexto.
- categoria_sugerida a nivel boleta = la categoría del item de mayor monto.

IMPORTANTE: usa tu conocimiento de establecimientos peruanos para categorizar correctamente aunque el nombre en la boleta sea la razón social legal.

Si no puedes leer algún campo con certeza, usa null para ese campo. Para el monto, extrae SOLO el número sin S/. Si hay varios items en una boleta, crea un objeto por cada uno. IMPORTANTE sobre IGV: en boletas peruanas el IGV (18%) a veces aparece desglosado como línea separada. Si ves líneas de "GRAVADAS S/", "IGV (18%)" o "IMPORTE TOTAL S/" como líneas separadas del subtotal, usa SIEMPRE el IMPORTE TOTAL (que ya incluye IGV) como referencia para validar que los montos individuales sumen al total con IGV. NO agregues el IGV extra sobre los precios unitarios — los precios en la boleta ya lo incluyen. El campo 'monto' de cada item debe ser el precio unitario tal como aparece en la columna TOTAL de la boleta.

REGLAS PARA EL CAMPO 'lugar':
1. Usa SIEMPRE el nombre comercial conocido, NO la razón social legal. Ejemplos: "COESTI S.A." → "Listo", "Operaciones Arcos Dorados de Peru SA" → "McDonald's", "Supermercados Peruanos S.A." → "Plaza Vea", "Saga Falabella S.A." → "Saga Falabella".
2. Si la boleta menciona una dirección o distrito, agrégalo al nombre comercial separado por espacio: "Listo Monterrico", "Starbucks Miraflores", "McDonald's San Isidro".
3. Si hay número de tienda o local, ignóralo — solo nombre comercial + distrito.
4. Si no puedes identificar el nombre comercial, usa el nombre tal como aparece en la boleta pero elimina términos legales como S.A., S.A.C., E.I.R.L., S.R.L.
5. La boleta suele tener: nombre comercial arriba, razón social y dirección fiscal abajo. USA SOLO el nombre comercial de arriba + distrito si aparece. NUNCA incluyas avenidas, números de calle ni otros códigos internos de local — ejemplo, si ves "LISTO UDLIMA" con dirección en Monterrico, el lugar es "Listo UDLIMA". ASI CON TODOS.`;

function openScanOptions(){
  const isAndroid=/android/i.test(navigator.userAgent);
  if(isAndroid){
    const existing=document.getElementById('scan-options-sheet');
    if(existing)existing.remove();
    const sheet=document.createElement('div');
    sheet.id='scan-options-sheet';
    sheet.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:500;display:flex;align-items:flex-end;justify-content:center';
    sheet.innerHTML=`<div style="background:#fff;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:430px">
      <div style="font-size:15px;font-weight:700;font-family:var(--font-title);margin-bottom:16px;color:var(--t1)">Agregar imagen</div>
      <button id="btn-cam-opt" style="width:100%;padding:14px;background:var(--lime);border:none;border-radius:14px;font-size:15px;font-weight:700;font-family:var(--font-title);cursor:pointer;margin-bottom:8px;color:#0d0d0d">📷 Tomar foto</button>
      <button id="btn-gal-opt" style="width:100%;padding:14px;background:var(--s2);border:1px solid var(--b2);border-radius:14px;font-size:15px;font-weight:600;font-family:var(--font-body);cursor:pointer;margin-bottom:8px;color:var(--t1)">🖼️ Elegir de galería</button>
      <button id="btn-cancel-opt" style="width:100%;padding:12px;background:none;border:none;font-size:14px;color:var(--t3);cursor:pointer;font-family:var(--font-body)">Cancelar</button>
    </div>`;
    sheet.onclick=e=>{if(e.target===sheet)sheet.remove();};
    document.body.appendChild(sheet);
    document.getElementById('btn-cam-opt').addEventListener('click',()=>{document.getElementById('img-in-cam').click();sheet.remove();});
    document.getElementById('btn-gal-opt').addEventListener('click',()=>{document.getElementById('img-in').click();sheet.remove();});
    document.getElementById('btn-cancel-opt').addEventListener('click',()=>sheet.remove());
  }else{
    // iOS y desktop: click directo síncrono
    document.getElementById('img-in').click();
  }
}

function clearScanLoading(){
  const f=document.getElementById('scan-fields');if(f)f.innerHTML='';
  const rb=document.getElementById('scan-res-btns');if(rb)rb.style.display='none';
  const bb=document.getElementById('scan-bottom-btns');if(bb){bb.style.display='none';bb.innerHTML='';}
}
function showMissingDateWarning(){
  const dateIn=document.getElementById('a-date');
  if(!dateIn)return;
  dateIn.value='';
  dateIn.style.border='2px solid var(--red)';
  dateIn.style.background='rgba(230,57,70,.05)';
  let warn=document.getElementById('scan-date-warning');
  if(!warn){
    warn=document.createElement('div');
    warn.id='scan-date-warning';
    warn.style.cssText='background:rgba(230,57,70,.07);border:1.5px solid var(--red-b);border-radius:10px;padding:10px 14px;font-size:13px;color:var(--red);margin-bottom:8px;display:flex;gap:8px;align-items:center';
    warn.innerHTML='<i data-lucide="alert-circle" style="width:16px;height:16px;flex-shrink:0"></i><span>No se detectó la fecha. Ingrésala para continuar.</span>';
    dateIn.parentElement.insertBefore(warn,dateIn);
    if(window.lucide)lucide.createIcons();
  }
  const saveBtn=document.getElementById('btn-add-tx');
  if(saveBtn){saveBtn.disabled=true;saveBtn.style.opacity='0.4';}
  const hdrSave=document.getElementById('scan-save-btn');
  if(hdrSave){hdrSave.style.opacity='0.4';hdrSave.dataset.blocked='1';}
  dateIn.addEventListener('change',function oh(){
    this.style.border='';this.style.background='';
    const w=document.getElementById('scan-date-warning');if(w)w.remove();
    if(saveBtn){saveBtn.disabled=false;saveBtn.style.opacity='1';}
    if(hdrSave){hdrSave.style.opacity='1';delete hdrSave.dataset.blocked;}
    this.removeEventListener('change',oh);
  },{once:true});
}
async function scanImg(input){
  const file=input.files[0];if(!file)return;
  if(window._scanning){toast('Espera a que termine el escaneo actual','warn');input.value='';return;}
  window._scanning=true;
  if(!checkScanLimit()){window._scanning=false;input.value='';return;}
  _scanState='processing';
  const di=document.getElementById('a-date');if(di)di.value='';
  input.value='';
  doScanWork(file).catch(e=>{
    console.error('scan work error:',e);
    window._scanning=false;_scanState='error';
    updateScanBubble();
    syncHeaderButtons();
    if(_scanSheetOpen){
      const st=document.getElementById('scan-st');
      if(st){clearScanLoading();st.innerHTML=`<div style="font-size:12px;color:var(--red);margin-bottom:7px">Error al procesar. <button onclick="openScanOptions()" style="margin-left:6px;background:var(--red);color:#fff;border:none;border-radius:var(--rsm);padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer">Reintentar</button></div>`;}
    }else{toast('No se pudo procesar la boleta','err');}
  });
}
async function doScanWork(file){
  let scanTimeout;
  const st=document.getElementById('scan-st');
  syncHeaderButtons();
  try{
    if(_scanSheetOpen){
      if(st)st.innerHTML='';
      document.getElementById('scan-res').style.display='block';
      document.getElementById('scan-fields').innerHTML=`<div style="display:flex;align-items:center;gap:8px;padding:8px 0;color:var(--t3);font-size:13px"><span class="spin"></span>Extrayendo datos...</div>`;
      const _scanBtns=document.getElementById('scan-btns');if(_scanBtns)_scanBtns.innerHTML='';
      const _resBtns=document.getElementById('scan-res-btns');
      if(_resBtns){_resBtns.style.display='flex';_resBtns.innerHTML=`<button class="ms-disc" style="flex:1" onclick="closeAddSheet()">× Descartar</button>`;}
    }
    scanReceiptTs=null;_currentThumb=null;_scanPending=null;
    const b64=await toJpegBase64(file);
    const mime='image/jpeg';
    const{data:{session}}=await _sb.auth.getSession();
    const token=session?.access_token;
    if(!token){console.error('❌ No hay sesión activa');window._scanning=false;_scanState='error';updateScanBubble();syncHeaderButtons();return;}
    const thumb=await compressImageThumb(b64,mime).catch(()=>null);
    _currentThumb=thumb;
    const scanAc=new AbortController();
    scanTimeout=setTimeout(()=>scanAc.abort(),45000);
    const r=await fetch(SCAN_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({image_base64:b64,media_type:mime,prompt:SCAN_PROMPT}),signal:scanAc.signal});
    clearTimeout(scanTimeout);
    if(!r.ok){
      const errBody=await r.text();
      let errMsg='Error '+r.status;
      try{errMsg=JSON.parse(errBody).error||errMsg;}catch(_e){}
      throw new Error(errMsg);
    }
    const rawText=await r.text();
    console.log('Respuesta escáner raw:',rawText);
    let p;
    try{
      p=JSON.parse(rawText);
    }catch(pe){
      // Intento de recuperación: a veces el modelo corta el JSON a medias
      // o mezcla texto. Busca el primer bloque {...} balanceado.
      const match=rawText.match(/\{[\s\S]*\}/);
      if(match){
        try{p=JSON.parse(match[0]);}catch(pe2){p=null;}
      }
      if(!p){
        // No se pudo recuperar nada usable: trátalo como low_quality,
        // no como error técnico feo.
        p={error:'low_quality',message:'La foto no se lee con claridad'};
      }
    }
    console.log('JSON parseado:',p);
    if(p.error==='no_receipt'){
      window._scanning=false;_scanState='error';
      if(_scanSheetOpen){
        clearScanLoading();
        if(st)st.innerHTML=`<div style="background:var(--red-bg);border:1px solid var(--red-b);border-radius:var(--rsm);padding:10px 13px;font-size:13px;color:var(--red);margin-bottom:7px">⚠️ Lo enviado no parece un comprobante de pago</div>`;
      }else{
        updateScanBubble();
        toast('El comprobante no se pudo procesar','err');
      }
      syncHeaderButtons();
      return;
    }
    if(p.error==='no_product'){
      window._scanning=false;_scanState='error';
      if(_scanSheetOpen){
        clearScanLoading();
        if(st)st.innerHTML=`<div style="background:var(--amber-bg);border:1px solid rgba(217,119,6,.3);border-radius:var(--rsm);padding:10px 13px;font-size:13px;color:var(--amber-t);margin-bottom:7px">ℹ️ El comprobante no registra el producto — agrégalo manualmente</div>`;
        if(p.fecha){const ds2=parseReceiptDate(p.fecha);if(ds2){txDate=ds2;const di=document.getElementById('a-date');if(di)di.value=ds2;}}
      }else{
        updateScanBubble();
        toast('El comprobante no registra el producto','warn');
      }
      syncHeaderButtons();
      return;
    }
    if(p.error==='low_quality'){
      window._scanning=false;_scanState='error';
      if(_scanSheetOpen){
        clearScanLoading();
        if(st)st.innerHTML=`<div style="background:var(--red-bg);border:1px solid var(--red-b);border-radius:var(--rsm);padding:10px 13px;font-size:13px;color:var(--red);margin-bottom:7px">⚠️ ${p.message||'La foto no se lee con claridad'}<br><button onclick="openScanOptions()" style="margin-top:8px;background:var(--red);color:#fff;border:none;border-radius:var(--rsm);padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer">Volver a tomar foto</button></div>`;
      }else{
        updateScanBubble();
        toast(p.message||'La foto no se lee con claridad','err');
      }
      syncHeaderButtons();
      return;
    }
    // parse date/time — use string directly, never new Date(str) to avoid UTC shift
    let ds=null;
    if(p.fecha){
      ds=parseReceiptDate(p.fecha);
      if(ds){txDate=ds;if(_scanSheetOpen){const di=document.getElementById('a-date');if(di)di.value=ds;}}
      else if(_scanSheetOpen){toast('No pudimos leer la fecha de la boleta — revísala antes de guardar','warn',4000);}
    }else if(_scanSheetOpen){
      showMissingDateWarning();
    }
    if(p.hora&&/^\d{1,2}:\d{2}$/.test(p.hora)){
      const base=ds||td();
      scanReceiptTs=`${base}T${p.hora.padStart(5,'0')}:00`;
      if(_scanSheetOpen){const ti=document.getElementById('a-time');if(ti)ti.value=p.hora.padStart(5,'0');}
    }
    if(_scanSheetOpen&&st)st.innerHTML='';
    const items=Array.isArray(p.items)&&p.items.length?p.items:[];
    const lugar=(p.lugar||'').trim();
    if(!items.length){
      window._scanning=false;_scanState='error';
      if(_scanSheetOpen){
        clearScanLoading();
        // FIX 3: don't block — fill date/lugar if available, let user complete the rest
        if(lugar){const li=document.getElementById('tx-lugar');if(li)li.value=lugar;}
        const fallbackAmt=parseFloat(p.amount||p.monto||0);
        if(fallbackAmt>0){const ai=document.getElementById('a-amt');if(ai)ai.value=fallbackAmt;}
        toast('Monto y fecha detectados. Completa el concepto manualmente.','ok');
        if(st)st.innerHTML='';
      }else{
        updateScanBubble();
        toast('No se detectaron ítems en la boleta','warn');
      }
      syncHeaderButtons();
      return;
    }
    // store for multi-save
    _txSource='scan';
    _scanPending={
      items,lugar,date:ds||td(),
      fechaOriginal:p.fecha||null,
      hora:p.hora||null,
      categoriaSugerida:p.categoria_sugerida||null,
      totalImpreso:(typeof p.total_impreso==='number')?p.total_impreso:null,
      numItemsImpreso:(typeof p.num_items_impreso==='number')?p.num_items_impreso:null,
      confianza:p.confianza||null
    };
    if(_scanState==='idle'&&!_scanSheetOpen){
      // el usuario canceló mientras procesaba: descarta el resultado
      window._scanning=false;
      _scanPending=null;
      syncHeaderButtons();
      return;
    }
    window._scanning=false;
    if(_scanSheetOpen){
      _scanState='ready';
      rerenderScanPreview();
      toast('✓ Datos extraídos','ok');
      _scanState='idle';
    }else{
      const hayAvisos = p.confianza==='baja'
        || (typeof p.total_impreso==='number' && Math.abs(items.reduce((s,it)=>s+(it.monto||0),0)-p.total_impreso)>1)
        || (typeof p.num_items_impreso==='number' && p.num_items_impreso!==items.length);
      _scanState = hayAvisos ? 'warning' : 'ready';
      updateScanBubble();
      toast(hayAvisos?'Boleta lista — revisa los avisos':'✓ Boleta lista — tócala para revisar','ok',4000);
      syncHeaderButtons();
    }
  }catch(e){
    if(scanTimeout)clearTimeout(scanTimeout);
    window._scanning=false;
    syncHeaderButtons();
    throw e; // lo maneja el .catch de scanImg
  }
}
function minimizeScan(){
  closeOv('sh-add');
  _scanSheetOpen=false;
  updateScanBubble();
}
function restoreScan(){
  openAddSheet(_selDay);
  _scanSheetOpen=true;
  document.getElementById('scan-bubble').style.display='none';
  setTimeout(()=>{
    if((_scanState==='ready'||_scanState==='warning')&&_scanPending)rerenderScanPreview();
    else if(_scanState==='processing'){
      const st=document.getElementById('scan-st');
      if(st)st.innerHTML='<div style="color:var(--t2);font-size:13px">Procesando boleta...</div>';
    }
    else if(_scanState==='error'){
      clearScanLoading();
      const st=document.getElementById('scan-st');
      if(st)st.innerHTML='<div style="background:var(--red-bg);border:1px solid var(--red-b);border-radius:var(--rsm);padding:10px 13px;font-size:13px;color:var(--red);margin-bottom:7px">⚠️ No se pudo procesar la boleta.<br><button onclick="openScanOptions()" style="margin-top:8px;background:var(--red);color:#fff;border:none;border-radius:var(--rsm);padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer">Volver a tomar foto</button></div>';
    }
  },50);
}
function updateScanBubble(){
  const b=document.getElementById('scan-bubble');
  const icon=document.getElementById('scan-bubble-icon');
  const fab=document.querySelector('.fab-fixed');
  if(!b)return;
  const visible=!_scanSheetOpen&&(_scanState==='processing'||_scanState==='ready'||_scanState==='warning'||_scanState==='error');
  if(visible){
    b.style.display='flex';
    if(fab)fab.style.display='none';
    let ico='loader-2',bg='var(--primary)',anim='spin 1s linear infinite';
    if(_scanState==='ready'){ico='check';bg='var(--lime-t)';anim='pulse 1.5s ease-in-out infinite';}
    if(_scanState==='warning'){ico='alert-triangle';bg='#d97706';anim='pulse 1.5s ease-in-out infinite';}
    if(_scanState==='error'){ico='alert-circle';bg='var(--red)';anim='pulse 1.5s ease-in-out infinite';}
    if(icon){icon.setAttribute('data-lucide',ico);icon.style.animation=_scanState==='processing'?anim:'none';}
    b.style.background=bg;
    b.style.animation=_scanState==='processing'?'none':anim;
    if(window.lucide)lucide.createIcons();
  }else{
    b.style.display='none';
    if(fab)fab.style.display='';
  }
}
function rerenderScanPreview(){
  if(!_scanPending)return;
  const {items,lugar,date,fechaOriginal,hora,categoriaSugerida,totalImpreso,numItemsImpreso,confianza}=_scanPending;
  const totalAmt=items.reduce((s,it)=>s+(it.monto||0),0);
  const multi=items.length>1;
  const banners=[];
  if(confianza==='baja')banners.push(`<div style="background:var(--amber-bg);border:1px solid rgba(217,119,6,.3);border-radius:var(--rsm);padding:10px 13px;font-size:13px;color:var(--amber-t);margin-bottom:7px">⚠️ Algunos datos podrían estar mal leídos — revísalos antes de guardar</div>`);
  if(totalImpreso!=null&&Math.abs(totalAmt-totalImpreso)>1)banners.push(`<div style="background:var(--amber-bg);border:1px solid rgba(217,119,6,.3);border-radius:var(--rsm);padding:10px 13px;font-size:13px;color:var(--amber-t);margin-bottom:7px">⚠️ El total detectado (${fmt(totalAmt)}) no coincide con el del ticket (${fmt(totalImpreso)}) — revisa los montos o vuelve a tomar la foto</div>`);
  if(numItemsImpreso!=null&&numItemsImpreso!==items.length)banners.push(`<div style="background:var(--amber-bg);border:1px solid rgba(217,119,6,.3);border-radius:var(--rsm);padding:10px 13px;font-size:13px;color:var(--amber-t);margin-bottom:7px">⚠️ Detectamos ${items.length} de ${numItemsImpreso} productos</div>`);
  const hayAvisos = banners.length>0;
  const retryBtn = hayAvisos
    ? `<button onclick="discardScan();openScanOptions();" style="width:100%;margin-bottom:9px;background:transparent;border:1px solid var(--amber);border-radius:var(--rsm);padding:9px;font-size:13px;color:var(--amber-t);font-weight:600;cursor:pointer;font-family:var(--font-title)">📷 Volver a tomar la foto</button>`
    : '';
  if(multi){
    document.getElementById('scan-fields').innerHTML=`
      ${banners.join('')}
      ${retryBtn}
      <div style="font-size:11px;color:var(--t3);letter-spacing:.04em;margin-bottom:5px">${lugar||'Detectado'}</div>
      ${items.map((it,idx)=>`<div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-bottom:4px;gap:6px"><span style="color:var(--t1);flex:1;">${it.descripcion||'ítem'}</span><span style="font-weight:600;white-space:nowrap;color:var(--t1)">${fmt(it.monto||0)}</span><button onclick="editScanItem(${idx})" style="background:rgba(45,81,88,.1);border:1px solid #2d5158;border-radius:6px;padding:3px 10px;font-size:11px;color:#2d5158;cursor:pointer;white-space:nowrap;font-family:var(--font-body);font-weight:600">editar</button><button onclick="removeScanItem(${idx})" style="background:rgba(230,57,70,.08);border:1px solid var(--red-b);border-radius:6px;padding:3px 9px;font-size:13px;color:var(--red);cursor:pointer;white-space:nowrap;font-family:var(--font-body);font-weight:700;line-height:1.4">×</button></div>`).join('')}
      <div style="border-top:.5px solid var(--b2);margin-top:6px;padding-top:6px;display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--t3)">Total</span><span style="font-weight:700;color:var(--t1)">${fmt(totalAmt)}</span></div>
      ${date?`<div style="font-size:11px;color:${fechaOriginal?'var(--t3)':'var(--amber-t)'};margin-top:4px">${fechaOriginal||date}${fechaOriginal?'':' (verificar)'}${hora?' · '+hora:''}</div>`:''}
    `;
  }else{
    document.getElementById('scan-fields').innerHTML=`${banners.join('')}${retryBtn}<div style="font-size:12px;color:var(--t3)">Revisa y ajusta los campos de abajo si es necesario</div>`;
  }
  const resEl=document.getElementById('scan-res');
  const btnsEl=document.getElementById('scan-res-btns');
  console.log('SCAN multi:', multi, 'btnsEl:', !!btnsEl, 'items:', items.length);
  if(multi&&btnsEl){
    btnsEl.style.display='flex';
    btnsEl.innerHTML=`<button class="ms-disc" style="flex:1" onclick="discardScan()">× Descartar</button>
      <button class="ms-disc" style="flex:1;background:#d3e458;color:#0d0d0d;border-color:#d3e458;font-weight:700" onclick="saveAllScan()">Guardar ${items.length} gastos</button>`;
  }else if(btnsEl){
    // para 1 solo gasto: ocultar estos botones de aquí, se muestran junto a "guardar gasto" al final
    btnsEl.style.display='none';
    const bottomBtns=document.getElementById('scan-bottom-btns');
    if(bottomBtns){
      bottomBtns.style.display='flex';
      bottomBtns.innerHTML=`<button class="ms-disc" style="flex:1;color:var(--amber);border-color:rgba(255,187,51,.3)" onclick="saveDraft()">Guardar borrador</button>`;
    }
  }
  // ocultar formulario manual cuando hay scan múltiple
  const scanMultiMode=document.getElementById('scan-multi-hide');
  if(multi){
    if(!scanMultiMode){
      const hideDiv=document.createElement('style');
      hideDiv.id='scan-multi-hide';
      hideDiv.textContent=`#sh-add .f-lbl,#sh-add .amt-wr,#sh-add .txt-in,#sh-add .eg,#sh-add .tog-row,#sh-add #btn-add-tx,#sh-add #dup-warn{display:none!important}`;
      document.head.appendChild(hideDiv);
    }
  }else{
    const s=document.getElementById('scan-multi-hide');if(s)s.remove();
    const it=items[0];
    document.getElementById('a-amt').value=it.monto||'';
    document.getElementById('tx-consumo').value=it.descripcion||'';
    document.getElementById('tx-lugar').value=lugar;
    aHormi=!!(it.monto&&it.monto<=D.threshold);
    document.getElementById('h-pill').classList.toggle('on',aHormi);
    const cg=categoriaSugerida?{id:categoriaSugerida}:guessCat(it.descripcion||lugar||'');selAddCat(cg.id);
    if((it.descripcion||'').length>=5)checkAndShowDuplicate(it.descripcion);
    const cb=document.getElementById('scan-confirm-banner');if(cb)cb.style.display='';
    // restaurar fecha/hora detectadas por el scan (se pierden si
    // openAddSheet las pisó al restaurar desde la burbuja)
    const di=document.getElementById('a-date');
    if(di){
      if(fechaOriginal){di.value=date;}
      else{showMissingDateWarning();}
    }
    if(hora){
      const ti=document.getElementById('a-time');
      if(ti)ti.value=hora.padStart(5,'0');
    }
  }
  if(resEl)resEl.style.display='block';
  syncHeaderButtons();
}
function removeScanItem(idx){
  if(!_scanPending||!_scanPending.items[idx])return;
  _scanPending.items.splice(idx,1);
  if(!_scanPending.items.length){discardScan();toast('Sin ítems','warn');return;}
  rerenderScanPreview();
}
let _editScanIdx=null,_esiCatSel=null;
function editScanItem(idx){
  if(!_scanPending||!_scanPending.items[idx])return;
  _editScanIdx=idx;
  const it=_scanPending.items[idx];
  document.getElementById('esi-desc').value=it.descripcion||'';
  document.getElementById('esi-amt').value=it.monto||'';
  document.getElementById('esi-lugar').value=it.lugar||_scanPending.lugar||'';
  document.getElementById('esi-date').value=it.date||_scanPending.date||td();
  document.getElementById('esi-time').value=it.time||'';
  const guess=guessCat(it.descripcion||'');
  _esiCatSel=it.categoria||guess.id;
  const isHormi=it.isHormi!==undefined?it.isHormi:_esiCatSel!=='market';
  document.getElementById('esi-hormi-pill').classList.toggle('on',isHormi);
  renderEsiCatGrid();
  document.getElementById('m-edit-scan-item').classList.add('open');
}
function renderEsiCatGrid(){
  const cats=allCats();
  document.getElementById('esi-cats').innerHTML=cats.map(c=>`
    <button onclick="esiSelCat('${c.id}',this)" style="display:flex;align-items:center;gap:6px;padding:9px 12px;border-radius:12px;border:1.5px solid ${_esiCatSel===c.id?'var(--lime-t)':'var(--b2)'};background:${_esiCatSel===c.id?'rgba(200,246,90,.15)':'var(--bg)'};cursor:pointer;font-size:13px;font-family:var(--font-body);color:var(--t1);font-weight:${_esiCatSel===c.id?'700':'400'};transition:all .15s;-webkit-tap-highlight-color:transparent">
      <span style="font-size:16px">${c.e}</span><span>${c.l}</span>
    </button>`).join('')
    +`<button onclick="openCatEditor('edit')" title="personalizar" style="display:flex;align-items:center;gap:6px;padding:9px 12px;border-radius:12px;border:1.5px dashed var(--b2);background:var(--bg);cursor:pointer;font-size:13px;font-family:var(--font-body);color:var(--t1);-webkit-tap-highlight-color:transparent">
      <span style="font-size:16px">＋</span><span>crear</span>
    </button>`;
}
function esiSelCat(id,el){
  _esiCatSel=id;
  document.querySelectorAll('#esi-cats button').forEach(b=>{
    const sel=b===el;
    b.style.borderColor=sel?'var(--lime-t)':'var(--b2)';
    b.style.background=sel?'rgba(200,246,90,.15)':'var(--bg)';
    b.style.fontWeight=sel?'700':'400';
  });
}
function saveEditScanItem(){
  if(_editScanIdx===null||!_scanPending)return;
  const desc=document.getElementById('esi-desc').value.trim();
  const amt=parseFloat(document.getElementById('esi-amt').value);
  if(!desc){toast('Escribe una descripción','warn');return;}
  if(isNaN(amt)||amt<=0){toast('Monto inválido','warn');return;}
  const it=_scanPending.items[_editScanIdx];
  it.descripcion=desc;
  it.monto=amt;
  it.lugar=document.getElementById('esi-lugar').value.trim();
  it.date=document.getElementById('esi-date').value||it.date;
  it.time=document.getElementById('esi-time').value||'';
  it.isHormi=document.getElementById('esi-hormi-pill').classList.contains('on');
  if(_esiCatSel)it.categoria=_esiCatSel;
  closeOv('m-edit-scan-item');
  _editScanIdx=null;
  rerenderScanPreview();
  toast('Ítem actualizado ✓','ok');
}
function saveAllScan(){
  if(!_scanPending||!_scanPending.items.length){toast('Sin ítems para guardar','warn');return;}
  const {items,lugar,date}=_scanPending;
  let count=0;
  items.forEach((it,i)=>{
    const amt=parseFloat(it.monto)||0;if(amt<=0)return;
    const consumo=it.descripcion||'';
    const description=lugar?`${consumo} en ${lugar}`:consumo;
    const catId=it.categoria;
    const cat=(catId&&allCats().find(c=>c.id===catId))||guessCat(consumo||lugar||'');
    const itemDate=it.date||date;
    const itemTime=it.time?('T'+it.time+':00'):'T12:00:00';
    const ts=scanReceiptTs?(scanReceiptTs):(itemDate+itemTime);
    const mTx={id:Date.now()+i,date:itemDate,ts,amount:amt,description:description||cat.l,category:cat.id,emoji:cat.e,isHormi:cat.id!=='market',hasTime:!!scanReceiptTs,imageThumb:i===0?(_currentThumb||undefined):undefined,source:'scan'};
    D.transactions.unshift(mTx);saveTx(mTx);count++;
  });
  if(count>0){
    const savedDate=date;
    save();discardScan();closeOv('sh-add');selectDay(savedDate>td()?td():savedDate);
    toast(`${count} gasto${count!==1?'s':''} guardado${count!==1?'s':''} ✓`,'ok');
  }
  else{_scanState='idle';resetScanUI();toast('Sin montos válidos','warn');}
}
function discardScan(){
  const bb=document.getElementById('scan-bottom-btns');if(bb){bb.style.display='none';bb.innerHTML='';}
  const srb=document.getElementById('scan-res-btns');
  if(srb)srb.innerHTML=`<button class="ms-disc" style="flex:1" onclick="discardScan()">× Descartar</button><button class="ms-disc" style="flex:1;color:var(--amber);border-color:rgba(255,187,51,.3)" onclick="saveDraft()">Guardar borrador</button>`;
  document.getElementById('scan-res').style.display='none';
  document.getElementById('scan-st').innerHTML='';
  document.getElementById('a-amt').value='';
  document.getElementById('tx-consumo').value='';document.getElementById('tx-lugar').value='';
  document.getElementById('alias-match').style.display='none';
  document.getElementById('dup-warn').style.display='none';
  document.getElementById('a-time').value='';
  document.getElementById('a-date').value=_selDay||td();
  const _dcb=document.getElementById('scan-confirm-banner');if(_dcb)_dcb.style.display='none';
  const _sdw=document.getElementById('scan-date-warning');if(_sdw)_sdw.remove();
  const _sdb=document.getElementById('btn-add-tx');if(_sdb){_sdb.disabled=false;_sdb.style.opacity='';}
  const _da=document.getElementById('a-date');if(_da){_da.style.border='';_da.style.background='';}
  scanReceiptTs=null;txDate=null;_currentThumb=null;_scanPending=null;
  const s=document.getElementById('scan-multi-hide');if(s)s.remove();
  _scanState='idle';_scanSheetOpen=false;_voiceMode=false;updateScanBubble();
  resetScanUI();
}
function resetScanUI(){
  const mb=document.getElementById('scan-minimize-btn');
  if(mb)mb.style.display='none';
  const bubble=document.getElementById('scan-bubble');
  if(bubble)bubble.style.display='none';
  const ssb2=document.getElementById('scan-save-btn');
  if(ssb2){ssb2.style.display='none';ssb2.style.opacity='1';delete ssb2.dataset.blocked;}
  syncHeaderButtons();
}
function syncHeaderButtons(){
  const save=document.getElementById('scan-save-btn');
  const min=document.getElementById('scan-minimize-btn');
  const closeIcon=document.getElementById('scan-close-icon');
  const hayScan=!!_scanPending||_scanState==='processing'||_scanState==='ready'||_scanState==='warning';
  const tieneContenido=!!_scanPending||_scanState==='ready';

  if(save)save.style.display=((_scanState==='ready'||_scanState==='warning')&&tieneContenido)?'flex':'none';
  if(min)min.style.display=(_scanState==='processing'&&!_voiceMode)?'flex':'none';

  // ícono dinámico: papelera si hay scan que descartar, × si no
  if(closeIcon){
    closeIcon.setAttribute('data-lucide',hayScan?'trash-2':'x');
    closeIcon.style.color=hayScan?'var(--red)':'var(--t3)';
    closeIcon.style.width=hayScan?'19px':'20px';
    closeIcon.style.height=hayScan?'19px':'20px';
  }
  if(window.lucide)lucide.createIcons();
  const retry=document.getElementById('voice-retry-btn');
  if(retry)retry.style.display=(_voiceMode&&(_scanState==='ready'||_scanState==='warning'))?'flex':'none';
}
function saveScanFromHeader(){
  const hdrSave=document.getElementById('scan-save-btn');
  if(hdrSave&&hdrSave.dataset.blocked){toast('Ingresa la fecha para continuar','warn');return;}
  if(_scanPending&&_scanPending.items&&_scanPending.items.length>1){saveAllScan();return;}
  const btn=document.getElementById('btn-add-tx');
  if(btn&&!btn.disabled)addTx();
  else toast('Completa los campos faltantes','warn');
}
function closeAddSheet(){
  _voiceMode=false;
  if(_scanState==='processing'){
    if(!confirm('¿Cancelar el escaneo en curso? Se perderá el progreso.'))return;
    window._scanning=false;
    _scanState='idle';
    discardScan();          // limpia DOM + _scanPending + estado
    closeOv('sh-add');
    toast('Escaneo cancelado','');
    return;
  }
  // ready/warning/idle
  if(_scanPending||_scanState!=='idle'){
    discardScan();   // había un scan: limpieza completa
  }else{
    _scanSheetOpen=false;  // gasto manual: solo cerrar, no borrar lo escrito
    resetScanUI();
  }
  closeOv('sh-add');
}
function saveDraft(){
  const amt=parseFloat(document.getElementById('a-amt').value);
  const consumo=document.getElementById('tx-consumo').value.trim();
  const lugar=document.getElementById('tx-lugar').value.trim();
  if(_scanPending&&_scanPending.items&&_scanPending.items.length>1){saveAllScan();return;}
  if(!amt||amt<=0){toast('Sin monto para el borrador','warn');return;}
  const cat=allCats().find(c=>c.id===aCat)||CATS[14];
  const dateFieldVal=document.getElementById('a-date')?.value;
  const timeFieldVal=document.getElementById('a-time')?.value||'';
  const date=dateFieldVal||txDate||td();
  let ts,hasTime;
  if(timeFieldVal){ts=`${date}T${timeFieldVal}:00`;hasTime=true;}
  else if(scanReceiptTs){ts=scanReceiptTs;hasTime=true;}
  else{ts=date+'T12:00:00';hasTime=false;}
  const description=lugar?`${consumo||cat.l} en ${lugar}`:(consumo||cat.l);
  const draftTx={id:Date.now(),date,ts,amount:amt,description,category:cat.id,emoji:cat.e,isHormi:aHormi,hasTime,isDraft:true,imageThumb:_currentThumb||undefined,source:_txSource};
  _txSource='manual';
  D.transactions.unshift(draftTx);
  save();saveTx(draftTx);discardScan();closeOv('sh-add');selectDay(date>td()?td():date);toast('Borrador guardado','ok');
}
// ── MULTI-SCAN ────────────────────────────────────────────────────────────────
let msQueue=[];// {id,status,data,confirmed,hash,thumb}
function openMultiScan(){msQueue=[];renderMsQueue();openSheet('sh-multi');}
async function addMultiFiles(input){
  const files=[...input.files];input.value='';
  for(const f of files){
    const id=Date.now()+Math.random();
    const b64=await toJpegBase64(f);
    // Hash más robusto: combina inicio + medio + fin del base64 para evitar falsos positivos por metadata JPEG compartida
    const len=b64.length;
    const hash=b64.slice(0,200)+'|'+b64.slice(Math.floor(len/2)-100,Math.floor(len/2)+100)+'|'+b64.slice(-200)+'|'+len;
    if(msQueue.some(x=>x.hash===hash)){toast('⚠️ Esta imagen ya fue agregada','warn');continue;}
    const mime='image/jpeg';
    const thumb=await compressImageThumb(b64,mime).catch(()=>null);
    msQueue.push({id,status:'scanning',data:null,confirmed:false,hash,thumb});
    renderMsQueue();
    try{
      const multiPrompt=`Analiza este comprobante de pago peruano. Si NO es un comprobante válido, responde: {"error":"no_receipt"}. Si es válido, extrae monto total (number), descripción del producto o establecimiento (string), fecha (DD/MM/YYYY), hora (HH:MM o null) y categoría. Responde SOLO JSON sin markdown: {"amount":0.00,"description":"nombre comercial","date":"DD/MM/YYYY","time":"HH:MM o null","categoria_sugerida":"ID"}. IDs: food(comida/restaurante), drink(café/bebidas), snack(postres/dulces/waffles), del(delivery), trans(taxi/combustible/grifo), subs(apps/streaming), health(farmacia/médico), beauty(spa/peluquería), sport(gimnasio), edu(libros/cursos), shop(ropa/tiendas), soc(bares/alcohol), enter(cine/teatro), other. Usa tu conocimiento de negocios peruanos para categorizar.`;
      const{data:{session:_ss2}}=await _sb.auth.getSession();
      const r=await fetch(SCAN_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${_ss2?.access_token||''}`},body:JSON.stringify({image_base64:b64,media_type:mime,prompt:multiPrompt})});
      const p=await r.json();
      const item=msQueue.find(x=>x.id===id);if(!item)continue;
      if(p.error){item.status='error';item.data={error:p.error==='no_receipt'?'No parece comprobante':p.error==='no_product'?'Sin producto identificable':p.error};}
      else{item.status='done';item.data=p;item.confirmed=true;}
    }catch(e){const item=msQueue.find(x=>x.id===id);if(item){item.status='error';item.data={error:e.message};}}
    renderMsQueue();
  }
}
function renderMsQueue(){
  const el=document.getElementById('ms-queue');
  const empty=document.getElementById('ms-empty');
  const saveBtn=document.getElementById('ms-save-all');
  const active=msQueue.filter(x=>x.status!=='discarded');
  if(!active.length){el.innerHTML='';empty.style.display='';saveBtn.style.display='none';return;}
  empty.style.display='none';
  const confirmed=active.filter(x=>x.status==='done');
  saveBtn.style.display=confirmed.length?'':'none';
  saveBtn.textContent=`Guardar ${confirmed.length} gasto${confirmed.length!==1?'s':''}`;
  el.innerHTML=active.map(item=>{
    if(item.status==='scanning'){
      const th=item.thumb?`<img class="ms-thumb" src="data:image/jpeg;base64,${item.thumb}">`:`<div class="ms-thumb-ph"><span class="spin"></span></div>`;
      return`<div class="ms-card-new"><div style="display:flex;align-items:center;gap:10px">${th}<div style="flex:1;font-size:13px;color:var(--t3)">Escaneando...</div></div></div>`;
    }
    if(item.status==='error'){
      const th=item.thumb?`<img class="ms-thumb" src="data:image/jpeg;base64,${item.thumb}">`:`<div class="ms-thumb-ph">⚠️</div>`;
      return`<div class="ms-card-new"><div style="display:flex;align-items:center;gap:10px">${th}<div style="flex:1;font-size:13px;color:var(--red)">${item.data?.error||'Error'}</div><button class="ms-disc-btn" onclick="msDrop(${item.id})">×</button></div></div>`;
    }
    const p=item.data||{};
    const th=item.thumb?`<img class="ms-thumb" src="data:image/jpeg;base64,${item.thumb}">`:`<div class="ms-thumb-ph">📄</div>`;
    const iid=`ms-${item.id}`.replace('.','_');
    const aiid=`msa-${item.id}`.replace('.','_');
    const ds=p.date?parseReceiptDate(p.date)||td():td();
    const catGuess=guessCat(p.description||'');
    const catSel=item.catSel||p.categoria_sugerida||catGuess.id;
    const miniCats=[
      {id:'food',e:'🍔'},{id:'drink',e:'☕'},{id:'snack',e:'🍪'},{id:'del',e:'📦'},
      {id:'trans',e:'🚕'},{id:'health',e:'💊'},{id:'beauty',e:'💅'},{id:'subs',e:'📱'},
      {id:'sport',e:'🏋️'},{id:'shop',e:'👕'},{id:'soc',e:'🥂'},{id:'enter',e:'🎬'},{id:'other',e:'📌'}
    ];
    return`<div class="ms-card-new confirmed" id="msc-${iid}">
  <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">
    ${th}
    <div style="flex:1;min-width:0">
      <input class="ms-inline-in" id="${aiid}" value="${(p.description||'').replace(/"/g,'&quot;')}" placeholder="descripción..." oninput="msUpdateDesc(${item.id},this.value)" style="width:100%;margin-bottom:4px">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:13px;color:var(--t3);font-weight:500">S/</span>
        <input class="ms-amt-in" type="number" inputmode="decimal" value="${p.amount||''}" placeholder="0.00" oninput="msUpdateAmt(${item.id},this.value)" style="font-size:15px;font-weight:700;width:80px">
      </div>
      <div style="font-size:11px;color:var(--t3);margin-top:2px">${ds}</div>
    </div>
    <button class="ms-disc-btn" onclick="msDiscard(${item.id})" style="flex-shrink:0;margin-top:2px">×</button>
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:4px">
    ${miniCats.map(c=>`<button onclick="msSetCat(${item.id},'${c.id}',this)" style="padding:4px 8px;border-radius:20px;border:1.5px solid ${catSel===c.id?'var(--lime-t)':'var(--b2)'};background:${catSel===c.id?'rgba(200,246,90,.15)':'transparent'};font-size:13px;cursor:pointer;transition:all .1s" title="${c.id}">${c.e}</button>`).join('')}
  </div>
</div>`;
  }).join('');
}
function msUpdateDesc(id,v){const it=msQueue.find(x=>x.id===id);if(it&&it.data)it.data.description=v;}
function msUpdateAmt(id,v){const it=msQueue.find(x=>x.id===id);if(it&&it.data)it.data.amount=parseFloat(v)||0;}
function msSetCat(id,catId,btn){
  const it=msQueue.find(x=>x.id===id);
  if(!it)return;
  it.catSel=catId;
  if(it.data)it.data.categoria_sugerida=catId;
  // update button styles without full re-render
  const card=btn.closest('.ms-card-new');
  if(card)card.querySelectorAll('[title]').forEach(b=>{
    const sel=b.getAttribute('title')===catId;
    b.style.borderColor=sel?'var(--lime-t)':'var(--b2)';
    b.style.background=sel?'rgba(200,246,90,.15)':'transparent';
  });
}
function msToggle(id){const it=msQueue.find(x=>x.id===id);if(it){it.confirmed=!it.confirmed;}renderMsQueue();}
function msDiscard(id){const it=msQueue.find(x=>x.id===id);if(it){it.confirmed=false;it.status='discarded';}renderMsQueue();}
function msDrop(id){msQueue=msQueue.filter(x=>x.id!==id);renderMsQueue();}
function msConfirm(id){const it=msQueue.find(x=>x.id===id);if(it)it.confirmed=!it.confirmed;renderMsQueue();}
function saveAllMulti(){
  const toSave=msQueue.filter(x=>x.status==='done'&&x.confirmed&&x.data);
  let count=0;
  let lastDate=null;
  toSave.forEach(item=>{
    const p=item.data;
    const amt=parseFloat(p.amount)||0;if(amt<=0)return;
    let ds=td();if(p.date){const m=p.date.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);if(m){const y=m[3].length===2?'20'+m[3]:m[3];ds=`${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}}
    let ts=ds+'T12:00:00',hasTime=false;
    if(p.time&&/^\d{1,2}:\d{2}$/.test(p.time)){ts=`${ds}T${p.time.padStart(5,'0')}:00`;hasTime=true;}
    const catId=item.catSel||p.categoria_sugerida;
    const cat=catId?allCats().find(c=>c.id===catId)||guessCat(p.description||''):guessCat(p.description||'');
    const mTx={id:Date.now()+Math.random(),date:ds,ts,amount:amt,description:p.description||cat.l,category:cat.id,emoji:cat.e,isHormi:cat.id!=='market',hasTime,source:'scan'};
    D.transactions.unshift(mTx);saveTx(mTx);
    count++;
    lastDate=ds;
  });
  if(count>0){save();closeOv('sh-multi');selectDay(lastDate>td()?td():lastDate);toast(`${count} gasto${count!==1?'s':''} guardado${count!==1?'s':''}  ✓`,'ok');}
  else toast('Sin gastos confirmados','warn');
}

function f2b64(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(f);});}
async function toJpegBase64(file){
  return new Promise((res,rej)=>{
    const reader=new FileReader();
    reader.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        const canvas=document.createElement('canvas');
        canvas.width=img.naturalWidth;
        canvas.height=img.naturalHeight;
        const ctx=canvas.getContext('2d');
        ctx.drawImage(img,0,0);
        const dataUrl=canvas.toDataURL('image/jpeg',0.78);
        res(dataUrl.split(',')[1]);
      };
      img.onerror=()=>rej(new Error('No se pudo leer la imagen'));
      img.src=e.target.result;
    };
    reader.onerror=rej;
    reader.readAsDataURL(file);
  });
}
function ttime(t){
  if(!t.hasTime||!t.ts)return'';
  const d=new Date(t.ts);
  return`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ── ADD TX ────────────────────────────────────────────────────────────────────
const CAT_EMOJIS=['🛒','🍔','☕','🍪','🍕','🥗','🍺','🚗','🚕','⛽','🏠','💊','💅','💇','🏋️','⚽','📚','🎮','🎬','🎵','👕','👗','👟','💻','📱','🎁','🐶','🐱','🌱','🧹','🧼','🚿','✈️','🏨','🎨','🔧','💡','📷','🎯','💰','🫙'];
let _catEditorMode=null; // 'new-add' | 'new-edit' | null (contexto de dónde se abrió)
let _catEditorEmoji='🫙';
function allCats(){return[...CATS,...(D.customCats||[]).map(c=>({id:'c_'+c.l,e:c.e,l:c.l}))];}
function buildAddGrid(){
  const el=document.getElementById('a-eg');
  const cats=allCats();
  el.innerHTML=cats.map(c=>`<button class="eb${c.id===aCat?' on':''}" onclick="selAddCat('${c.id}')"><div class="eb-e">${c.e}</div><div class="eb-nm">${c.l}</div></button>`).join('')
    +`<button class="eb" onclick="openCatEditor('add')" title="personalizar"><div class="eb-e">＋</div><div class="eb-nm">crear</div></button>`;
}
function selAddCat(id){
  aCat=id;
  document.querySelectorAll('#a-eg .eb:not([onclick*="openCatEditor"])').forEach(b=>b.classList.toggle('on',b.querySelector('.eb-nm')?.textContent===(allCats().find(c=>c.id===id)||{}).l));
}
let _catEditingLabel=null; // si no es null, estamos editando esa cat
function openCatEditor(context, editLabel){
  _catEditorMode=context;
  _catEditingLabel=editLabel||null;
  if(editLabel){
    const cat=(D.customCats||[]).find(c=>c.l===editLabel);
    _catEditorEmoji=cat?cat.e:'🫙';
    document.getElementById('m-cat-title').textContent='editar categoría';
    document.getElementById('cat-name-in').value=cat?cat.l:'';
  }else{
    _catEditorEmoji='🫙';
    document.getElementById('m-cat-title').textContent='nueva categoría';
    document.getElementById('cat-name-in').value='';
  }
  const ci=document.getElementById('cat-emoji-custom');if(ci)ci.value='';
  const pv=document.getElementById('cat-emoji-preview');if(pv)pv.textContent=_catEditorEmoji;
  renderEmojiGrid();
  openSheet('m-cat-editor');
}
function contarGrafemas(str){
  try{
    const seg=new Intl.Segmenter('es',{granularity:'grapheme'});
    return [...seg.segment(str)].length;
  }catch(e){
    return [...str].length; // fallback aproximado
  }
}
function esEmoji(str){
  if(!str)return false;
  return /\p{Extended_Pictographic}/u.test(str);
}
function onCustomEmojiInput(val){
  const v=(val||'').trim();
  if(!v){
    document.getElementById('cat-emoji-preview').textContent=_catEditorEmoji;
    return;
  }
  if(esEmoji(v)&&contarGrafemas(v)===1){
    _catEditorEmoji=v;
    document.getElementById('cat-emoji-preview').textContent=v;
    renderEmojiGrid(); // deselecciona los de la grilla
  }else{
    document.getElementById('cat-emoji-preview').textContent='⚠️';
  }
}
function renderEmojiGrid(){
  document.getElementById('cat-emoji-grid').innerHTML=CAT_EMOJIS.map(e=>
    `<button onclick="selCatEmoji('${e}')" style="font-size:22px;padding:6px;border-radius:8px;border:1.5px solid ${_catEditorEmoji===e?'var(--lime-t)':'var(--b2)'};background:${_catEditorEmoji===e?'rgba(200,246,90,.15)':'var(--bg)'};cursor:pointer;-webkit-tap-highlight-color:transparent">${e}</button>`
  ).join('');
}
function selCatEmoji(e){
  _catEditorEmoji=e;
  const ci=document.getElementById('cat-emoji-custom');if(ci)ci.value='';
  const pv=document.getElementById('cat-emoji-preview');if(pv)pv.textContent=e;
  renderEmojiGrid();
}
function saveCatEditor(){
  const l=document.getElementById('cat-name-in').value.trim();
  if(!l){toast('Escribe un nombre','warn');return;}
  if(!D.customCats)D.customCats=[];

  if(_catEditingLabel){
    // EDITAR: buscar la cat original
    const cat=D.customCats.find(c=>c.l===_catEditingLabel);
    if(!cat){closeOv('m-cat-editor');return;}
    const nombreCambia = l.toLowerCase()!==_catEditingLabel.toLowerCase();
    // si cambia el nombre, validar que el nuevo no choque
    if(nombreCambia){
      if(D.customCats.find(c=>c.l.toLowerCase()===l.toLowerCase())){toast('Ya existe esa categoría','warn');return;}
      if(CATS.find(c=>c.l.toLowerCase()===l.toLowerCase())){toast('Ese nombre ya es una categoría','warn');return;}
      // el id es 'c_'+label, así que cambiar nombre cambia el id:
      // reasignar los gastos que usaban el id viejo al nuevo
      const oldId='c_'+cat.l, newId='c_'+l;
      D.transactions.forEach(t=>{if(t.category===oldId){t.category=newId;saveTx(t);}});
    }
    if(!esEmoji(_catEditorEmoji)){toast('Elige un emoji válido','warn');return;}
    cat.l=l;
    cat.e=_catEditorEmoji;
    // actualizar emoji en los gastos que usan esta cat
    const curId='c_'+l;
    D.transactions.forEach(t=>{if(t.category===curId){t.emoji=_catEditorEmoji;saveTx(t);}});
    save();saveUserData();
    closeOv('m-cat-editor');
    buildAddGrid();renderSet();
    toast('Categoría actualizada ✓','ok');
    return;
  }

  // CREAR (lógica existente)
  if(D.customCats.find(c=>c.l.toLowerCase()===l.toLowerCase())){toast('Ya existe esa categoría','warn');return;}
  if(CATS.find(c=>c.l.toLowerCase()===l.toLowerCase())){toast('Ese nombre ya es una categoría','warn');return;}
  if(!esEmoji(_catEditorEmoji)){toast('Elige un emoji válido','warn');return;}
  D.customCats.push({e:_catEditorEmoji,l});
  save();saveUserData();
  closeOv('m-cat-editor');
  const newId='c_'+l;
  if(_catEditorMode==='edit'){_esiCatSel=newId;renderEsiCatGrid();}
  else{buildAddGrid();selAddCat(newId);}
  toast('Categoría creada ✓','ok');
}
function delCustomCatFromSet(catId){
  const cat=(D.customCats||[]).find(c=>'c_'+c.l===catId);
  if(!cat)return;
  const afectados=D.transactions.filter(t=>t.category===catId).length;
  const msg=afectados>0
    ? `Eliminar "${cat.l}"? ${afectados} gasto(s) pasarán a Otros.`
    : `Eliminar "${cat.l}"?`;
  if(!confirm(msg))return;
  D.transactions.forEach(t=>{if(t.category===catId){t.category='other';t.emoji='🫙';saveTx(t);}});
  D.customCats=D.customCats.filter(c=>'c_'+c.l!==catId);
  save();saveUserData();
  buildAddGrid();  // repinta el grid de gastos
  renderSet();     // repinta esta pantalla
  toast('Categoría eliminada','ok');
}
function togHormi(){aHormi=!aHormi;document.getElementById('h-pill').classList.toggle('on',aHormi);}

document.getElementById('a-amt')?.addEventListener('input',function(){
  const v=parseFloat(this.value);
  if(!isNaN(v)){aHormi=v<=D.threshold;document.getElementById('h-pill').classList.toggle('on',aHormi);}
});
document.getElementById('tx-consumo')?.addEventListener('blur',function(){
  if(this.value.length>=5)checkAndShowDuplicate(this.value);
});

function addTx(){
  const amt=parseFloat(document.getElementById('a-amt').value);
  const consumo=document.getElementById('tx-consumo').value.trim();
  const lugar=document.getElementById('tx-lugar').value.trim();
  if(!amt||amt<=0){toast('Ingresa un monto','warn');return;}
  const cat=allCats().find(c=>c.id===aCat)||CATS[14];
  const dateFieldVal=document.getElementById('a-date')?.value;
  const timeFieldVal=document.getElementById('a-time')?.value||'';
  const date=dateFieldVal||txDate||td();
  let ts,hasTime;
  if(timeFieldVal){ts=`${date}T${timeFieldVal}:00`;hasTime=true;}
  else if(scanReceiptTs){ts=scanReceiptTs;hasTime=true;}
  else{ts=date+'T12:00:00';hasTime=false;}
  const description=lugar?`${consumo||cat.l} en ${lugar}`:(consumo||cat.l);
  const newTx={id:Date.now(),date,ts,amount:amt,description,category:cat.id,emoji:cat.e,isHormi:aHormi,hasTime,imageThumb:_currentThumb||undefined,source:_txSource};
  D.transactions.unshift(newTx);
  save();saveTx(newTx);
  if(newTx.isHormi){
    evaluateGoals();
    const txsHoyHormi=D.transactions.filter(t=>t.isHormi&&t.date===newTx.date);
    if(txsHoyHormi.length===1){
      setTimeout(()=>showCelebrationPopup('primer_hormi',null),500);
      const yest=new Date(newTx.date+'T12:00:00');yest.setDate(yest.getDate()-1);
      const yd=yest.toISOString().slice(0,10);
      if(D.transactions.some(t=>t.isHormi&&t.date===yd)){
        setTimeout(()=>showCelebrationPopup('racha',calcStreak()),1000);
      }
    }
  }
  document.getElementById('a-amt').value='';document.getElementById('tx-consumo').value='';document.getElementById('tx-lugar').value='';
  document.getElementById('scan-res').style.display='none';document.getElementById('scan-st').innerHTML='';
  document.getElementById('alias-match').style.display='none';
  document.getElementById('dup-warn').style.display='none';
  const _cb=document.getElementById('scan-confirm-banner');if(_cb)_cb.style.display='none';
  const _sdw=document.getElementById('scan-date-warning');if(_sdw)_sdw.remove();
  const _sdb=document.getElementById('btn-add-tx');if(_sdb){_sdb.disabled=false;_sdb.style.opacity='';}
  const _adi=document.getElementById('a-date');if(_adi){_adi.style.border='';_adi.style.background='';_adi.value=_selDay||td();}
  document.getElementById('a-time').value='';
  txDate=null;scanReceiptTs=null;_currentThumb=null;_scanPending=null;_txSource='manual';
  _scanState='idle';_voiceMode=false;
  closeOv('sh-add');
  const _ss=document.getElementById('stat-streak');if(_ss)_ss.textContent=calcStreak();
  const today=td();
  if(date&&date!==today){
    // Calcular el offset de semana correcto para la fecha guardada
    const target=new Date(date+'T12:00:00');
    const nowDate=new Date(today+'T12:00:00');
    const diffMs=nowDate-target;
    const diffDays=Math.floor(diffMs/86400000);
    wkOffset=-Math.ceil(diffDays/7);
    _selDay=date;
    renderWk();
    renderDayForHome(true);
    go('home');
    toast(`Gasto guardado ✓ — viendo ${dlbl(date)}`,'ok',3500);
  }else{
    refreshCurrent();
    toast('Gasto guardado ✓','ok');
  }
}

function evaluateGoals(){
  let updated=false;
  const tm=new Date().toISOString().slice(0,7);
  D.goals.filter(g=>g.month===tm).forEach(g=>{
    const spent=D.transactions.filter(t=>t.date.startsWith(tm)&&(g.hormi?t.description.toLowerCase().includes((g.hormi||'').toLowerCase()):t.category===g.cat)).reduce((s,t)=>s+t.amount,0);
    if(g.budget>0&&spent>=g.budget&&!g.completed){
      g.completed=true;updated=true;
      const label=g.hormi||(allCats().find(c=>c.id===g.cat)||{l:g.cat}).l;
      setTimeout(()=>showCelebrationPopup('meta_cumplida',label),800);
    }
  });
  if(updated){save();saveUserData();}
}
function showCelebrationPopup(tipo,dato){
  const cfgs={
    racha:{icon:'flame',iconColor:'#d3e458',titulo:`${dato} días de racha`,subtitulo:'¡Racha activa!',mensaje:`Llevas ${dato} días consecutivos registrando tus gastos. ¡No pares!`,boton:'¡Vamos!'},
    meta_cumplida:{icon:'target',iconColor:'#407178',titulo:'¡Meta cumplida!',subtitulo:dato,mensaje:'Lograste tu objetivo de este mes. ¡Eres increíble!',boton:'¡Genial!'},
    primer_hormi:{icon:'check-circle',iconColor:'#d3e458',titulo:'¡Primer hormi del día!',subtitulo:'Registrado',mensaje:'Cada gasto que registras es un paso hacia tu meta. ¡Sigue así!',boton:'Continuar'}
  };
  const c=cfgs[tipo];if(!c)return;
  if(document.getElementById('celebration-popup'))return;
  const overlay=document.createElement('div');
  overlay.id='celebration-popup';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.2s ease';
  overlay.innerHTML=`
    <div style="background:#fff;border-radius:24px;padding:32px 24px;text-align:center;max-width:300px;width:100%;animation:popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)">
      <div style="width:64px;height:64px;background:${c.iconColor}22;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <i data-lucide="${c.icon}" style="width:32px;height:32px;color:${c.iconColor}"></i>
      </div>
      <div style="font-family:var(--font-title);font-size:26px;font-weight:800;color:#1a2e2a;line-height:1.1;margin-bottom:4px">${c.titulo}</div>
      <div style="font-family:var(--font-title);font-size:15px;font-weight:600;color:#407178;margin-bottom:8px">${c.subtitulo}</div>
      <div style="font-size:14px;color:#407178;line-height:1.5;margin-bottom:24px">${c.mensaje}</div>
      <button onclick="document.getElementById('celebration-popup').remove()" style="background:#d3e458;border:none;border-radius:100px;padding:14px 28px;font-family:var(--font-title);font-weight:700;font-size:15px;cursor:pointer;width:100%;color:#1a2e2a">${c.boton}</button>
    </div>`;
  document.body.appendChild(overlay);
  if(window.lucide)lucide.createIcons();
  setTimeout(()=>{const p=document.getElementById('celebration-popup');if(p)p.remove();},4000);
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function trialBannerHTML(){
  if(!D.trialStart||D.isPro)return'';
  const end=new Date(D.trialStart);end.setDate(end.getDate()+15);
  const daysLeft=Math.ceil((end-new Date())/86400000);
  if(daysLeft<=0)return'';
  return`<div class="trial-banner"><div style="font-size:12px"><span style="color:var(--lime-t);font-weight:600">Pro Trial</span> · ${daysLeft} día${daysLeft!==1?'s':''} restante${daysLeft!==1?'s':''}</div><button class="trial-banner-btn" onclick="openUpgrade()">Upgrade</button></div>`;
}

function dayLabel(ds){
  const yest=new Date(Date.now()-86400000).toISOString().slice(0,10);
  if(ds===td())return'Hoy';
  if(ds===yest)return'Ayer';
  const d=new Date(ds+'T12:00:00');
  const DN=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  return`${DN[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()].slice(0,3)}`;
}
function selectDay(ds){
  if(ds>td())return;
  _selDay=ds;
  const lblEl=document.getElementById('hm-daylbl');
  if(lblEl)lblEl.textContent=dayLabel(ds);
  // sync week offset if ds is outside current window
  const mon=weekStart(wkOffset);
  const target=new Date(ds+'T12:00:00');target.setHours(0,0,0,0);
  const diffDays=Math.round((mon-target)/86400000);
  if(diffDays>0)wkOffset=-Math.ceil(diffDays/7);
  renderWk();
  renderDayForHome(true);
}
function calcStreak(){
  if(!D.transactions||D.transactions.length===0)return 0;
  const diasConHormis=[...new Set(
    D.transactions.filter(t=>t.isHormi).map(t=>t.date)
  )].sort((a,b)=>b.localeCompare(a));
  if(diasConHormis.length===0)return 0;
  const hoy=td();
  const ayerD=new Date();ayerD.setDate(ayerD.getDate()-1);
  const ayerStr=`${ayerD.getFullYear()}-${String(ayerD.getMonth()+1).padStart(2,'0')}-${String(ayerD.getDate()).padStart(2,'0')}`;
  if(diasConHormis[0]!==hoy&&diasConHormis[0]!==ayerStr)return 0;
  let streak=1;
  for(let i=1;i<diasConHormis.length;i++){
    const prev=new Date(diasConHormis[i-1]+'T12:00:00');
    const curr=new Date(diasConHormis[i]+'T12:00:00');
    const diffDays=Math.round((prev-curr)/(1000*60*60*24));
    if(diffDays===1)streak++;
    else break;
  }
  return streak;
}
function renderStreak(){
  const pill=document.getElementById('streak-pill');
  if(!pill)return;
  const n=calcStreak();
  let ico,label,cls;
  if(n===0){ico='<i data-lucide="sprout" style="width:14px;height:14px"></i>';label='0 días';cls='';}
  else if(n<7){ico='🔥';label=`${n} día${n===1?'':'s'}`;cls='fire';}
  else if(n<30){ico='⚡';label=`${n} días`;cls='bolt';}
  else{ico='<i data-lucide="crown" style="width:14px;height:14px;color:#407178"></i>';label=`${n} días`;cls='crown';}
  pill.innerHTML=`${ico} ${label}`;
  pill.className='streak-pill'+(cls?' '+cls:'');
  pill.style.display='inline-flex';
  if(window.lucide)lucide.createIcons();
}
function showStreakTooltip(){
  const n=calcStreak();
  const icoEl=document.getElementById('st-ico');
  const msgEl=document.getElementById('st-msg');
  const ttEl=document.getElementById('streak-tooltip');
  if(!icoEl||!msgEl||!ttEl)return;
  let ico;
  if(n===0)ico='🌱';
  else if(n<7)ico='🔥';
  else if(n<30)ico='⚡';
  else ico='👑';
  icoEl.textContent=ico;
  if(n===0){
    msgEl.textContent='Registra tus gastos hoy para empezar tu racha 💪';
  }else{
    msgEl.textContent=`Llevas ${n} día${n===1?'':'s'} consecutivo${n===1?'':'s'} registrando gastos bajo tu límite. ¡Sigue así!`;
  }
  ttEl.style.display='flex';
}
function getGreeting(){const h=new Date().getHours();if(h<12)return'Buenos días';if(h<19)return'Buenas tardes';return'Buenas noches';}
function renderHome(){
  if(!_selDay)_selDay=td();
  document.getElementById('h-name').textContent=D.name||'tú';
  const grEl=document.getElementById('hm-greeting');if(grEl)grEl.textContent=getGreeting();
  const lblEl=document.getElementById('hm-daylbl');
  if(lblEl)lblEl.textContent=dayLabel(_selDay);
  const trialEl=document.getElementById('trial-banner-slot');
  if(trialEl)trialEl.innerHTML=trialBannerHTML();
  // stats row
  const today=td();const tm=today.slice(0,7);
  const txsMes=D.transactions.filter(t=>t.date.startsWith(tm));
  const txsHoy=D.transactions.filter(t=>t.date===today);
  const elStr=document.getElementById('stat-streak');if(elStr)elStr.textContent=calcStreak();
  const elMon=document.getElementById('stat-month');if(elMon)elMon.textContent='S/'+txsMes.reduce((s,t)=>s+t.amount,0).toFixed(0);
  const elTod=document.getElementById('stat-today');if(elTod)elTod.textContent='S/'+txsHoy.reduce((s,t)=>s+t.amount,0).toFixed(0);
  renderStreak();
  renderWk();
  renderDayForHome(false);
  initDaySwipe();
}
function renderDayForHome(animate){
  const el=document.getElementById('day-content');
  if(!el)return;
  if(animate){el.classList.remove('day-cnt-in');void el.offsetWidth;el.classList.add('day-cnt-in');}
  const today=td();
  const ds=_selDay||today;
  // goal preview (today only)
  const gpw=document.getElementById('gp-wrap');
  if(gpw&&ds===today){
    const gm=today.slice(0,7);
    const ag=D.goals.find(g=>g.month===gm);
    if(ag){
      const isHG=!!ag.hormi;const gc=isHG?null:CATS.find(c=>c.id===ag.cat);
      const glabel=isHG?ag.hormi:(gc?gc.e+' '+gc.l:'meta del mes');
      const gs=calcGoalSpent(ag);const gp=Math.min(gs/ag.budget*100,100);
      const pc=gs>ag.budget?'over':gs>ag.budget*.75?'warn':'ok';
      const fc=gs>ag.budget?'var(--red)':gs>ag.budget*.75?'var(--amber)':'var(--lime)';
      gpw.innerHTML=`<div class="goal-prev" onclick="go('goals')">
        <div class="gp-hd"><div class="gp-title">${glabel}</div><div class="gp-pill ${pc}">${Math.round(gp)}%</div></div>
        <div class="gp-bar"><div class="gp-fill" style="width:${gp}%;background:${fc}"></div></div>
        <div class="gp-ft"><span>gastado: ${fmt(gs)}</span><span>límite: ${fmt(ag.budget)}</span></div>
      </div>`;
    }else gpw.innerHTML='';
  }else if(gpw)gpw.innerHTML='';
  // budget card
  const bcEl=document.getElementById('bc-day');
  if(bcEl){
    if(ds>today){bcEl.innerHTML='';return;}
    const bud=D.budget||30;
    const hmTotal=D.transactions.filter(t=>t.date===ds&&t.isHormi).reduce((s,t)=>s+t.amount,0);
    const pct=Math.min(hmTotal/bud*100,100);
    const isOver=hmTotal>bud,isWarn=hmTotal>bud*.75;
    const cls=isOver?'over':isWarn?'warn':'ok';
    const fc=isOver?'var(--red)':isWarn?'var(--amber)':'var(--lime)';
    bcEl.innerHTML=`<div class="bc" style="margin:14px 18px">
      <div class="bc-row">
        <div>
          <div class="bc-lbl">hormigas${ds===today?' hoy':' este día'}</div>
          <div class="bc-amt ${cls}">${fmt(hmTotal)}</div>
          <div class="bc-meta">${isOver?`S/ ${(hmTotal-bud).toFixed(2)} sobre el límite`:`de S/ ${bud.toFixed(2)} límite`}</div>
        </div>
        ${ds===today?`<button class="lim-btn" onclick="openModal('m-budget')">límite diario</button>`:''}
      </div>
      <div class="prog"><div class="prog-f" style="width:${pct}%;background:${fc}"></div></div>
      <div class="bc-ft"><span>${Math.round(pct)}% usado</span><span>${isOver?'¡límite superado!':`S/ ${(bud-hmTotal).toFixed(2)} disponible`}</span></div>
    </div>`;
  }
  // feed
  const feedEl=document.getElementById('feed');
  if(!feedEl)return;
  if(ds>today){
    feedEl.innerHTML=`<div class="empty" style="padding:60px 20px"><div class="empty-ic">🔒</div><div style="font-size:15px;color:var(--t2);font-weight:500;margin-bottom:5px">Este día aún no llegó</div></div>`;
    return;
  }
  const txs=D.transactions.filter(t=>t.date===ds).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  if(!txs.length){
    feedEl.innerHTML=`<div class="empty-today"><div class="empty-today-ic"><i data-lucide="sparkles" style="width:24px;height:24px;color:#407178"></i></div><div class="empty-today-t">Sin hormigas ${ds===today?'hoy':'este día'}</div><div class="empty-today-s">${ds===today?'Toca + para registrar si gastas algo':'Un día limpio 👌'}</div></div>`;
    if(window.lucide)lucide.createIcons();
    return;
  }
  feedEl.innerHTML=txs.map(t=>{const tt=ttime(t);const catName=(allCats().find(c=>c.id===t.category)||CATS[14]).l;return`<div class="tx${t.isHormi?' hm':''}${t.isDraft?' draft':''}" onclick="openTxDetail(${t.id})" style="${t.isDraft?'border-color:rgba(255,187,51,.3)':''}">
    <div class="tx-ic">${t.emoji||'🫙'}</div>
    <div class="tx-nfo"><div class="tx-nm">${t.description}</div><div class="tx-ct">${catName}${tt?` · ${tt}`:''}</div></div>
    <div class="tx-r"><div class="tx-am">${fmt(t.amount)}</div>${t.isDraft?'<div class="draft-badge">borrador</div>':t.isHormi?'<div class="hm-tag">hormiga</div>':''}</div>
  </div>`;}).join('');
}
function initDaySwipe(){
  if(_swipeReady)return;_swipeReady=true;
  const el=document.getElementById('day-content');if(!el)return;
  el.addEventListener('touchstart',e=>{_swipeX=e.touches[0].clientX;_swipeY=e.touches[0].clientY;},{passive:true});
  el.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-_swipeX;
    const dy=e.changedTouches[0].clientY-_swipeY;
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){
      const cur=new Date((_selDay||td())+'T12:00:00');
      if(dx<0){const next=new Date(cur);next.setDate(cur.getDate()+1);const nds=next.toISOString().slice(0,10);if(nds<=td())selectDay(nds);}
      else{const prev=new Date(cur);prev.setDate(cur.getDate()-1);selectDay(prev.toISOString().slice(0,10));}
    }
  },{passive:true});
}
function dlbl(ds){const d=new Date(ds+'T12:00:00');return`${d.getDate()} ${MO[d.getMonth()].slice(0,3)}`;}
function delTx(id){if(!confirm('¿Eliminar?'))return;D.transactions=D.transactions.filter(t=>t.id!==id);save();deleteTxRemote(id);refreshCurrent();}
let _detailTxId=null;
function openTxDetail(id){
  const t=D.transactions.find(x=>x.id===id);if(!t)return;
  _detailTxId=id;
  const tt=ttime(t);
  document.getElementById('m-tx-title').textContent=t.isDraft?'Gasto borrador':'Detalle del gasto';
  document.getElementById('m-tx-body').innerHTML=`
    ${t.imageThumb?`<img src="data:image/jpeg;base64,${t.imageThumb}" onclick="openFullImg('${t.imageThumb}')" style="width:64px;height:64px;border-radius:10px;object-fit:cover;margin-bottom:10px;display:block;border:.5px solid var(--b2);cursor:pointer" title="Ver imagen">`:''}
    <div style="font-size:16px;font-weight:600;margin-bottom:4px">${t.emoji||'🫙'} ${t.description}</div>
    <div style="font-family:var(--font-title);font-size:22px;font-weight:800;color:var(--t1);margin-bottom:6px">${fmt(t.amount)}</div>
    <div style="font-size:12px;color:var(--t3)">${t.date}${tt?' · '+tt:''} · ${(allCats().find(c=>c.id===t.category)||CATS[14]).l}${t.isHormi?' · <span style="color:var(--red)">hormiga</span>':''}</div>`;
  // show/hide buttons
  const isDraft=!!t.isDraft;
  document.getElementById('m-tx-confirm-btn').style.display=isDraft?'':'none';
  document.getElementById('m-tx-close-btn').style.display=isDraft?'none':'';
  document.getElementById('m-tx-edit-btn').style.display=isDraft?'none':'';
  document.getElementById('m-tx-save-btn').style.display='none';
  document.getElementById('m-tx-cancel-edit-btn').style.display='none';
  document.getElementById('m-budget').classList.remove('open');
  document.getElementById('m-tx-detail').classList.add('open');
}
function confirmDraft(){
  if(!_detailTxId)return;
  const t=D.transactions.find(x=>x.id===_detailTxId);if(t)delete t.isDraft;
  save();closeOv('m-tx-detail');refreshCurrent();toast('Gasto confirmado ✓','ok');
}
function deleteTxModal(){
  if(!_detailTxId)return;
  D.transactions=D.transactions.filter(t=>t.id!==_detailTxId);
  save();closeOv('m-tx-detail');refreshCurrent();toast('Gasto eliminado','ok');
}

// ── EDIT TRANSACTION ──────────────────────────────────────────────────────────
function editTxModal(){
  if(!_detailTxId)return;
  const t=D.transactions.find(x=>x.id===_detailTxId);if(!t)return;
  _editHormi=t.isHormi;_editCat=t.category;
  const tt=t.hasTime&&t.ts?new Date(t.ts).toTimeString().slice(0,5):'';
  const cats=allCats();
  const _desc=t.description||'';
  const _partes=_desc.split(' en ');
  const _consumo=_partes[0]||'';
  const _lugar=_partes.slice(1).join(' en ')||t.alias||'';
  document.getElementById('m-tx-title').textContent='Editar gasto';
  document.getElementById('m-tx-body').innerHTML=`
    <div class="f-lbl" style="margin-top:4px">monto</div>
    <div class="amt-wr" style="margin-bottom:10px"><span class="amt-pr" style="font-size:16px">S/</span>
      <input type="number" inputmode="decimal" class="amt-in" id="edit-amt" value="${t.amount}" style="font-size:20px;padding:10px 10px 10px 36px"></div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <div style="flex:1.5"><div class="f-lbl">consumo</div>
        <input type="text" class="txt-in" id="edit-consumo" value="${_consumo.replace(/"/g,'&quot;')}" placeholder="café, taxi, snack..." style="margin-bottom:0"></div>
      <div style="flex:1"><div class="f-lbl">lugar (opcional)</div>
        <input type="text" class="txt-in" id="edit-lugar" value="${_lugar.replace(/"/g,'&quot;')}" placeholder="Starbucks..." style="margin-bottom:0"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div><div class="f-lbl">fecha</div><input type="date" class="txt-in" id="edit-date" value="${t.date}" style="color:var(--t1)"></div>
      <div><div class="f-lbl">hora</div><input type="time" class="txt-in" id="edit-time" value="${tt}" style="color:var(--t1)"></div>
    </div>
    <div class="f-lbl">categoría</div>
    <div class="eg" id="edit-eg" style="margin-bottom:10px">${cats.map(c=>`<button class="eb${c.id===t.category?' on':''}" onclick="selEditCat('${c.id}')"><div class="eb-e">${c.e}</div><div class="eb-nm">${c.l}</div></button>`).join('')}</div>
    <div class="tog-row" onclick="togEditHormi()" style="margin-bottom:0">
      <div class="tog-l"><div class="tog-lt">¿es hormiga?</div></div>
      <div class="pill${t.isHormi?' on':''}" id="edit-h-pill"><div class="knob"></div></div>
    </div>`;
  document.getElementById('m-tx-confirm-btn').style.display='none';
  document.getElementById('m-tx-close-btn').style.display='none';
  document.getElementById('m-tx-edit-btn').style.display='none';
  document.getElementById('m-tx-save-btn').style.display='';
  document.getElementById('m-tx-cancel-edit-btn').style.display='';
}
function selEditCat(id){
  _editCat=id;
  document.querySelectorAll('#edit-eg .eb').forEach(b=>{
    b.classList.toggle('on',b.querySelector('.eb-nm')?.textContent===(allCats().find(c=>c.id===id)||{}).l);
  });
}
function togEditHormi(){
  _editHormi=!_editHormi;
  document.getElementById('edit-h-pill')?.classList.toggle('on',_editHormi);
}
function saveTxEdit(){
  if(!_detailTxId)return;
  const t=D.transactions.find(x=>x.id===_detailTxId);if(!t)return;
  const amt=parseFloat(document.getElementById('edit-amt').value);
  if(!amt||amt<=0){toast('Ingresa un monto','warn');return;}
  const date=document.getElementById('edit-date').value||t.date;
  const timeVal=document.getElementById('edit-time').value;
  const editConsumo=document.getElementById('edit-consumo').value.trim();
  const editLugar=document.getElementById('edit-lugar').value.trim();
  t.amount=amt;
  t.description=editConsumo?(editLugar?`${editConsumo} en ${editLugar}`:editConsumo):t.description;
  t.alias=editLugar||null;
  t.date=date;t.category=_editCat;
  t.emoji=(allCats().find(c=>c.id===_editCat)||CATS[14]).e;
  t.isHormi=_editHormi;
  if(timeVal){t.ts=`${date}T${timeVal}:00`;t.hasTime=true;}
  else{t.ts=`${date}T12:00:00`;t.hasTime=false;}
  save();closeOv('m-tx-detail');refreshCurrent();toast('Gasto actualizado ✓','ok');
}
function cancelEdit(){if(_detailTxId)openTxDetail(_detailTxId);}

// ── SEMANA NAVEGABLE ──────────────────────────────────────────────────────────
function weekStart(off){
  const now=new Date();const day=now.getDay();
  const mon=new Date(now);mon.setDate(now.getDate()-(day===0?6:day-1)+off*7);mon.setHours(0,0,0,0);return mon;
}
function navWeek(dir){
  if(dir>0&&wkOffset>=0)return;
  wkOffset+=dir;renderWk();
}
function renderWk(){
  const bud=D.budget||30,today=td(),sel=_selDay||today;
  const start=weekStart(wkOffset);
  const end=new Date(start);end.setDate(start.getDate()+6);
  const sm=start.getMonth(),em=end.getMonth();
  const lbl=sm===em
    ?`${start.getDate()}–${end.getDate()} ${MO[sm].slice(0,3)}`
    :`${start.getDate()} ${MO[sm].slice(0,3)} – ${end.getDate()} ${MO[em].slice(0,3)}`;
  const lblEl=document.getElementById('wk-lbl');if(lblEl)lblEl.textContent=lbl;
  const nextEl=document.getElementById('wk-next');if(nextEl)nextEl.disabled=wkOffset>=0;
  const DN=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  let html='';
  for(let i=0;i<7;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);
    const ds=d.toISOString().slice(0,10);
    const isFut=ds>today,isT=ds===today,isSel=ds===sel;
    const amt=isFut?0:D.transactions.filter(t=>t.date===ds&&t.isHormi).reduce((s,t)=>s+t.amount,0);
    const dc=isSel?'transparent':amt===0?'transparent':amt>bud?'var(--red)':amt>bud*.75?'var(--amber)':'var(--lime)';
    const hasTx=!isFut&&D.transactions.some(t=>t.date===ds);
    html+=`<div class="dp${isT?' td':''}${isFut?' fut':''}${isSel?' sel':''}${hasTx?' has-tx':''}" ${isFut?'':'onclick="selectDay(\''+ds+'\')"'}>
      <div class="dp-n">${DN[i]}</div>
      <div class="dp-d2">${d.getDate()}</div>
      <div class="dp-a">${!isFut&&amt>0?'S/'+amt.toFixed(0):'—'}</div>
      <div class="dp-d" style="background:${dc}"></div>
    </div>`;
  }
  const row=document.getElementById('wk-row');if(row)row.innerHTML=html;
}

// ── DAY NAVIGATION (legacy stubs) ─────────────────────────────────────────────
function goDay(ds){selectDay(ds);}
function renderDayContent(){renderDayForHome(false);}
function renderDayWk(){renderWk();}

// legacy alias kept for calendar-month click
function openDaySheet(ds){goDay(ds);}
function openDayAddTx(ds){openAddSheet(ds);}

// ── CALENDARIO MES ────────────────────────────────────────────────────────────
function openCal(){
  const s=weekStart(wkOffset);calY=s.getFullYear();calM=s.getMonth();
  renderCal();openSheet('sh-cal');
}
function navCal(dir){
  calM+=dir;if(calM<0){calM=11;calY--;}if(calM>11){calM=0;calY++;}renderCal();
}
function renderCal(){
  const today=td(),ny=new Date().getFullYear(),nm=new Date().getMonth();
  const bud=D.budget||30;
  document.getElementById('cal-lbl').textContent=`${MO[calM]} ${calY}`;
  document.getElementById('cal-next').disabled=(calY>ny||(calY===ny&&calM>=nm));
  const first=new Date(calY,calM,1);
  const startOff=first.getDay()===0?6:first.getDay()-1;
  const dim=new Date(calY,calM+1,0).getDate();
  let html='';
  for(let i=0;i<startOff;i++)html+=`<div class="cal-d empty"></div>`;
  for(let d=1;d<=dim;d++){
    const ds=`${calY}-${String(calM+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isFut=ds>today,isT=ds===today;
    const amt=isFut?0:D.transactions.filter(t=>t.date===ds&&t.isHormi).reduce((s,t)=>s+t.amount,0);
    const dc=amt===0?'transparent':amt>bud?'var(--red)':amt>bud*.75?'var(--amber)':'var(--lime)';
    html+=`<div class="cal-d${isT?' today':''}${isFut?' future':''}" ${isFut?'':'onclick="closeOv(\'sh-cal\');openDaySheet(\''+ds+'\')"'}>
      <span>${d}</span><div class="cal-d-dot" style="background:${dc}"></div>
    </div>`;
  }
  document.getElementById('cal-grid').innerHTML=html;
}

// ── BUDGET ────────────────────────────────────────────────────────────────────
function saveBudget(){
  const b=parseFloat(document.getElementById('bud-in').value);
  const t=D.threshold;
  if(!isNaN(b)&&b>0)D.budget=b;
  // actualizar display en ajustes sin re-render completo
  const budRow=document.getElementById('disp-budget');
  if(budRow)budRow.textContent=`S/ ${D.budget} ›`;
  save();saveUserData();closeOv('m-budget');renderHome();toast('Límite actualizado ✓','ok');
}

// ── STATS ─────────────────────────────────────────────────────────────────────
function extractLugar(description){
  if(!description)return null;
  const idx=description.lastIndexOf(' en ');
  if(idx>=0){const l=description.slice(idx+4).trim();return l.length>1?l:null;}
  return null;
}
async function normalizarLugares(rawNames){
  const toNorm=rawNames.filter(n=>!_lugarCache[n]&&!_lugarCacheTried.has(n));
  if(!toNorm.length)return false;
  toNorm.forEach(n=>_lugarCacheTried.add(n));
  try{
    const prompt=`Normaliza estos nombres de establecimientos a su nombre comercial limpio (sin ciudad, sin número de tienda, solo la marca): ${JSON.stringify(toNorm)}. Responde SOLO JSON: {"nombre_original":"Nombre Normalizado",...}`;
    const{data:{session:_ss3}}=await _sb.auth.getSession();
    const resp=await fetch(SCAN_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${_ss3?.access_token||''}`},body:JSON.stringify({prompt})});
    if(!resp.ok)return false;
    const data=await resp.json();
    if(typeof data==='object'&&!data.error)Object.assign(_lugarCache,data);
    return true;
  }catch(e){return false;}
}
function calcHoraPico(txs){
  if(!txs.length)return null;
  const byH=Array(24).fill(0);
  txs.forEach(t=>{const h=t.ts?new Date(t.ts).getHours():-1;if(h>=0)byH[h]+=t.amount;});
  const max=Math.max(...byH);
  return max>0?byH.indexOf(max):null;
}
function calcDiaPico(txs){
  if(!txs.length)return null;
  const days=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const byD=Array(7).fill(0);
  txs.forEach(t=>{if(t.date){const d=new Date(t.date+'T12:00:00');byD[d.getDay()]+=t.amount;}});
  const max=Math.max(...byD);
  return max>0?days[byD.indexOf(max)]:null;
}
function buildHormiCategories(){
  const tm=_statsMonth;
  const hm=D.transactions.filter(t=>t.isHormi&&t.date&&t.date.startsWith(tm));
  const byCat={};
  hm.forEach(t=>{
    const ci=t.category||'other';
    if(!byCat[ci]){byCat[ci]={txs:[],total:0};}
    byCat[ci].txs.push(t);
    byCat[ci].total+=t.amount;
  });
  return byCat;
}
let _hcItemStore=[];
function renderHormiCategories(){
  const el=document.getElementById('hormi-cat-list');if(!el)return;
  _hcItemStore=[];
  const byCat=buildHormiCategories();
  const entries=Object.entries(byCat).sort((a,b)=>b[1].total-a[1].total);
  if(!entries.length){el.innerHTML='<div style="font-size:13px;color:var(--t3);padding:8px 0">Sin hormis este mes.</div>';return;}
  el.innerHTML=entries.map(([ci,{txs,total}])=>{
    const cm=allCats().find(c=>c.id===ci)||CATS[14];
    const avg=total/txs.length;
    const imp=total>100
      ?{l:'⚡ Alto',bg:'#FFEDED',c:'#CC0000'}
      :total>=50
      ?{l:'Medio',bg:'#FFF9E6',c:'#7A5800'}
      :{l:'Bajo',bg:'#F2F2F2',c:'#666'};
    const byDesc={};
    txs.forEach(t=>{
      const key=(t.description||'Sin descripción').trim();
      if(!byDesc[key]){byDesc[key]={txs:[],total:0};}
      byDesc[key].txs.push(t);
      byDesc[key].total+=t.amount;
    });
    const descEntries=Object.entries(byDesc).sort((a,b)=>b[1].total-a[1].total);
    const itemsHTML=descEntries.map(([desc,data])=>{
      const idx=_hcItemStore.push({desc,txs:data.txs,total:data.total,ci,catTotal:total,catCount:txs.length,cm})-1;
      const hp=calcHoraPico(data.txs);
      const avgD=data.total/data.txs.length;
      const horaSub=(hp!==null&&data.txs.length>=3)?` · Hora pico: ${String(hp).padStart(2,'0')}:00`:'';
      const vecesSub=`${data.txs.length} vez${data.txs.length!==1?'es':''} · ${fmt(avgD)} c/u${horaSub}`;
      return`<div class="hc-item" onclick="openHormiDetail(${idx})">
        <div style="font-size:20px;flex-shrink:0">${cm.e}</div>
        <div style="flex:1;min-width:0">
          <div class="hc-item-desc" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${desc}</div>
          <div style="font-size:11px;color:var(--t3);margin-top:2px">${vecesSub}</div>
        </div>
        <div style="color:var(--t3);font-size:20px;line-height:1;flex-shrink:0">›</div>
      </div>`;
    }).join('');
    return`<div class="hc-row" id="hcr-${ci}">
      <div class="hc-hdr" onclick="toggleHcCat('${ci}')">
        <div class="hc-em" style="font-size:24px">${cm.e}</div>
        <div class="hc-info">
          <div class="hc-nm">${capFirst(cm.l)}</div>
          <div class="hc-sub">${txs.length} gasto${txs.length!==1?'s':''} · promedio ${fmt(avg)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <span style="background:${imp.bg};color:${imp.c};font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;white-space:nowrap">${imp.l}</span>
          <div class="hc-chevron" id="hcc-${ci}">▾</div>
        </div>
      </div>
      <div class="hc-list" id="hcl-${ci}">${itemsHTML}</div>
    </div>`;
  }).join('');
}
function toggleHcCat(ci){
  const list=document.getElementById('hcl-'+ci);
  const chev=document.getElementById('hcc-'+ci);
  if(!list)return;
  const isOpen=list.classList.contains('open');
  document.querySelectorAll('.hc-list').forEach(l=>l.classList.remove('open'));
  document.querySelectorAll('.hc-chevron').forEach(c=>c.classList.remove('open'));
  if(!isOpen){list.classList.add('open');if(chev)chev.classList.add('open');}
}
function openHormiDetail(idx){
  const item=_hcItemStore[idx];if(!item)return;
  const {desc,txs,total,ci,cm}=item;
  const veces=txs.length;
  const avgD=total/veces;
  const hp=calcHoraPico(txs);
  const dp=calcDiaPico(txs);
  const insight=veces>=5
    ?`Aparece <strong>${veces} veces</strong> este mes, sumando <strong>${fmt(total)}</strong>. Reducir a la mitad liberaría <strong>${fmt(total/2)}</strong> al mes. Al ritmo actual, esto es <strong>${fmt(total*12)}</strong> al año.`
    :veces>=2
    ?`Con ${veces} apariciones a <strong>${fmt(avgD)}</strong> cada una, ya acumulaste <strong>${fmt(total)}</strong> en esto este mes. Al ritmo actual, esto es <strong>${fmt(total*12)}</strong> al año.`
    :`Un solo gasto de <strong>${fmt(total)}</strong>. Si lo repites 2 veces al mes, son <strong>${fmt(total*24)}</strong> al año.`;
  document.getElementById('hc-panel-body').innerHTML=`
    <div style="background:#1a2e2a;border-radius:20px 20px 0 0;padding:28px 20px 24px;text-align:center">
      <div style="font-size:44px;margin-bottom:10px">${cm.e}</div>
      <div style="display:inline-block;background:rgba(255,255,255,.18);color:rgba(255,255,255,.85);font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 10px;border-radius:20px;margin-bottom:12px">${capFirst(cm.l)}</div>
      <div style="font-family:var(--font-title);font-size:20px;font-weight:800;color:#fff;line-height:1.25;margin-bottom:4px">${desc}</div>
      <div style="font-size:12px;color:rgba(255,255,255,.55)">${veces} vez${veces!==1?'es':''} este mes</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:16px 16px 0">
      <div class="hc-stat-box"><label>Total gastado</label><strong>${fmt(total)}</strong><span>este mes</span></div>
      <div class="hc-stat-box"><label>Veces</label><strong>${veces}</strong><span>aparición${veces!==1?'es':''}</span></div>
      ${veces>=3?`<div class="hc-stat-box"><label>Hora pico</label><strong>${hp!==null?String(hp).padStart(2,'0')+':00':'—'}</strong><span>más frecuente</span></div>
      <div class="hc-stat-box"><label>Día pico</label><strong>${dp||'—'}</strong><span>más frecuente</span></div>`:''}
    </div>
    <div style="padding:12px 16px 0"><div class="hc-insight">${insight}</div></div>`;
  document.getElementById('hc-detail-panel').classList.add('open');
  document.getElementById('hc-panel-bg').classList.add('open');
}
function closeHormiDetail(){
  document.getElementById('hc-detail-panel').classList.remove('open');
  document.getElementById('hc-panel-bg').classList.remove('open');
}
function renderTipCards(tips){
  if(!Array.isArray(tips)||!tips.length){
    return `<div class="hc-alt-card"><span>🔍</span><p>No encontramos una opción más barata verificable para este gasto.</p></div>`;
  }
  return tips.map(t=>{
    if(typeof t==='string')return `<div class="hc-alt-card"><span>💡</span><p>${t}</p></div>`;
    const ahorro=t.ahorro?`<div style="font-size:12px;font-weight:700;color:#407178;margin-top:4px">Ahorras ${t.ahorro}</div>`:'';
    let links='';
    if(Array.isArray(t.fuentes)&&t.fuentes.length){
      links=`<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px">${t.fuentes.map(f=>`<a href="${f.url}" target="_blank" rel="noopener" style="font-size:12px;color:#407178;text-decoration:underline;display:inline-block">${f.label||(f.tipo==='social'?'Ver video ↗':'Ver tienda ↗')}</a>`).join('')}</div>`;
    }else if(t.url){
      links=`<a href="${t.url}" target="_blank" rel="noopener" style="font-size:12px;color:#407178;text-decoration:underline;margin-top:4px;display:inline-block">Ver fuente ↗</a>`;
    }
    const tipoIcon=t.tipo==='sustitucion'?'🔁':t.tipo==='optimizacion'?'💳':'💡';
    const tipoLabel=t.tipo==='sustitucion'?'<div style="font-size:10px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:#2d5158;margin-bottom:3px">🔁 Alternativa</div>'
      :t.tipo==='optimizacion'?'<div style="font-size:10px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:#8a6d00;margin-bottom:3px">💳 Ahorra aquí mismo</div>'
      :'';
    return `<div class="hc-alt-card"><span>${tipoIcon}</span><div style="flex:1">${tipoLabel}<p style="margin:0">${t.texto||''}</p>${ahorro}${links}</div></div>`;
  }).join('');
}
function normalizeMerchant(desc){
  return desc.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
async function loadPersonalizedTips_DEPRECATED(desc,ci,total,veces,avgD){
  if(!isPro()){
    const el=document.getElementById('hc-alt-content');
    if(el)el.innerHTML=`<div class="hc-alt-card" style="cursor:pointer;border:1.5px dashed var(--accent)" onclick="requirePro('sugerencias',null)">
      <span>🔒</span><p><strong>Sugerencias personalizadas con IA</strong> — disponible en HORMI Pro. Toca para activar tu prueba gratis.</p>
    </div>`;
    return;
  }
  // Cache por descripción — no vuelve a gastar tokens si ya se generaron
  const cacheKey='hormi_tips_v2_'+normalizeMerchant(desc).slice(0,60);
  try{
    const cached=localStorage.getItem(cacheKey);
    if(cached){
      const tips=JSON.parse(cached);
      const el=document.getElementById('hc-alt-content');
      if(el&&Array.isArray(tips)&&tips.length){
        el.innerHTML=renderTipCards(tips);
        return;
      }
    }
  }catch(e){}
  try{
    const {data:{session}}=await _sb.auth.getSession();
    const token=session?.access_token;if(!token)return;
    const prompt=`Usuario en Lima, Perú. Gasto: "${desc}" (categoría: ${ci}). Registrado ${veces} vez(es) este mes, total ${fmt(total)}, promedio ${fmt(avgD)} por vez.

Tu única misión: encontrar 2 formas concretas de que este usuario GASTE MENOS en esto. No des alternativas laterales ni observaciones sobre el precio: cada sugerencia debe representar un ahorro real frente a los ${fmt(avgD)} que paga hoy.

Busca en internet precios reales y actuales en Lima para lograrlo.

REGLAS OBLIGATORIAS para cada sugerencia:
1. Debe implicar pagar menos de ${fmt(avgD)}. Si algo cuesta igual o más, NO lo incluyas.
2. Debe incluir el ahorro estimado por vez, calculado sobre ${fmt(avgD)}.
3. Debe incluir entre 1 y 2 fuentes verificables (ver reglas de fuentes abajo). Solo URLs reales de tu búsqueda — nunca inventadas.
4. Prohibido: consejos genéricos ("cocina en casa", "compra marca propia"), comparaciones de precio sin ahorro, o sugerir que revise descuentos.
5. Si tras buscar no encuentras ninguna opción más barata verificable, devuelve un array vacío [].
6. Prioriza como primera fuente contenido social peruano reciente (TikTok, Reels, IG) de los últimos 12 meses si existe uno relevante con comentarios útiles (tipo:'social'). Si encuentras también una tienda online donde se pueda verificar el precio, agrégala como segunda fuente (tipo:'tienda'). Mínimo 1 fuente, máximo 2. Las URLs deben venir de resultados reales de web_search, nunca inventadas.

Responde SOLO este JSON, sin markdown:
[{"texto":"acción concreta en máx 18 palabras","ahorro":"S/X por vez","fuentes":[{"tipo":"social","url":"https://...","label":"..."}]},{"texto":"...","ahorro":"S/X por vez","fuentes":[{"tipo":"tienda","url":"https://...","label":"..."}]}]`;
    const ac=new AbortController();
    const tipsTimeout=setTimeout(()=>ac.abort(),45000);
    const res=await fetch(SCAN_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body:JSON.stringify({prompt,mode:'tips'}),
      signal:ac.signal
    });
    clearTimeout(tipsTimeout);
    const text=await res.text();
    const match=text.match(/\[[\s\S]*\]/);
    if(!match)throw new Error('no json');
    const tips=JSON.parse(match[0]);
    const el=document.getElementById('hc-alt-content');
    if(el&&Array.isArray(tips)){
      el.innerHTML=renderTipCards(tips);
      try{localStorage.setItem(cacheKey,JSON.stringify(tips));}catch(e){}
    }
  }catch(e){
    const el=document.getElementById('hc-alt-content');
    const msg=e.name==='AbortError'?'Se está demorando más de lo normal. Intenta de nuevo.':'No pudimos generar sugerencias ahora. Intenta de nuevo más tarde.';
    if(el)el.innerHTML=`<div class="hc-alt-card"><span>💡</span><p>${msg}</p></div>`;
  }
}

async function renderLugarChart(){
  const el=document.getElementById('lugar-chart');if(!el)return;
  const byLugar={};
  D.transactions.filter(t=>t.isHormi).forEach(t=>{
    const raw=extractLugar(t.description);if(!raw)return;
    const norm=_lugarCache[raw]||raw;
    byLugar[norm]=(byLugar[norm]||0)+t.amount;
  });
  const sorted=Object.entries(byLugar).sort((a,b)=>b[1]-a[1]).slice(0,5);
  if(!sorted.length){el.innerHTML='<div style="font-size:12px;color:var(--t3)">Aún no hay datos de lugares</div>';return;}
  const max=sorted[0][1];
  el.innerHTML=sorted.map(([name,amt])=>`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
      <div style="width:72px;font-size:12px;color:var(--t2);text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</div>
      <div style="flex:1;height:9px;background:var(--s);border-radius:5px;overflow:hidden"><div style="height:100%;width:${Math.round(amt/max*100)}%;background:var(--lime);border-radius:5px"></div></div>
      <div style="font-size:12px;color:var(--t2);min-width:48px;text-align:right">${fmt(amt)}</div>
    </div>`).join('');
  const rawNames=[...new Set(D.transactions.filter(t=>t.isHormi).map(t=>extractLugar(t.description)).filter(Boolean))];
  if(rawNames.length){normalizarLugares(rawNames).then(changed=>{if(changed)renderLugarChart();});}
}

let _saveCardAvg=0;
function pctToColor(pct){
  // Degradado de #a6b1e7 (lila suave, 10%) a #2d3a8c (azul oscuro intenso, 90%)
  const p=(parseInt(pct)-10)/80; // normaliza 10-90 a 0-1
  const c1={r:166,g:177,b:231}; // a6b1e7
  const c2={r:45,g:58,b:140};   // 2d3a8c
  const r=Math.round(c1.r+(c2.r-c1.r)*p);
  const g=Math.round(c1.g+(c2.g-c1.g)*p);
  const b=Math.round(c1.b+(c2.b-c1.b)*p);
  return `rgb(${r},${g},${b})`;
}
function updateSavePct(pct){
  const p=parseInt(pct)/100;
  const color=pctToColor(pct);
  document.getElementById('save-pct-lbl').textContent=`si reduces ${pct}% tus hormigas`;
  document.getElementById('save-mes-val').textContent=`+${fmt(_saveCardAvg*30*p)}`;
  document.getElementById('save-ano-val').textContent=`+${fmt(_saveCardAvg*365*p)}`;
  const slider=document.getElementById('save-pct-slider');
  if(slider){
    slider.style.accentColor=color;
    const pctPos=(pct-slider.min)/(slider.max-slider.min)*100;
    slider.style.background=`linear-gradient(to right, ${color} ${pctPos}%, #d1d5db ${pctPos}%)`;
  }
}

function statsChangeMonth(dir){
  const [y,m]=_statsMonth.split('-').map(Number);
  const d=new Date(y,m-1+dir,1);
  const newTm=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const today=new Date().toISOString().slice(0,7);
  if(newTm>today)return; // no permitir meses futuros
  _statsMonth=newTm;
  renderStats();
}
function renderStats(){
  const all=D.transactions,hm=all.filter(t=>t.isHormi);
  const tm=_statsMonth;
  const mhm=all.filter(t=>t.date&&t.date.startsWith(tm)&&t.isHormi);
  const txsMes=all.filter(t=>t.date&&t.date.startsWith(tm));
  const tH=hm.reduce((s,t)=>s+t.amount,0);
  const mHA=mhm.reduce((s,t)=>s+t.amount,0);
  const totalMes=txsMes.reduce((s,t)=>s+t.amount,0);
  // días transcurridos del mes seleccionado (mes completo si es pasado,
  // día actual si es el mes en curso)
  const [yTm,mTm]=tm.split('-').map(Number);
  const nowD=new Date();
  const esMesActual = tm === new Date().toISOString().slice(0,7);
  const diasDelMes = new Date(yTm,mTm,0).getDate();
  const diasTranscurridos = esMesActual ? nowD.getDate() : diasDelMes;
  const avgMes = mHA / diasTranscurridos;
  const byCat={};txsMes.forEach(t=>{byCat[t.category]=(byCat[t.category]||0)+t.amount;});
  const sc=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const mc=sc[0]?.[1]||1;
  const byH=Array(24).fill(0);all.forEach(t=>{byH[new Date(t.ts).getHours()]+=t.amount;});
  const mxH=Math.max(...byH)||1;const pkH=byH.indexOf(Math.max(...byH));
  const days=[...new Set(hm.map(t=>t.date))].length||1;const avg=tH/days;
  // proyección al cierre del mes seleccionado
  const proj = esMesActual && diasTranscurridos>0
    ? mHA + (avgMes * (diasDelMes - diasTranscurridos))
    : 0;
  _saveCardAvg=avgMes;
  const monthLabel=(()=>{
    const [y,m]=tm.split('-');
    const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${meses[parseInt(m)-1]} ${y}`;
  })();
  const isCurrentMonth = tm === new Date().toISOString().slice(0,7);
  document.getElementById('stats-c').innerHTML=`
    <div style="font-family:var(--font-title);font-size:25px;font-weight:800;margin-bottom:16px">Análisis</div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 18px 12px">
      <button onclick="statsChangeMonth(-1)" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--b2);background:var(--s2);display:flex;align-items:center;justify-content:center;cursor:pointer">‹</button>
      <span style="font-size:13px;font-weight:700;color:var(--t1);text-transform:capitalize">${monthLabel}</span>
      <button onclick="statsChangeMonth(1)" ${isCurrentMonth?'disabled style="opacity:.3"':''} style="width:32px;height:32px;border-radius:50%;border:1px solid var(--b2);background:var(--s2);display:flex;align-items:center;justify-content:center;cursor:pointer">›</button>
    </div>
    <button class="share-btn" onclick="shareProgress()">
      <i data-lucide="share-2" style="width:16px;height:16px"></i>
      Compartir progreso
    </button>
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-family:var(--font-title);font-size:40px;font-weight:800;letter-spacing:-0.04em;color:#1a2e2a" id="analisis-total-big">${fmt(mHA)}</div>
      <div style="font-size:13px;color:var(--text-soft)">total hormis este mes</div>
    </div>
    ${proj>0?`<div class="hrc" style="margin-bottom:10px;display:flex;align-items:center;gap:10px;padding:13px 15px">
      <i data-lucide="target" style="width:18px;height:18px;color:#407178;flex-shrink:0"></i>
      <div><div class="sec" style="margin:0 0 2px">Proyección al cierre</div><div style="font-size:13px;color:var(--t2)">Con tu ritmo actual: <strong>${fmt(proj)}</strong> hormis al cierre del mes</div></div>
    </div>`:''}
    ${esMesActual?(()=>{
  const nowW=Date.now();
  const weeklyHmW=mhm.filter(t=>new Date(t.date+'T12:00:00')>=new Date(nowW-7*86400000)).reduce((s,t)=>s+t.amount,0);
  const prevWeekHmW=mhm.filter(t=>new Date(t.date+'T12:00:00')>=new Date(nowW-14*86400000)&&new Date(t.date+'T12:00:00')<new Date(nowW-7*86400000)).reduce((s,t)=>s+t.amount,0);
  if(prevWeekHmW<=0)return'';
  const weekDiffW=weeklyHmW-prevWeekHmW;
  const icon=weekDiffW<0?'trending-down':weekDiffW>0?'trending-up':'minus';
  const color=weekDiffW<0?'#407178':weekDiffW>0?'#E63946':'#8aada8';
  const msg=weekDiffW<0?`${fmt(Math.abs(weekDiffW))} menos esta semana`:weekDiffW>0?`${fmt(weekDiffW)} más esta semana`:'Mismo gasto que la semana pasada';
  const sub=weekDiffW<0?'Vas mejorando respecto a la semana anterior 🎉':weekDiffW>0?'Tus hormigas subieron — revisa qué cambió':'Sin cambios respecto a la semana anterior';
  return`<div class="hrc" style="margin-bottom:10px;display:flex;align-items:center;gap:10px;padding:13px 15px;border-left:3px solid ${color}">
    <i data-lucide="${icon}" style="width:18px;height:18px;color:${color};flex-shrink:0"></i>
    <div><div class="sec" style="margin:0 0 2px">${msg}</div><div style="font-size:13px;color:var(--t2)">${sub}</div></div>
  </div>`;
})():''}
    <div class="save-c">
      <div class="save-t" id="save-pct-lbl">si reduces 50% tus hormigas</div>
      <input type="range" id="save-pct-slider" min="10" max="90" step="10" value="50" style="width:100%;margin-bottom:12px;accent-color:rgb(166,177,231);-webkit-appearance:none;height:6px;border-radius:3px;background:linear-gradient(to right, rgb(166,177,231) 50%, #d1d5db 50%)" oninput="updateSavePct(this.value)">
      <div class="save-g">
        <div class="save-i"><div class="save-il">al mes</div><div class="save-iv" id="save-mes-val">+${fmt(avgMes*30*0.5)}</div></div>
        <div class="save-i"><div class="save-il">al año</div><div class="save-iv" id="save-ano-val">+${fmt(avgMes*365*0.5)}</div></div>
      </div>
    </div>
    ${buildPieChart(sc,mc)}
    ${sc.length?`<div class="catlist"><div class="sec" style="margin-bottom:4px">general por categoría · ${fmt(totalMes)}</div><div style="font-size:11px;color:var(--t3);margin-bottom:10px;line-height:1.4">Incluye todos tus gastos del mes, no solo hormigas — por eso el total es mayor</div>${sc.map(([ci,a])=>{const cm=allCats().find(c=>c.id===ci)||CATS[14];return`<div class="ctr"><div class="ctr-ic">${cm.e}</div><div class="ctr-nm">${capFirst(cm.l)}</div><div class="ctr-bar"><div class="ctr-fill" style="width:${Math.round(a/mc*100)}%"></div></div><div class="ctr-amt">${fmt(a)}</div></div>`;}).join('')}</div>`:''}
    <div style="background:var(--s1);border-radius:14px;border:0.5px solid var(--border);padding:20px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:12px">HORMIS QUE MÁS APARECEN</div>
      <div id="hormi-cat-list"></div>
      ${hm.length>0?`<p style="font-size:11px;color:var(--t3);margin-top:10px">Toca una categoría para ver el detalle →</p>`:''}
    </div>
    <div class="hrc" style="margin-bottom:16px">
      <div class="sec" style="margin-bottom:8px;display:flex;align-items:center;gap:5px">Dónde gastas más — Hormis <i data-lucide="map-pin" style="width:13px;height:13px"></i></div>
      <div id="lugar-chart"><div style="font-size:12px;color:var(--t3)">Cargando...</div></div>
    </div>
    <div class="hrc">
      <div class="sec">¿A qué hora gastas más?</div>
      ${pkH>0?`<div style="font-size:12px;color:var(--t3);margin-bottom:2px">pico a las ${pkH}:00</div>`:''}
      <div class="hr-bars">${byH.map((v,h)=>`<div class="hbc"><div class="hb${v>0?' a':''}${v===Math.max(...byH)&&v>0?' pk':''}" style="height:${Math.max(v/mxH*50,v>0?3:2)}px"></div>${h%6===0?`<div class="hb-l">${h}h</div>`:'<div class="hb-l" style="opacity:0">·</div>'}</div>`).join('')}</div>
    </div>`;
  renderLugarChart();
  renderHormiCategories();
  if(window.lucide)lucide.createIcons();
}
const PIE_COLORS=['#407178','#d3e458','#a6b1e7','#E63946','#5A9430','#8aada8','#1a2e2a','#F59E0B','#2d5158','#c0d1c7','#92400E','#dde1f5','#b8cc38','#2d3a8c'];
function buildPieChart(sc,total){
  if(!sc.length||total<=0)return'';
  const tm=_statsMonth;
  const mSc=[];
  const byCatM={};
  D.transactions.filter(t=>t.date.startsWith(tm)&&t.isHormi).forEach(t=>{byCatM[t.category]=(byCatM[t.category]||0)+t.amount;});
  const mScEntries=Object.entries(byCatM).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const mTotal=mScEntries.reduce((s,[,v])=>s+v,0);
  if(!mScEntries.length||mTotal<=0)return'';
  const cx=80,cy=80,r=70;
  let angle=-Math.PI/2;
  let paths='';
  let gradDefs='';
  mScEntries.forEach(([ci,amt],i)=>{
    const gapDeg=mScEntries.length>1?0.025:0;
    const slice=(amt/mTotal*2*Math.PI)-gapDeg;
    const x1=cx+r*Math.cos(angle),y1=cy+r*Math.sin(angle);
    angle+=slice;
    const x2=cx+r*Math.cos(angle),y2=cy+r*Math.sin(angle);
    angle+=gapDeg;
    const large=slice>Math.PI?1:0;
    const color=PIE_COLORS[i%PIE_COLORS.length];
    const gradId=`pieGrad${i}`;
    const cm=allCats().find(c=>c.id===ci)||CATS[14];
    gradDefs+=`<radialGradient id="${gradId}" cx="35%" cy="30%" r="75%"><stop offset="0%" stop-color="${color}" stop-opacity="1"/><stop offset="100%" stop-color="${color}" stop-opacity=".75"/></radialGradient>`;
    paths+=`<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="url(#${gradId})" style="cursor:pointer;filter:drop-shadow(0 3px 5px rgba(0,0,0,.18))" onclick="showPieDetail('${ci}','${cm.l}','${fmt(amt).replace(/'/g,'')}')" />`;
  });
  const legend=mScEntries.map(([ci,amt],i)=>{const cm=allCats().find(c=>c.id===ci)||CATS[14];return`<div class="pie-leg-it" onclick="showPieDetail('${ci}','${capFirst(cm.l)}','${fmt(amt).replace(/'/g,'')}')"><div class="pie-leg-dot" style="background:${PIE_COLORS[i%PIE_COLORS.length]}"></div><div class="pie-leg-nm">${cm.e} ${capFirst(cm.l)}</div><div class="pie-leg-amt">${fmt(amt)}</div></div>`;}).join('');
  const onlyOneCat=mScEntries.length===1;
  return`<div class="pie-wrap">
    <div class="sec" style="margin-bottom:10px">distribución este mes — hormis</div>
    <svg class="pie-svg" width="160" height="160" viewBox="0 0 160 160"><defs>${gradDefs}</defs>${paths}<circle cx="${cx}" cy="${cy}" r="36" fill="#fff" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,.08))"/><text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="${fmt(mTotal).length>9?'12':'14'}" font-weight="800" fill="#1a2e2a" font-family="Lexend, sans-serif">${fmt(mTotal)}</text></svg>
    <div class="pie-legend">${legend}</div>
    ${onlyOneCat?`<div style="display:flex;align-items:center;gap:8px;background:var(--amber-bg);border:1px solid rgba(245,158,11,.25);border-radius:10px;padding:10px 12px;margin-top:10px;font-size:12px;color:var(--amber-t)">
      <i data-lucide="alert-circle" style="width:15px;height:15px;flex-shrink:0"></i>
      <span>Todos tus gastos están en "${capFirst(allCats().find(c=>c.id===mScEntries[0][0])?.l||'otros')}". Categorizar mejor te ayuda a ver patrones más claros.</span>
    </div>`:''}
    <div class="pie-detail" id="pie-detail"></div>
  </div>`;
}
function showPieDetail(ci,nm,amtStr){
  const el=document.getElementById('pie-detail');if(!el)return;
  const tm=_statsMonth;
  const txs=D.transactions.filter(t=>t.date.startsWith(tm)&&t.category===ci);
  el.style.display='block';
  el.innerHTML=`<strong>${nm}</strong> · ${amtStr}<br><span style="color:var(--t3)">${txs.length} transacciones este mes</span>`;
}

function buildQuinCards(hm,avg){
  const now=new Date();const day=now.getDate();
  const firstHalf=day<=15;
  const q1start=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);
  const q1end=new Date(now.getFullYear(),now.getMonth(),15).toISOString().slice(0,10);
  const q2start=new Date(now.getFullYear(),now.getMonth(),16).toISOString().slice(0,10);
  const q2end=new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().slice(0,10);
  const thisQ=hm.filter(t=>t.date>=(firstHalf?q1start:q2start)&&t.date<=(firstHalf?q1end:q2end));
  const prevQ=hm.filter(t=>t.date>=(firstHalf?new Date(now.getFullYear(),now.getMonth()-1,16).toISOString().slice(0,10):q1start)&&t.date<=(firstHalf?new Date(now.getFullYear(),now.getMonth()-1,new Date(now.getFullYear(),now.getMonth(),0).getDate()).toISOString().slice(0,10):q1end));
  const thisTotal=thisQ.reduce((s,t)=>s+t.amount,0);
  const prevTotal=prevQ.reduce((s,t)=>s+t.amount,0);
  const diff=thisTotal-prevTotal;
  const descMap={};hm.forEach(t=>{const k=t.description.slice(0,20);descMap[k]=(descMap[k]||0)+t.amount;});
  const topPattern=Object.entries(descMap).sort((a,b)=>b[1]-a[1])[0];
  const daysLeft=firstHalf?(15-day):(new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-day);
  const proj=avg>0?thisTotal+(avg*daysLeft):0;
  const cards=[];
  if(topPattern)cards.push({ic:'🔁',t:`Tu patrón más frecuente`,s:`${topPattern[0].slice(0,22)}... · ${fmt(topPattern[1])} total`});
  if(prevTotal>0)cards.push({ic:diff<0?'📉':'📈',t:diff<0?`${fmt(Math.abs(diff))} menos que la quincena anterior`:`${fmt(diff)} más que la quincena anterior`,s:diff<0?'¡Vas mejorando! Sigue así.':'Revisa qué categoría subió.'});
  else cards.push({ic:'📊',t:`Esta quincena: ${fmt(thisTotal)}`,s:`${thisQ.length} gastos hormiga hasta ahora`});
  if(proj>0)cards.push({ic:'🎯',t:`Proyección al cierre`,s:`Con tu ritmo actual: ${fmt(proj)} hormigas este mes`});
  if(!cards.length)return'';
  return`<div class="sec" style="margin-bottom:9px">quincena</div><div class="quin-cards">${cards.map(c=>`<div class="quin-card"><div class="quin-ic">${c.ic}</div><div class="quin-body"><div class="quin-t">${c.t}</div><div class="quin-s">${c.s}</div></div></div>`).join('')}</div>`;
}

async function shareProgress(){
  const now=Date.now();
  const weeklyHm=D.transactions.filter(t=>t.isHormi&&new Date(t.date+'T12:00:00')>=new Date(now-7*86400000)).reduce((s,t)=>s+t.amount,0);
  const prevWeekHm=D.transactions.filter(t=>t.isHormi&&new Date(t.date+'T12:00:00')>=new Date(now-14*86400000)&&new Date(t.date+'T12:00:00')<new Date(now-7*86400000)).reduce((s,t)=>s+t.amount,0);
  const diff=weeklyHm-prevWeekHm;
  const bud=D.budget||30;
  // streak: consecutive days at or under budget
  let streak=0;
  for(let i=0;i<30;i++){
    const d=new Date(now-i*86400000).toISOString().slice(0,10);
    const da=D.transactions.filter(t=>t.date===d&&t.isHormi).reduce((s,t)=>s+t.amount,0);
    if(da>0&&da<=bud)streak++;
    else if(i>0)break;
  }
  // top category this week
  const byCat={};D.transactions.filter(t=>t.isHormi&&new Date(t.date+'T12:00:00')>=new Date(now-7*86400000)).forEach(t=>{byCat[t.category]=(byCat[t.category]||0)+t.amount;});
  const topCatEntry=Object.entries(byCat).sort((a,b)=>b[1]-a[1])[0];
  const topCatObj=topCatEntry?(allCats().find(c=>c.id===topCatEntry[0])||CATS[14]):null;
  const daysUnder=[...new Set(D.transactions.filter(t=>t.isHormi&&new Date(t.date+'T12:00:00')>=new Date(now-7*86400000)).map(t=>t.date))].filter(d=>D.transactions.filter(t=>t.date===d&&t.isHormi).reduce((s,t)=>s+t.amount,0)<=bud).length;
  try{
    const W=400,H=600,scale=3;
    const cv=document.createElement('canvas');cv.width=W*scale;cv.height=H*scale;
    const ctx=cv.getContext('2d');
    ctx.scale(scale,scale);
    // Load isotipo
    const logo = new Image();
    await new Promise(res => {
      fetch('/logo-white.svg')
        .then(r=>r.blob())
        .then(b=>{
          const url=URL.createObjectURL(b);
          logo.onload=()=>{URL.revokeObjectURL(url);res();};
          logo.onerror=res;
          logo.src=url;
        })
        .catch(res);
    });
    // Gradient background
    const grad=ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#d3e458');grad.addColorStop(0.5,'#5A9430');grad.addColorStop(1,'#080808');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    // Isotipo + wordmark
    const lh=200,lw=logo.naturalWidth&&logo.naturalHeight?Math.round(logo.naturalWidth/logo.naturalHeight*lh):200;
    const logoX=Math.round((W-lw)/2);
    if(logo.complete&&logo.naturalHeight)ctx.drawImage(logo,logoX,20,lw,lh);
    ctx.fillStyle='rgba(255,255,255,0.80)';ctx.font='400 13px Lexend, sans-serif';ctx.textAlign='center';
    ctx.fillText('menos hormis, más money',W/2,lh+36);
    ctx.textAlign='left';
    // Divider
    ctx.fillStyle='rgba(8,8,8,0.15)';ctx.fillRect(28,94,344,1);
    // Main amount
    ctx.fillStyle='#fff';ctx.font='800 56px Lexend,sans-serif';
    ctx.fillText('S/ '+weeklyHm.toFixed(2),28,185);
    ctx.fillStyle='rgba(255,255,255,0.75)';ctx.font='500 15px Lexend,sans-serif';
    ctx.fillText('en hormigas esta semana',28,212);
    // vs last week
    const diffTxt=diff<0?`↓ S/ ${Math.abs(diff).toFixed(0)} menos que la semana pasada`:`↑ S/ ${Math.abs(diff).toFixed(0)} más que la semana pasada`;
    ctx.fillStyle=diff<0?'rgba(200,246,90,0.9)':'rgba(255,255,255,0.5)';
    ctx.font='600 13px Lexend,sans-serif';ctx.fillText(diffTxt,28,240);
    // Streak badge
    if(streak>=3){
      ctx.fillStyle='rgba(0,0,0,0.25)';
      const bw=150,bx=28,by=258,bh=36;
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(bx,by,bw,bh,10);ctx.fill();}
      else ctx.fillRect(bx,by,bw,bh);
      ctx.fillStyle='#fff';ctx.font='700 13px Lexend,sans-serif';
      ctx.fillText(`🔥 ${streak} días de racha`,bx+12,by+23);
    }
    // 3 stats row
    const statsY=streak>=3?322:280;
    const stats=[
      {val:`S/${weeklyHm.toFixed(0)}`,lbl:'hormigas'},
      {val:`${daysUnder}/7`,lbl:'días ok'},
      {val:topCatObj?topCatObj.e:'—',lbl:topCatObj?'categoría top':''}
    ];
    stats.forEach((s,i)=>{
      const bx=28+i*118,by2=statsY,bw2=108,bh2=68;
      ctx.fillStyle='rgba(0,0,0,0.2)';
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(bx,by2,bw2,bh2,12);ctx.fill();}
      else ctx.fillRect(bx,by2,bw2,bh2);
      ctx.fillStyle='#fff';ctx.font='800 20px Lexend,sans-serif';ctx.fillText(s.val,bx+10,by2+36);
      ctx.fillStyle='rgba(255,255,255,0.6)';ctx.font='400 11px Lexend,sans-serif';ctx.fillText(s.lbl,bx+10,by2+55);
    });
    // Show preview modal (no footer URL)
    const dataUrl=cv.toDataURL('image/png');
    const prevImg=document.getElementById('share-preview-img');
    const prevDU=document.getElementById('share-preview-dataurl');
    if(prevImg)prevImg.src=dataUrl;
    if(prevDU)prevDU.value=dataUrl;
    document.getElementById('share-preview-ov')?.classList.add('on');
  }catch(e){if(e.name!=='AbortError')toast('No se pudo generar imagen','err');console.error(e);}
}
async function doShareProgress(){
  const dataUrl=document.getElementById('share-preview-dataurl')?.value;
  if(!dataUrl)return;
  document.getElementById('share-preview-ov')?.classList.remove('on');
  try{
    const res=await fetch(dataUrl);const blob=await res.blob();
    if(navigator.share&&navigator.canShare({files:[new File([blob],'hormi.png',{type:'image/png'})]})){
      await navigator.share({title:'Mi progreso en HORMI 🐜',text:'Esta semana en HORMI 🐜',files:[new File([blob],'hormi.png',{type:'image/png'})]});
    }else{const a=document.createElement('a');a.href=dataUrl;a.download='hormi_progreso.png';a.click();toast('Imagen descargada ✓','ok');}
  }catch(e){if(e.name!=='AbortError')toast('Error al compartir','err');}
}

function buildIns(hm,mhm,pkH,sc,avg){
  const ins=[];
  if(avg>0)ins.push(`Si reduces tus hormigas a la mitad, ahorras <strong>S/ ${(avg*30*0.5).toFixed(0)} cada 15 días</strong>. En un año: <strong>S/ ${(avg*365*0.5).toFixed(0)}</strong>.`);
  if(sc.length){const t=CATS.find(c=>c.id===sc[0][0])||CATS[14];ins.push(`Tu categoría más cara es <strong>${t.e} ${t.l}</strong> con ${fmt(sc[0][1])}. ¿Vale lo que gastas?`);}
  if(pkH>=11&&pkH<=14)ins.push(`Gastas más a las <strong>${pkH}:00 (almuerzo)</strong>. Llevar comida 3 días/semana puede hacer diferencia real.`);
  else if(pkH>=18&&pkH<=22)ins.push(`Tu hora pico es las <strong>${pkH}:00</strong>. El cansancio del día activa el gasto impulsivo.`);
  if(D.hormis.length>0)ins.push(`Identificaste <strong>${D.hormis.length} hormiga${D.hormis.length!==1?'s':''}</strong>: ${D.hormis.slice(0,3).join(', ')}${D.hormis.length>3?'...':''}. Cada semana sin ellas es un ahorro real.`);
  if(!ins.length)ins.push('Registra más gastos para ver patrones. <strong>La visibilidad es el primer paso.</strong>');
  return ins.map(i=>`<div class="ins">${i}</div>`).join('');
}

// ── GOALS ─────────────────────────────────────────────────────────────────────
function calcGoalSpent(g){
  const m=g.month||new Date().toISOString().slice(0,7);
  if(g.hormi){
    const kw=g.hormi.toLowerCase();
    const cat=guessCat(g.hormi);
    return D.transactions.filter(t=>t.date.startsWith(m)&&(t.description.toLowerCase().includes(kw)||t.category===cat.id)).reduce((s,t)=>s+t.amount,0);
  }
  return D.transactions.filter(t=>t.date.startsWith(m)&&t.category===g.cat).reduce((s,t)=>s+t.amount,0);
}

function buildMgChips(){buildMgChipsMulti();}
function selMgHormi(el,label){mgHormi=label;togMgHormi(label);}
function saveGoal(){
  // Legacy single-select (used from onboarding)
  if(!mgHormi||!mgSelectedHormis||!Object.keys(mgSelectedHormis).length){
    toast('Elige una hormiga','warn');return;
  }
  saveGoalMulti();
}
function saveGoalMulti(){
  const hKeys=Object.keys(mgSelectedHormis);
  const cKeys=Object.keys(mgSelectedCats);
  if(!hKeys.length&&!cKeys.length){toast('Elige al menos una hormiga o categoría','warn');return;}
  const m=new Date().toISOString().slice(0,7);
  let saved=0;
  for(const h of hKeys){
    const inEl=document.getElementById('mgamt-'+h.replace(/[\s']/g,'_'));
    const a=parseFloat(inEl?.value||mgSelectedHormis[h]||0);
    if(!a||a<=0){toast(`Ingresa monto para "${h}"`, 'warn');return;}
    D.goals=D.goals.filter(g=>!(g.month===m&&g.hormi===h));
    D.goals.push({id:Date.now()+Math.random(),hormi:h,budget:a,month:m});
    saved++;
  }
  for(const catId of cKeys){
    const inEl=document.getElementById('mgcamt-'+catId);
    const a=parseFloat(inEl?.value||mgSelectedCats[catId]||0);
    const catLabel=(allCats().find(c=>c.id===catId)||{l:catId}).l;
    if(!a||a<=0){toast(`Ingresa monto para "${catLabel}"`, 'warn');return;}
    D.goals=D.goals.filter(g=>!(g.month===m&&g.cat===catId));
    D.goals.push({id:Date.now()+Math.random(),cat:catId,budget:a,month:m});
    saved++;
  }
  save();saveUserData();closeOv('m-goal');renderGoals();renderHome();toast(`Meta${saved>1?'s':''} guardada${saved>1?'s':''} ✓`,'ok');
}
function renderGoals(){
  const m=new Date().toISOString().slice(0,7);
  const mg=D.goals.filter(g=>g.month===m);
  document.getElementById('goals-c').innerHTML=`
    <div style="font-family:var(--font-title);font-size:25px;font-weight:800;margin-bottom:5px">Metas</div>
    <div style="font-size:13px;color:var(--t3);margin-bottom:16px">${MO[new Date().getMonth()]} ${new Date().getFullYear()}</div>
    ${mg.map(g=>{
      const isHG=!!g.hormi;
      const label=isHG?g.hormi:(CATS.find(c=>c.id===g.cat)||CATS[14]).l;
      const emoji=isHG?'🐜':(CATS.find(c=>c.id===g.cat)||CATS[14]).e;
      const sp=calcGoalSpent(g);
      const pct=Math.min(sp/g.budget*100,100);
      const fc=sp>g.budget?'var(--red)':sp>g.budget*.75?'var(--amber)':'var(--lime)';
      const bc=sp>g.budget?'b-over':sp>g.budget*.75?'b-warn':'b-ok';
      const bt=sp>g.budget?'superada':sp>g.budget*.75?'en riesgo':'en control';
      return`<div class="goal-it">
        <div class="git-top"><div class="git-ic">${emoji}</div><div class="git-nfo"><div class="git-nm">${label}</div><div class="git-sub">límite S/ ${g.budget}/mes</div></div><div class="badge ${bc}">${bt}</div></div>
        <div class="git-bar"><div class="git-fill" style="width:${pct}%;background:${fc}"></div></div>
        <div class="git-ft"><span>gastado: ${fmt(sp)}</span><span>quedan: ${fmt(Math.max(g.budget-sp,0))}</span></div>
      </div>`;
    }).join('')}
    <button class="add-goal-btn" onclick="openModal('m-goal')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>nueva meta del mes</button>
    ${D.hormis.length?`<div style="margin-top:8px;font-size:12px;color:var(--t3)">tus hormigas: ${D.hormis.map(h=>`<span style="background:var(--s2);padding:2px 8px;border-radius:20px;margin:2px;display:inline-block">${h}</span>`).join('')}</div>`:''}
    ${buildAchievements()}`;}

function buildAchievements(){
  const txs=D.transactions;const hm=txs.filter(t=>t.isHormi);
  const tm=new Date().toISOString().slice(0,7);
  const mgoals=D.goals.filter(g=>g.month===tm);
  // compute streaks
  let streak=0,maxS=0,cur=0;
  const today=new Date(),dates=new Set(txs.map(t=>t.date));
  for(let i=0;i<60;i++){const d=new Date(today);d.setDate(d.getDate()-i);if(dates.has(d.toISOString().slice(0,10)))cur++;else break;}streak=cur;
  const daysUnderBudget=()=>{let c=0,s=0;const bud=D.budget||30;[...new Set(hm.map(t=>t.date))].sort().reverse().forEach(d=>{const da=hm.filter(t=>t.date===d).reduce((x,t)=>x+t.amount,0);if(da<=bud)c++;else{if(c>s)s=c;c=0;}});return Math.max(c,s);};
  const metaCumplida=mgoals.some(g=>{const sp=g.hormi?txs.filter(t=>t.date.startsWith(g.month)&&t.description.toLowerCase().includes(g.hormi.toLowerCase())).reduce((s,t)=>s+t.amount,0):txs.filter(t=>t.date.startsWith(g.month)&&t.category===g.cat).reduce((s,t)=>s+t.amount,0);return sp<g.budget;});
  const weekAmts=w=>{const s=new Date();s.setDate(s.getDate()-w*7-6);const e=new Date();e.setDate(e.getDate()-w*7);return hm.filter(t=>new Date(t.date)>=s&&new Date(t.date)<=e).reduce((x,t)=>x+t.amount,0);};
  const w0=weekAmts(0),w1=weekAmts(1);
  const ACHVS=[
    {ic:'🐣',t:'Primera hormiga',s:'Registra tu primer gasto',unlocked:txs.length>0},
    {ic:'📅',t:'Una semana seguida',s:'7 días consecutivos registrando',unlocked:streak>=7},
    {ic:'🛡️',t:'Bajo control',s:'3 días seguidos sin superar el límite',unlocked:daysUnderBudget()>=3},
    {ic:'🔍',t:'Detective de hormigas',s:'Identifica 5 o más hormigas',unlocked:(D.hormis||[]).length>=5},
    {ic:'🏆',t:'Meta cumplida',s:'Cierra el mes por debajo del presupuesto',unlocked:metaCumplida},
    {ic:'💰',t:'Ahorrador',s:'Gasta menos esta semana que la anterior',unlocked:w1>0&&w0<w1},
    {ic:'⭐',t:'Constante',s:'30 días de uso de HORMI',unlocked:streak>=30||new Set(txs.map(t=>t.date)).size>=30},
  ];
  const unlockedCount=ACHVS.filter(a=>a.unlocked).length;
  return`<div style="margin-top:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div class="sec" style="margin:0">Logros</div>
      <div style="font-size:12px;color:var(--lime)">${unlockedCount}/${ACHVS.length} desbloqueados</div>
    </div>
    <div class="ach-grid">${ACHVS.map(a=>`<div class="ach-it${a.unlocked?'':' locked'}">
      <div class="ach-ic">${a.unlocked?a.ic:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'}</div>
      <div class="ach-nfo"><div class="ach-t">${a.t}</div><div class="ach-s">${a.s}</div></div>
      ${a.unlocked?'<div class="ach-unlocked"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>':''}
    </div>`).join('')}</div>
  </div>`;}

// ── SETTINGS ──────────────────────────────────────────────────────────────────
function buildAliasSettings(){
  const aliases=D.aliases||{};const entries=Object.entries(aliases);
  if(!entries.length)return`<div class="s-sec"><div class="sec">mis alias</div><div style="font-size:12px;color:var(--t3);padding:8px 0">Ningún alias guardado aún. Cuando escanees un comprobante, puedes asignar un nombre corto al proveedor.</div></div>`;
  return`<div class="s-sec"><div class="sec">mis alias</div>
    ${entries.map(([raw,al])=>`<div class="s-row" style="cursor:default">
      <div class="s-rl"><div class="s-rl-t">${al.alias}</div><div class="s-rl-s">${raw.slice(0,32)}</div></div>
      <button style="background:none;border:none;color:var(--red);font-size:13px;cursor:pointer;padding:4px 8px" onclick="deleteAlias('${raw.replace(/'/g,"\\'")}')">×</button>
    </div>`).join('')}
  </div>`;
}
function deleteAlias(raw){if(!D.aliases)return;delete D.aliases[raw];save();renderSet();toast('Alias eliminado','ok');}

function renderSet(){
  const proActive=isPro();
  let trialEndStr='';
  if(!D.isPro&&D.trialStart){const e=new Date(D.trialStart);e.setDate(e.getDate()+15);trialEndStr=e.toLocaleDateString('es-PE');}
  // avatar initials
  const initials=(D.name||'HO').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const email=_supaUser?.email||'';

  // pro banner
  const proBanner=proActive
    ?`<div style="background:#a6b1e7;border-radius:16px;padding:16px 18px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between">
        <div><div style="font-family:var(--font-title);font-size:15px;font-weight:800;color:#407178">Hormi Pro · Activo</div><div style="font-size:12px;color:#407178;margin-top:2px">${D.isPro?'':'Trial hasta '+trialEndStr}</div></div>
        <i data-lucide="crown" style="width:20px;height:20px;color:#407178;flex-shrink:0"></i>
      </div>`
    :`<div style="background:linear-gradient(135deg,#d3e458,#9ec43e);border-radius:16px;padding:16px 18px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="openUpgrade()">
        <div><div style="font-family:var(--font-title);font-size:15px;font-weight:800;color:#080808">👑 Desbloquea HORMI Pro</div><div style="font-size:12px;color:#3a5000;margin-top:2px">Escaneos ilimitados, voz, planificador IA y más</div></div>
        <button onclick="openUpgrade()" style="background:#080808;color:#d3e458;border:none;border-radius:10px;padding:8px 14px;font-family:var(--font-title);font-weight:800;font-size:13px;cursor:pointer;white-space:nowrap;flex-shrink:0">Ver planes</button>
      </div>`;

  // quick access grid
  const _ico=p=>`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const quickGrid=`<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:24px">
    <div style="background:var(--s1);border:.5px solid var(--b1);border-radius:16px;padding:14px 8px;text-align:center;cursor:pointer" onclick="openUpgrade()">
      <div style="display:flex;justify-content:center;margin-bottom:6px;color:var(--t2)">${_ico('<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>')}</div>
      <div style="font-size:11px;font-weight:600;color:var(--t2)">Mi plan</div>
    </div>
    <div style="background:var(--s1);border:.5px solid var(--b1);border-radius:16px;padding:14px 8px;text-align:center;cursor:pointer" onclick="openChangePass()">
      <div style="display:flex;justify-content:center;margin-bottom:6px;color:var(--t2)">${_ico('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>')}</div>
      <div style="font-size:11px;font-weight:600;color:var(--t2)">Seguridad</div>
    </div>
    <div style="background:var(--s1);border:.5px solid var(--b1);border-radius:16px;padding:14px 8px;text-align:center;cursor:pointer" onclick="document.getElementById('s-set').scrollTo({top:document.getElementById('fb-text')?.offsetTop||9999,behavior:'smooth'})">
      <div style="display:flex;justify-content:center;margin-bottom:6px;color:var(--t2)">${_ico('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>')}</div>
      <div style="font-size:11px;font-weight:600;color:var(--t2)">Feedback</div>
    </div>
    <div style="background:var(--s1);border:.5px solid var(--b1);border-radius:16px;padding:14px 8px;text-align:center;cursor:pointer" onclick="showGuide()">
      <div style="display:flex;justify-content:center;margin-bottom:6px;color:var(--t2)">${_ico('<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>')}</div>
      <div style="font-size:11px;font-weight:600;color:var(--t2)">Ayuda</div>
    </div>
  </div>`;

  const aliasCount=Object.keys(D.aliases||{}).length;

  document.getElementById('set-c').innerHTML=`
    <div style="padding:calc(var(--st)+20px) 18px 0">
      <!-- HEADER -->
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px">
        <div style="width:56px;height:56px;border-radius:50%;background:#d3e458;display:flex;align-items:center;justify-content:center;font-family:var(--font-title);font-size:20px;font-weight:800;color:#080808;flex-shrink:0">${initials}</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:var(--font-title);font-size:18px;font-weight:800;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${D.name||'Mi perfil'}</div>
          <div style="font-size:12px;color:var(--t3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${email}</div>
        </div>
        <div style="font-size:13px;color:var(--lime-t);font-weight:600;cursor:pointer;flex-shrink:0" onclick="openEditProfile()">Editar ›</div>
      </div>
      ${proBanner}
      ${quickGrid}
      <!-- MI CUENTA -->
      <div class="s-sec">
        <div class="sec">Mi cuenta</div>
        <div class="s-row" onclick="openEditProfile()"><div class="s-rl"><div class="s-rl-t">Editar perfil</div><div class="s-rl-s">Nombre, celular, ciudad, ocupación, edad</div></div><div class="s-rr">›</div></div>
        <div class="s-row" onclick="openChangePass()"><div class="s-rl"><div class="s-rl-t">Cambiar contraseña</div></div><div class="s-rr">›</div></div>
        ${_supaUser?`<div class="s-row" onclick="signOut()"><div class="s-rl"><div class="s-rl-t" style="color:var(--amber)">Cerrar sesión</div></div></div>`:''}
        <div class="s-row" onclick="openDeleteAccount()"><div class="s-rl"><div class="s-rl-t" style="color:var(--red)">Eliminar cuenta</div></div></div>
      </div>
      <!-- PREFERENCIAS -->
      <div class="s-sec">
        <div class="sec">Preferencias</div>
        <div class="s-row" onclick="openModal('m-budget')"><div class="s-rl"><div class="s-rl-t">Límite diario</div><div class="s-rl-s">Alerta cuando superas</div></div><div class="s-rr" id="disp-budget">S/ ${D.budget} ›</div></div>
        <div class="s-row"><div class="s-rl"><div class="s-rl-t">Mis hormigas</div></div><div class="s-rr">${D.hormis.length} identificadas</div></div>
      </div>
      <!-- MIS CATEGORÍAS -->
      <div class="s-sec">
        <div class="sec">Mis categorías</div>
        ${(D.customCats||[]).length
          ? (D.customCats||[]).map(c=>`
            <div class="s-row">
              <div class="s-rl"><div class="s-rl-t">${c.e} ${c.l}</div></div>
              <div class="s-rr" style="display:flex;gap:6px">
                <button onclick="openCatEditor('set','${jsAttr(c.l)}')" style="background:rgba(45,81,88,.08);border:1px solid var(--b2);border-radius:8px;padding:5px 12px;font-size:12px;color:#2d5158;font-weight:700;cursor:pointer;font-family:var(--font-body)">editar</button>
                <button onclick="delCustomCatFromSet('c_${jsAttr(c.l)}')" style="background:rgba(230,57,70,.08);border:1px solid var(--red-b);border-radius:8px;padding:5px 12px;font-size:12px;color:var(--red);font-weight:700;cursor:pointer;font-family:var(--font-body)">eliminar</button>
              </div>
            </div>`).join('')
          : `<div class="s-row"><div class="s-rl"><div class="s-rl-s">Aún no has creado categorías propias. Puedes crearlas al registrar un gasto.</div></div></div>`
        }
      </div>
      <!-- DATOS -->
      <div class="s-sec">
        <div class="sec">Datos</div>
        <div class="s-row" onclick="exportCSV()"><div class="s-rl"><div class="s-rl-t">Exportar mis datos</div><div class="s-rl-s">Todos tus gastos en CSV</div></div><div class="s-rr">›</div></div>
        <div class="s-row"><div class="s-rl"><div class="s-rl-t">Gastos registrados</div></div><div class="s-rr">${D.transactions.length}</div></div>
        <div class="s-row"><div class="s-rl"><div class="s-rl-t">Proveedores guardados</div></div><div class="s-rr">${aliasCount} ›</div></div>
      </div>
      ${!D.isPro?`<div class="s-sec">
        <div class="sec">activar código Pro</div>
        <div style="display:flex;gap:8px;margin-bottom:6px">
          <input type="text" class="txt-in" id="pro-code-in" placeholder="HORMIXXXNNN" style="margin-bottom:0;flex:1;text-transform:uppercase;font-family:monospace;letter-spacing:.08em" autocomplete="off" autocapitalize="characters" oninput="this.value=this.value.toUpperCase()">
          <button onclick="activateProCode()" style="padding:10px 14px;background:var(--lime);border:none;border-radius:var(--r);font-family:var(--font-title);font-weight:800;font-size:14px;cursor:pointer;white-space:nowrap;color:#080808;flex-shrink:0">Activar</button>
        </div>
        <div style="font-size:11px;color:var(--t3);line-height:1.5">Código de acceso Pro. Ej: <span style="font-family:monospace">HORMI2024</span></div>
      </div>`:''}
      <!-- AYUDA Y FEEDBACK -->
      <div class="s-sec">
        <div class="sec">Ayuda y feedback</div>
        <div style="padding:4px 0 14px">
          <div style="font-family:var(--font-title);font-size:16px;font-weight:800;margin-bottom:4px">¿Algo que mejorar?</div>
          <div style="font-size:13px;color:var(--t2);margin-bottom:12px;line-height:1.5">Tu opinión hace que HORMI sea mejor para ti y para toda LATAM 🐜</div>
          <textarea id="fb-text" rows="4" placeholder="Cuéntanos tu experiencia, un bug, o una idea..." maxlength="500" oninput="document.getElementById('fb-counter').textContent=500-this.value.length+' restantes'" style="width:100%;padding:12px;background:var(--s2);border:1.5px solid var(--b2);border-radius:var(--r);font-size:14px;font-family:var(--font-title);color:var(--t1);resize:none;outline:none;transition:border-color .15s" onfocus="this.style.borderColor='var(--lime-t)'" onblur="this.style.borderColor=''"></textarea>
          <div style="font-size:11px;color:var(--t3);text-align:right;margin-top:3px" id="fb-counter">500 restantes</div>
          <button onclick="doSendFeedback()" style="width:100%;margin-top:10px;padding:14px;background:var(--lime);border:none;border-radius:var(--r);font-family:var(--font-title);font-weight:800;font-size:15px;color:#080808;cursor:pointer">Enviar feedback 🐜</button>
          <div style="font-size:12px;color:var(--t3);margin-top:10px;line-height:1.5">¿Preguntas? <a href="https://wa.me/51970300434" target="_blank" style="color:var(--lime-t);text-decoration:none">Contactar por WhatsApp</a></div>
        </div>
        <div class="s-row" onclick="showGuide()"><div class="s-rl"><div class="s-rl-t">Ver guía de la app</div></div><div class="s-rr">›</div></div>
      </div>
      <!-- LEGAL -->
      <div class="s-sec">
        <div class="sec">Legal</div>
        <div class="s-row" onclick="showTerms()"><div class="s-rl"><div class="s-rl-t">Términos y Política de privacidad</div></div><div class="s-rr">›</div></div>
      </div>
      <!-- FOOTER -->
      <div style="text-align:center;padding:8px 0 4px;font-size:11px;color:var(--t3)">${_supaUser?`Conectado como ${email}`:'HORMI v2'} · v1.0 MVP</div>
      <div style="text-align:center;padding:20px 18px calc(16px + var(--sb));background:linear-gradient(to bottom,#fff,rgba(200,246,90,.08));margin:0 -20px">
        <div style="font-family:var(--font-title);font-size:32px;font-weight:800;color:#080808;line-height:1.1">Made with 🐜</div>
        <div style="font-family:var(--font-title);font-size:28px;font-weight:800;color:#d3e458;line-height:1.1">in Latin America</div>
      </div>
    </div>`;
  if(window.lucide)lucide.createIcons();
}
function editName(){const n=prompt('Tu nombre:',D.name);if(n?.trim()){D.name=n.trim();save();saveUserData();renderHome();renderSet();}}
function exportCSV(){
  const rows=[['fecha','descripcion','monto','categoria','es_hormiga']];
  D.transactions.forEach(t=>rows.push([t.date,`"${t.description}"`,t.amount,t.category,t.isHormi?'sí':'no']));
  const blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='hormi_gastos.csv';a.click();
  toast('CSV descargado ✓','ok');
}
function resetApp(){if(confirm('¿Borrar TODO?')){localStorage.removeItem(SK);location.reload();}}
let _termsFrom='welcome';
function showTerms(){_termsFrom='settings';_hideAllScreens();const el=document.getElementById('s-terms');if(el){el.style.display='flex';el.style.flexDirection='column';el.style.overflowY='auto';el.classList.add('on');}}
function termsBack(){if(_termsFrom==='settings'){_hideAllScreens();showMain();go('set');}else{showAuthScreen('s-welcome');}}
async function doSendFeedback(){
  const el=document.getElementById('fb-text');
  if(!el)return;
  const msg=el.value.trim();
  if(!msg){toast('Escribe tu mensaje primero','warn');return;}
  await submitFeedback(msg);
  el.value='';
  const counter=document.getElementById('fb-counter');
  if(counter)counter.textContent='500 restantes';
  toast('¡Gracias por tu feedback! 🐜','ok');
}

// ── WELCOME CAROUSEL ─────────────────────────────────────────────────────────
let _wcSlide=0,_wcAutoTimer=null;
function wcSlide(i){
  _wcSlide=i;
  const slides=document.getElementById('wc-slides');
  if(slides)slides.style.transform=`translateX(-${i*100}%)`;
  document.querySelectorAll('.wc-dot').forEach((d,j)=>d.classList.toggle('on',j===i));
}
function _wcAutoAdvance(){
  clearInterval(_wcAutoTimer);
  _wcAutoTimer=setInterval(()=>{wcSlide((_wcSlide+1)%4);},4000);
}
function _initWcSwipe(){
  const el=document.getElementById('wc-slides');
  if(!el||el.dataset.swipeReady)return;
  el.dataset.swipeReady='1';
  let sx=0;
  el.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;clearInterval(_wcAutoTimer);},{passive:true});
  el.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-sx;
    if(Math.abs(dx)>40){const n=_wcSlide+(dx<0?1:-1);if(n>=0&&n<4)wcSlide(n);}
    _wcAutoAdvance();
  },{passive:true});
  _wcAutoAdvance();
}

// ── GUIDE MODAL ───────────────────────────────────────────────────────────────
const GUIDE_SLIDES=[
  {ico:'👆',title:'Tu semáforo diario',desc:'Verde = bajo el límite · Amarillo = cuidado · Rojo = límite superado. Revisa tu card de presupuesto cada día.'},
  {ico:'📅',title:'Tu calendario',desc:'Toca cualquier día para ver o agregar gastos. Desliza para navegar entre semanas.'},
  {ico:'➕',title:'Agregar gastos',desc:'Toca el botón + abajo a la derecha. Puedes registrar manualmente, escanear un voucher o usar tu voz.'},
  {ico:'🎯',title:'Tus metas',desc:'Elige una hormiga y ponle un límite mensual. HORMI trackea automáticamente cuánto llevas gastado.'},
  {ico:'📊',title:'Análisis',desc:'En la pestaña Análisis ve en qué se va tu plata y cuánto podrías ahorrar reduciendo tus hormis.'},
];
let _guideSlide=0;
function showGuide(){
  const modal=document.getElementById('guide-modal');
  if(!modal)return;
  _guideSlide=0;
  const slidesEl=document.getElementById('guide-slides');
  const dotsEl=document.getElementById('guide-dots');
  slidesEl.innerHTML=GUIDE_SLIDES.map((s,i)=>`
    <div style="flex:0 0 100%;padding:28px 24px 8px;text-align:center">
      <div style="font-size:52px;margin-bottom:16px">${s.ico}</div>
      <div style="font-family:var(--font-title);font-size:20px;font-weight:800;color:#080808;margin-bottom:10px">${s.title}</div>
      <div style="font-size:14px;color:#555;line-height:1.6">${s.desc}</div>
    </div>`).join('');
  dotsEl.innerHTML=GUIDE_SLIDES.map((_,i)=>`<div class="wc-dot${i===0?' on':''}" id="gd${i}"></div>`).join('');
  modal.style.display='flex';
  _updateGuideSlide();
}
function _updateGuideSlide(){
  const slidesEl=document.getElementById('guide-slides');
  if(slidesEl)slidesEl.style.transform=`translateX(-${_guideSlide*100}%)`;
  GUIDE_SLIDES.forEach((_,i)=>{const d=document.getElementById('gd'+i);if(d)d.classList.toggle('on',i===_guideSlide);});
  const btn=document.getElementById('guide-next-btn');
  if(btn)btn.textContent=_guideSlide===GUIDE_SLIDES.length-1?'Entendido ✓':'Siguiente →';
}
function guideNext(){
  if(_guideSlide<GUIDE_SLIDES.length-1){_guideSlide++;_updateGuideSlide();}
  else skipGuide();
}
function skipGuide(){
  document.getElementById('guide-modal').style.display='none';
  D.guideSeen=true;save();saveUserData();
}

// ── TRIAL DATA SHEET ──────────────────────────────────────────────────────────
function openTrialDataSheet(){
  closeOv('sh-trial');
  if(D.trialUserData){
    const td=D.trialUserData;
    ['td-phone','td-city','td-occ','td-age'].forEach(id=>{
      const el=document.getElementById(id);
      if(el&&td[id.slice(3)])el.value=td[id.slice(3)];
    });
  }
  openSheet('sh-trial-data');
}
async function submitTrialData(){
  const phone=document.getElementById('td-phone').value.trim();
  const city=document.getElementById('td-city').value.trim();
  const occ=document.getElementById('td-occ').value;
  const age=parseInt(document.getElementById('td-age').value);
  if(!phone||!city||!occ||!age||age<16||age>80){toast('Completa todos los campos','warn');return;}
  D.trialUserData={phone,city,occupation:occ,age};
  activateTrial();
  closeOv('sh-trial-data');
  if(_supaUser){
    try{await _sb.from('profiles').upsert({id:_supaUser.id,phone,city,occupation:occ,age});}catch(e){}
  }
}

// ── EDIT PROFILE SHEET ────────────────────────────────────────────────────────
function openEditProfile(){
  const td=D.trialUserData||{};
  document.getElementById('ep-name').value=D.name||'';
  document.getElementById('ep-phone').value=td.phone||'';
  document.getElementById('ep-city').value=td.city||'';
  document.getElementById('ep-occ').value=td.occupation||'';
  document.getElementById('ep-age').value=td.age||'';
  openSheet('sh-edit-profile');
}
async function saveEditProfile(){
  const name=document.getElementById('ep-name').value.trim();
  const phone=document.getElementById('ep-phone').value.trim();
  const city=document.getElementById('ep-city').value.trim();
  const occ=document.getElementById('ep-occ').value;
  const age=parseInt(document.getElementById('ep-age').value)||0;
  if(name)D.name=name;
  D.trialUserData={phone,city,occupation:occ,age};
  save();
  if(_supaUser){try{await _sb.from('profiles').upsert({id:_supaUser.id,name:D.name,phone,city,occupation:occ,age});}catch(e){}}
  closeOv('sh-edit-profile');
  renderHome();renderSet();
  toast('Perfil actualizado ✓','ok');
}

// ── CHANGE PASSWORD SHEET ─────────────────────────────────────────────────────
function openChangePass(){
  const cpGoogle=document.getElementById('cp-google-msg');
  const cpForm=document.getElementById('cp-form');
  const isGoogle=_supaUser?.app_metadata?.provider==='google';
  if(cpGoogle)cpGoogle.style.display=isGoogle?'':'none';
  if(cpForm)cpForm.style.display=isGoogle?'none':'';
  const errEl=document.getElementById('cp-err');
  if(errEl)errEl.textContent='';
  openSheet('sh-change-pass');
}
async function doChangePass(){
  const newP=document.getElementById('cp-new').value;
  const conf=document.getElementById('cp-confirm').value;
  const errEl=document.getElementById('cp-err');
  errEl.textContent='';
  if(newP.length<6){errEl.textContent='La contraseña debe tener al menos 6 caracteres';return;}
  if(newP!==conf){errEl.textContent='Las contraseñas no coinciden';return;}
  const btn=document.getElementById('cp-btn');
  btn.disabled=true;btn.textContent='Cambiando...';
  const{error}=await _sb.auth.updateUser({password:newP});
  btn.disabled=false;btn.textContent='Cambiar contraseña';
  if(error){errEl.textContent=error.message||'Error al cambiar contraseña';return;}
  closeOv('sh-change-pass');
  toast('Contraseña cambiada ✓','ok');
}

// ── PLANNING TAB ──────────────────────────────────────────────────────────────

const PLAN_CHIPS=['✈️ Viaje','📱 Celular','🛡️ Emergencia','🎓 Estudios','🏠 Depa','🚗 Auto','💻 Laptop'];
const PLAN_MO=[1,2,3,4,5,6,9,12,18,24];

function getHormiAvg(){
  const cutoff=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  const txs=D.transactions.filter(t=>t.isHormi&&t.date>=cutoff);
  return txs.length?txs.reduce((s,t)=>s+t.amount,0)/30:0;
}

function _pFmt(n){return'S/'+Math.round(Number(n)||0).toLocaleString('es-PE');}

function renderPlan(){
  if(!isPro()){
    document.getElementById('plan-c').innerHTML=`
      <div style="padding:16px 0">
        <div style="font-family:var(--font-title);font-size:28px;font-weight:800;letter-spacing:-1px;margin-bottom:4px">planificador 🚀</div>
        <div style="font-size:13px;color:var(--t3);margin-bottom:20px">Tu plan de ahorro personalizado</div>
        <div style="background:var(--lime-bg);border:1px solid var(--lime-b);border-radius:var(--r);padding:14px 16px">
          <div style="font-size:15px;font-weight:700;color:var(--lime-t);margin-bottom:4px">Función Pro</div>
          <div style="font-size:13px;color:var(--t2);margin-bottom:12px;line-height:1.5">Activa tu trial gratuito de 15 días para usar el planificador.</div>
          <button onclick="requirePro('planificador',null)" style="width:100%;padding:12px;background:var(--lime);border:none;border-radius:100px;color:#080808;font-family:var(--font-title);font-weight:800;cursor:pointer;font-size:15px">Activar Pro gratis →</button>
        </div>
      </div>`;
    return;
  }
  if(D.planOutput){_pRenderOut(D.planOutput);return;}
  _pWizard(_planStage);
}

function _pWizard(n){
  _planStage=n;
  const dots=[0,1,2,3].map(i=>`<div class="pl-sdot${i<n-1?' done':i===n-1?' active':''}"></div>`).join('');
  const labels=['Tu objetivo','Tus ingresos','Gastos fijos','Gastos variables'];
  let body='';
  if(n===1)body=_pS1();else if(n===2)body=_pS2();else if(n===3)body=_pS3();else body=_pS4();
  document.getElementById('plan-c').innerHTML=`
    <div>
      <div style="font-family:var(--font-title);font-size:28px;font-weight:800;letter-spacing:-1px;margin-bottom:4px">planificador 🚀</div>
      <div style="font-size:13px;color:var(--t3);margin-bottom:20px">Tu plan de ahorro personalizado</div>
      <div class="pl-snav">${dots}</div>
      <div class="pl-slbl">Paso ${n} de 4 — ${labels[n-1]}</div>
      ${body}
    </div>`;
}

function _pS1(){
  const fd=_planFD;
  const chips=PLAN_CHIPS.map(c=>`<button class="pl-chip${fd.objetivo===c?' on':''}" onclick="_pSelChip('${c}')">${c}</button>`).join('');
  const opts=PLAN_MO.map(m=>`<option value="${m}"${fd.meses===m?' selected':''}>${m} ${m===1?'mes':'meses'}</option>`).join('');
  const monthly=fd.meses>0?(fd.metaTotal/fd.meses):0;
  return`<div class="pl-chips">${chips}</div>
    <div class="pl-iw"><input id="pl-custom" placeholder="O escribe tu meta…" value="${fd.objetivoCustom||''}" oninput="_pCustom(this.value)"></div>
    <span class="pl-flbl">¿Cuánto necesitas?</span>
    <div class="pl-iw"><span class="pl-ipr">S/</span><input id="pl-amt" type="number" placeholder="0" value="${fd.metaTotal||''}" oninput="_pU1()"></div>
    <span class="pl-flbl">¿En cuántos meses?</span>
    <div class="pl-iw" style="margin-bottom:${fd.metaTotal?'10':'0'}px"><select id="pl-meses" onchange="_pU1()">${opts}</select></div>
    ${fd.metaTotal>0?`<div style="padding:10px 14px;background:var(--s1);border-radius:12px;margin-bottom:0"><p style="font-size:12px;color:var(--t3)">Necesitas ahorrar <strong style="color:var(--t1)">${_pFmt(monthly)}/mes</strong> para lograrlo</p></div>`:''}
    <div class="pl-nav-row"><button class="pl-btn-next" onclick="planNext(1)" ${!fd.metaTotal?'disabled':''}>Continuar →</button></div>`;
}

function _pS2(){
  const fd=_planFD;
  const total=(fd.ingresoFijo||0)+(fd.ingresoVariable||0);
  const monthly=fd.meses>0?(fd.metaTotal/fd.meses):0;
  const pct=total>0?Math.round(monthly/total*100):0;
  return`<span class="pl-flbl">Ingreso fijo mensual</span>
    <div class="pl-iw"><span class="pl-ipr">S/</span><input id="pl-ingfijo" type="number" placeholder="Sueldo, honorarios fijos…" value="${fd.ingresoFijo||''}" oninput="_pU2()"></div>
    <span class="pl-flbl">Ingreso variable estimado</span>
    <div class="pl-iw"><span class="pl-ipr">S/</span><input id="pl-ingvar" type="number" placeholder="Freelance, ventas, extras…" value="${fd.ingresoVariable||''}" oninput="_pU2()"></div>
    <div class="pl-total-pill"><span>Total ingresos mensuales</span><strong id="pl-ing-total">${_pFmt(total)}</strong></div>
    ${total>0&&monthly>0?`<div style="background:var(--s1);border-radius:14px;padding:14px 16px;margin-bottom:20px"><p style="font-size:12px;color:var(--t3);margin-bottom:6px">Tus ingresos:</p><div style="display:flex;justify-content:space-between"><div><p style="font-size:11px;color:var(--t3)">Meta mensual</p><p style="font-size:16px;font-weight:700;color:var(--t1)">${_pFmt(monthly)}</p></div><div style="text-align:right"><p style="font-size:11px;color:var(--t3)">% de ingresos</p><p style="font-size:16px;font-weight:700;color:var(--t1)" id="pl-pct">${pct}%</p></div></div></div>`:''}
    <div class="pl-nav-row"><button class="pl-btn-back" onclick="planBack(2)">← Atrás</button><button class="pl-btn-next" onclick="planNext(2)" ${!total?'disabled':''}>Continuar →</button></div>`;
}

function _pS3(){
  const fd=_planFD;
  const rows=fd.gastosFijos.map((g,i)=>`
    <div class="pl-exp-item">
      <input class="pl-exp-lbl" placeholder="Ej: Alquiler" value="${g.label||''}" oninput="_pFLbl(${i},this.value)">
      <span class="pl-exp-sep">·</span><span style="font-size:13px;color:var(--t3);flex-shrink:0">S/</span>
      <input class="pl-exp-amt" type="number" placeholder="0" value="${g.monto||''}" oninput="_pFAmt(${i},this.value)">
      <button class="pl-exp-del" onclick="_pFRm(${i})">×</button>
    </div>`).join('');
  const total=fd.gastosFijos.reduce((s,g)=>s+(g.monto||0),0);
  return`<span class="pl-flbl">Agrega tus gastos fijos</span>
    <div class="pl-exp-list" id="pl-fijo-list">${rows}</div>
    <button class="pl-btn-add" onclick="_pFAdd()">+ Agregar gasto fijo</button>
    <div class="pl-total-pill" style="margin-top:16px"><span>Total gastos fijos</span><strong id="pl-fijo-total">${_pFmt(total)}</strong></div>
    <div class="pl-nav-row"><button class="pl-btn-back" onclick="planBack(3)">← Atrás</button><button class="pl-btn-next" onclick="planNext(3)">Continuar →</button></div>`;
}

function _pS4(){
  const fd=_planFD;
  const avg=getHormiAvg();
  const avgMes=Math.round(avg*30);
  // Las hormis NO entran en el total — son la palanca, no un gasto fijo
  const totalVar=(fd.alimentacion||0)+(fd.transporte||0)+(fd.ocio||0);
  return`<span class="pl-flbl">Alimentación</span>
    <div class="pl-iw"><span class="pl-ipr">S/</span><input id="pl-alim" type="number" placeholder="Comida, mercado…" value="${fd.alimentacion||''}" oninput="_pU4()"></div>
    <span class="pl-flbl">Transporte</span>
    <div class="pl-iw"><span class="pl-ipr">S/</span><input id="pl-trans" type="number" placeholder="Taxi, pasajes, gasolina…" value="${fd.transporte||''}" oninput="_pU4()"></div>
    <span class="pl-flbl">Ocio y salidas</span>
    <div class="pl-iw"><span class="pl-ipr">S/</span><input id="pl-ocio" type="number" placeholder="Salidas, entretenimiento…" value="${fd.ocio||''}" oninput="_pU4()"></div>
    <div id="pl-extra-vars"></div>
    <button onclick="_pAddVar()" style="width:100%;padding:11px;border:1.5px dashed var(--b2);border-radius:var(--r);background:none;color:var(--t2);font-size:14px;font-family:var(--font-body);cursor:pointer;margin-bottom:8px">+ agregar categoría</button>
    <div class="pl-total-pill"><span>Total gastos variables</span><strong id="pl-var-total">${_pFmt(totalVar)}</strong></div>
    <div class="pl-hormi-badge"><span>🐜</span><p>Tu promedio de hormis: <strong>S/${avgMes}/mes</strong> — solo referencia, no entra en el total.</p></div>
    <div class="pl-nav-row"><button class="pl-btn-back" onclick="planBack(4)">← Atrás</button><button class="pl-btn-next" onclick="planGenerate()">Generar plan 🚀</button></div>`;
}

function _pSelChip(c){_planFD.objetivo=c;_planFD.objetivoCustom='';document.querySelectorAll('.pl-chip').forEach(el=>el.classList.toggle('on',el.textContent.trim()===c));const inp=document.getElementById('pl-custom');if(inp)inp.value='';}
function _pCustom(v){_planFD.objetivoCustom=v;_planFD.objetivo=v;document.querySelectorAll('.pl-chip').forEach(el=>el.classList.remove('on'));}
function _pU1(){_planFD.metaTotal=parseFloat(document.getElementById('pl-amt')?.value)||0;_planFD.meses=parseInt(document.getElementById('pl-meses')?.value)||6;const btn=document.querySelector('.pl-btn-next');if(btn)btn.disabled=!_planFD.metaTotal;}
function _pU2(){_planFD.ingresoFijo=parseFloat(document.getElementById('pl-ingfijo')?.value)||0;_planFD.ingresoVariable=parseFloat(document.getElementById('pl-ingvar')?.value)||0;const t=_planFD.ingresoFijo+_planFD.ingresoVariable;const el=document.getElementById('pl-ing-total');if(el)el.textContent=_pFmt(t);const btn=document.querySelector('.pl-btn-next');if(btn)btn.disabled=!t;}
function _pFLbl(i,v){_planFD.gastosFijos[i].label=v;}
function _pFAmt(i,v){_planFD.gastosFijos[i].monto=parseFloat(v)||0;const el=document.getElementById('pl-fijo-total');if(el)el.textContent=_pFmt(_planFD.gastosFijos.reduce((s,g)=>s+(g.monto||0),0));}
function _pFRm(i){_planFD.gastosFijos.splice(i,1);_pWizard(3);}
function _pFAdd(){
  _planFD.gastosFijos.push({label:'',monto:0});
  const list=document.getElementById('pl-fijo-list');if(!list)return;
  const i=_planFD.gastosFijos.length-1;
  const row=document.createElement('div');row.className='pl-exp-item';
  row.innerHTML=`<input class="pl-exp-lbl" placeholder="Ej: Gimnasio" oninput="_pFLbl(${i},this.value)"><span class="pl-exp-sep">·</span><span style="font-size:13px;color:var(--t3);flex-shrink:0">S/</span><input class="pl-exp-amt" type="number" placeholder="0" oninput="_pFAmt(${i},this.value)"><button class="pl-exp-del" onclick="_pFRm(${i})">×</button>`;
  list.appendChild(row);
}
let _planExtraVars=[];
function _pAddVar(){
  const idx=_planExtraVars.length;
  _planExtraVars.push({label:'',monto:0});
  const container=document.getElementById('pl-extra-vars');
  if(!container)return;
  const div=document.createElement('div');
  div.id=`pl-extra-${idx}`;
  div.style.cssText='margin-bottom:10px';
  div.innerHTML=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
    <input type="text" placeholder="Nombre categoría..." value="" oninput="_pUpdateExtra(${idx},'label',this.value)" style="flex:1;padding:8px 10px;border:1px solid var(--b2);border-radius:var(--rsm);font-family:var(--font-body);font-size:13px;color:var(--t1);background:var(--bg);outline:none">
    <button onclick="_pRemoveVar(${idx})" style="width:28px;height:28px;border:none;border-radius:8px;background:var(--red-bg);color:var(--red);font-size:16px;cursor:pointer;flex-shrink:0">×</button>
  </div>
  <div class="pl-iw"><span class="pl-ipr">S/</span><input type="number" placeholder="0" oninput="_pUpdateExtra(${idx},'monto',parseFloat(this.value)||0)" style="width:100%"></div>`;
  container.appendChild(div);
}
function _pUpdateExtra(idx,field,val){
  if(_planExtraVars[idx])_planExtraVars[idx][field]=val;
  _pU4();
}
function _pRemoveVar(idx){
  _planExtraVars[idx]={label:'',monto:0};
  const el=document.getElementById(`pl-extra-${idx}`);
  if(el)el.remove();
  _pU4();
}
function _pU4(){
  _planFD.alimentacion=parseFloat(document.getElementById('pl-alim')?.value)||0;
  _planFD.transporte=parseFloat(document.getElementById('pl-trans')?.value)||0;
  _planFD.ocio=parseFloat(document.getElementById('pl-ocio')?.value)||0;
  const extraTotal=_planExtraVars.reduce((s,v)=>s+(v.monto||0),0);
  _planFD.extrasTotal=extraTotal;
  _planFD.extras=_planExtraVars.filter(v=>v.label||v.monto);
  const total=_planFD.alimentacion+_planFD.transporte+_planFD.ocio+extraTotal;
  const el=document.getElementById('pl-var-total');
  if(el)el.textContent=_pFmt(total);
}

function planSaveStage(s){
  if(s===1){_planFD.metaTotal=parseFloat(document.getElementById('pl-amt')?.value)||_planFD.metaTotal;_planFD.meses=parseInt(document.getElementById('pl-meses')?.value)||_planFD.meses;_planFD.objetivo=document.getElementById('pl-custom')?.value||_planFD.objetivo;}
  else if(s===2){_planFD.ingresoFijo=parseFloat(document.getElementById('pl-ingfijo')?.value)||0;_planFD.ingresoVariable=parseFloat(document.getElementById('pl-ingvar')?.value)||0;}
  else if(s===4){_pU4();}
}

function planNext(s){
  planSaveStage(s);
  if(s===1&&!_planFD.metaTotal){toast('Ingresa el monto de tu meta','warn');return;}
  if(s===2&&!(_planFD.ingresoFijo+_planFD.ingresoVariable)){toast('Ingresa tus ingresos','warn');return;}
  _pWizard(s+1);
}

function planBack(s){planSaveStage(s);_pWizard(s-1);}

function planGenerate(){
  planSaveStage(4);
  document.getElementById('plan-c').innerHTML=`
    <div class="pl-generating">
      <div class="pl-gen-icon">🚀</div>
      <p class="pl-gen-title">Generando tu plan...</p>
      <p class="pl-gen-sub">HORMI está analizando tus datos y construyendo tu plan personalizado</p>
      <div class="pl-spinner"></div>
    </div>`;
  setTimeout(()=>{
    const fd=_planFD;
    const ingresoTotal=(fd.ingresoFijo||0)+(fd.ingresoVariable||0);
    const totalGastosFijos=fd.gastosFijos.reduce((s,g)=>s+(parseFloat(g.monto)||0),0);
    const totalGastosVariables=(fd.alimentacion||0)+(fd.transporte||0)+(fd.ocio||0);
    // Hormis NO se restan del flujo libre — son la palanca, no un gasto fijo
    const flujoLibre=ingresoTotal-totalGastosFijos-totalGastosVariables;
    const ahorroMensualNecesario=fd.meses>0?(fd.metaTotal/fd.meses):0;
    const hormisPromedio=_pHormisPromedio();
    // Calcular límite diario bruto para determinar el caso
    const surplusParaHormis=flujoLibre-ahorroMensualNecesario;
    const rawDaily=Math.floor(surplusParaHormis/30);
    // Umbral: >=4 normal, 1-3 advertencia, <1 crítico
    let planCase;
    if(rawDaily>=4){planCase=1;}
    else if(rawDaily>=1){planCase=2;}
    else{planCase=3;}
    const dailyLim=planCase===1?rawDaily:0;
    // Caso 2: cuánto hay que reducir hormis
    const deficitMensual=Math.max(0,ahorroMensualNecesario-flujoLibre);
    const pctReduccion=hormisPromedio>0?Math.min(100,Math.round((deficitMensual/hormisPromedio)*100)):0;
    const dailyLimCase2=Math.max(0,Math.floor((hormisPromedio-deficitMensual)/30));
    // Caso 3: opciones alternativas
    // Opción A — plazo mínimo para alcanzar la meta con el flujo libre actual (siempre > fd.meses)
    const ahorroMensualDisp=Math.max(1,flujoLibre);
    const mesesNecesariosRaw=Math.ceil(fd.metaTotal/ahorroMensualDisp);
    const mesesNecesarios=Math.max(fd.meses+1,Math.min(60,mesesNecesariosRaw));
    // Opción B — cuánto puede ahorrar en el plazo original con su flujo real (siempre < fd.metaTotal)
    const metaAlcanzable=Math.max(0,Math.min(fd.metaTotal-1,Math.floor(flujoLibre*fd.meses)));
    const topCat=_pTopCategory();
    const mesesLim=Math.min(fd.meses||6,12);
    const milestones=Array.from({length:mesesLim},(_,i)=>({mes:i+1,amt:Math.round(ahorroMensualNecesario*(i+1))}));
    const monthly_=Math.round(ahorroMensualNecesario);
    const out={
      planCase,flujoLibre,ahorroMensualNecesario,hormisPromedio,
      // caso 1
      surplus:surplusParaHormis,daily:dailyLim,status:planCase===1?'green':planCase===2?'yellow':'yellow',
      // caso 2
      deficitMensual,pctReduccion,dailyLimCase2,
      // caso 3
      mesesNecesarios,metaAlcanzable,topCat,
      monthly:ahorroMensualNecesario,milestones,
      consejo:`Trata el ahorro de ${_pFmt(monthly_)} como un gasto fijo obligatorio: págate a ti primero.`,
      _fd:fd,
      _br:{ingresoTotal,totalGastosFijos,totalGastosVariables,flujoLibre,ahorroMensualNecesario}
    };
    D.planOutput=out;save();saveUserData();
    _planChecked={};_planLimitApplied=false;_planSelectedOpt=null;
    _pRenderOut(out);
  },2200);
}

function _pRenderOut(p){
  const fd=p._fd||_planFD;
  const case_=p.planCase||1;
  // Status banner
  const statusBannerHTML=case_===1
    ?`<div class="pl-status-banner green"><div class="pl-sdotst green"></div><p><strong>¡Vas bien!</strong> Con tu flujo actual alcanzas tu meta y te sobran ${_pFmt(p.surplus)}/mes para invertir o ahorrar más.</p></div>`
    :case_===2
    ?`<div class="pl-status-banner yellow"><div class="pl-sdotst yellow"></div><p><strong>Casi llegas.</strong> Te faltan ${_pFmt(p.deficitMensual)}/mes para llegar a tu meta — reduciendo hormis sí lo logras.</p></div>`
    :`<div class="pl-status-banner yellow"><div class="pl-sdotst yellow"></div><p><strong>Te falta un poco.</strong> Hay tres formas de llegar. Elige la que mejor se adapte a ti.</p></div>`;
  // Limit / options block
  let actionCardHTML='';
  if(case_===1){
    actionCardHTML=`<div class="pl-lim-card" style="flex-direction:column;align-items:stretch">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${p._br?'12px':'0'}">
        <div class="pl-lim-left">
          <h4>Límite diario hormis</h4>
          <div class="pl-lim-amt">S/${p.daily||0}</div>
          <p>Basado en tu meta y gastos reales</p>
        </div>
        <button class="pl-btn-apply${_planLimitApplied?' applied':''}" onclick="_pApply(${p.daily||0})">${_planLimitApplied?'✓ Aplicado':'Aplicar límite'}</button>
      </div>
      ${p._br?`<div style="background:var(--s2);border-radius:12px;padding:14px;font-size:12px;color:var(--t2)">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Ingresos</span><span style="font-weight:600">${_pFmt(p._br.ingresoTotal)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>− Gastos fijos</span><span>${_pFmt(p._br.totalGastosFijos)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>− Gastos variables</span><span>${_pFmt(p._br.totalGastosVariables)}</span></div>
        <div style="border-top:1px solid var(--border);margin:8px 0"></div>
        <div style="display:flex;justify-content:space-between;font-weight:700;color:var(--lime-t)"><span>Flujo libre</span><span>${_pFmt(p._br.flujoLibre)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;color:var(--red)"><span>− Ahorro meta</span><span>${_pFmt(p._br.ahorroMensualNecesario)}</span></div>
        <div style="border-top:1px solid var(--border);margin:8px 0"></div>
        <div style="display:flex;justify-content:space-between;font-weight:700;color:var(--lime-d)"><span>÷ 30 días</span><span>S/${p.daily||0}/día</span></div>
      </div>`:''}
    </div>`;
  } else if(case_===2){
    const dailyReduction=Math.round((p.deficitMensual/30)*10)/10;
    actionCardHTML=`<div class="pl-case2-card">
      <h4>Tu palanca</h4>
      <div class="pl-case2-msg">
        Con tu flujo actual te faltan <strong>${_pFmt(p.deficitMensual)}/mes.</strong><br>
        Reduciendo <strong>${p.pctReduccion}%</strong> tus hormis (<strong>S/${dailyReduction} menos al día</strong>) alcanzas tu meta.
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="pl-lim-left">
          <h4>Nuevo límite diario</h4>
          <div class="pl-lim-amt">S/${p.dailyLimCase2}</div>
          <p>vs. promedio actual S/${Math.round((p.hormisPromedio||0)/30)}/día</p>
        </div>
        <button class="pl-btn-apply${_planLimitApplied?' applied':''}" onclick="_pApply(${p.dailyLimCase2})">${_planLimitApplied?'✓ Aplicado':'Aplicar este límite'}</button>
      </div>
    </div>`;
  } else {
    if(_planLimitApplied){
      actionCardHTML=`<div style="background:var(--lime-bg);border:1.5px solid var(--lime-b);border-radius:20px;padding:20px;margin-bottom:16px;display:flex;align-items:center;gap:14px">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--lime);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">✓</div>
        <div><div style="font-family:var(--font-title);font-size:14px;font-weight:800;color:var(--t1);margin-bottom:2px">Opción aplicada</div><div style="font-size:13px;color:var(--t2)">Tu plan se actualizó. Edita si quieres cambiar algo.</div></div>
      </div>`;
    } else {
      const optA=`<div class="pl-opt-card${_planSelectedOpt==='A'?' selected':''}" onclick="_pSelectOpt('A')"><div class="pl-opt-lbl">Opción A — Ajustar plazo</div><div class="pl-opt-title">Extiende a ${p.mesesNecesarios} meses y sí llegas.</div><div class="pl-opt-sub">Con tu flujo libre y reduciendo hormis al 50% alcanzas ${_pFmt(fd.metaTotal)} en ${p.mesesNecesarios} meses.</div></div>`;
      const optB=`<div class="pl-opt-card${_planSelectedOpt==='B'?' selected':''}" onclick="_pSelectOpt('B')" style="animation-delay:.1s"><div class="pl-opt-lbl">Opción B — Ajustar monto</div><div class="pl-opt-title">Ajusta tu meta a ${_pFmt(p.metaAlcanzable)} y lo logras.</div><div class="pl-opt-sub">En los ${fd.meses} meses que pusiste puedes ahorrar ${_pFmt(p.metaAlcanzable)} de forma realista.</div></div>`;
      const optC=p.topCat?`<div class="pl-opt-card${_planSelectedOpt==='C'?' selected':''}" onclick="_pSelectOpt('C')" style="animation-delay:.2s"><div class="pl-opt-lbl">Opción C — Reducir categoría</div><div class="pl-opt-title">Reduce ${p.topCat.label} y liberas ${_pFmt(Math.round(p.topCat.totalMonth*0.4))}/mes.</div><div class="pl-opt-sub">Es donde más gastas en hormis. Reducirla un 40% te da el impulso que necesitas.</div></div>`:'';
      actionCardHTML=`<div style="margin-bottom:16px">
        <div style="font-family:var(--font-title);font-size:14px;font-weight:800;color:var(--t1);margin-bottom:2px">Elige tu camino</div>
        <div style="font-size:12px;color:var(--t3);margin-bottom:12px">Las opciones son alcanzables. Elige la que mejor se ajuste a ti.</div>
        <div class="pl-opts-grid">${optA}${optB}${optC}</div>
        <button class="pl-btn-apply-opt" id="pl-apply-opt-btn" onclick="_pApplyOpt()" ${!_planSelectedOpt?'disabled':''}>${'Aplicar esta opción'}</button>
      </div>`;
    }
  }
  const msHTML=(p.milestones||[]).map((m,i)=>`<div class="pl-ms${i===0?' cur':''}"><span>Mes ${m.mes}</span><strong>${_pFmt(m.amt)}</strong></div>`).join('');
  // Component 2 — current month card
  const today=new Date();
  const dayOfMonth=today.getDate();
  const daysInMonth=new Date(today.getFullYear(),today.getMonth()+1,0).getDate();
  const monthPct=Math.round(dayOfMonth/daysInMonth*100);
  const phase=monthPct<33?'inicio':monthPct<66?'mitad':'final';
  const mn=today.toLocaleString('es-PE',{month:'long'});
  const mnC=mn.charAt(0).toUpperCase()+mn.slice(1);
  const hst=_pHSt();
  const phraseMap={
    inicio:{bien:'Buen comienzo, vas encaminado 🐜',riesgo:'Arrancamos. Ojo con los primeros días 👀',mal:'Empezamos un poco difícil — ¿te ayudo?'},
    mitad:{bien:'¡Lo estás haciendo bien! Vamos a la mitad 💪',riesgo:'Vamos a la mitad, podríamos ir mejor — ¿te ayudo?',mal:'Mitad de mes difícil. Revisemos juntos 🤝'},
    final:{bien:'¡Cierre increíble! Casi lo logras 🎉',riesgo:'Recta final — todavía puedes ajustar el rumbo',mal:'Cierre difícil. Revisemos para no repetirlo 💪'},
  };
  const phrase=phraseMap[phase][hst];
  const hdots=_pHDots();
  const pm=_pPastM();
  _planCachedPastMonths=pm;

  document.getElementById('plan-c').innerHTML=`
    <div>
      <div style="padding-top:8px;margin-bottom:16px">
        <div style="font-family:var(--font-title);font-size:28px;font-weight:800;letter-spacing:-1px;margin-bottom:4px">Tu plan</div>
        <div style="font-size:13px;color:var(--t3)">${fd.objetivo||'Meta'} · ${_pFmt(fd.metaTotal)} en ${fd.meses} ${fd.meses===1?'mes':'meses'}</div>
      </div>
      <div class="pl-edit-banner"><p>¿Cambiaron tus datos? Actualiza y el plan se adapta.</p><button class="pl-btn-edit" onclick="planEdit()">Editar</button></div>
      ${statusBannerHTML}
      <div class="pl-tl-card">
        <div class="pl-tl-hd">
          <div><h3>Meta total</h3><div class="pl-tl-goal">${_pFmt(fd.metaTotal)}</div></div>
          <div style="text-align:right"><h3>Plazo</h3><div class="pl-tl-plazo">${fd.meses}m</div></div>
        </div>
        <div class="pl-pbar-wr"><div class="pl-pbar-fill" style="width:2%"></div></div>
        <div class="pl-pbar-lbl"><span>Hoy · S/0</span><span>${_pFmt(fd.metaTotal)}</span></div>
        <div class="pl-ms-scroll">${msHTML}</div>
      </div>
      ${actionCardHTML}
      <div class="pl-tip-card"><i data-lucide="lightbulb" style="width:16px;height:16px;color:#407178;flex-shrink:0;margin-top:1px"></i><p>${p.consejo}</p></div>
      <button class="pl-btn-regen" onclick="planEdit()">↺ Editar datos y regenerar</button>
      <div style="font-family:var(--font-title);font-size:10px;font-weight:700;letter-spacing:2px;color:var(--t3);text-transform:uppercase;margin-bottom:10px">Este mes</div>
      <div class="pl-mc" onclick="_pOpenMonth(null)">
        <div class="pl-mc-top"><div><div class="pl-mc-name">${mnC}</div><div class="pl-mc-phrase">${phrase}</div></div><div class="pl-phase-badge">${phase} de mes</div></div>
        <div class="pl-mc-bar-wr"><div class="pl-mc-bar-fill" style="width:${monthPct}%"></div></div>
        <div class="pl-mc-bar-lbl"><span>Día ${dayOfMonth}</span><span>Día ${daysInMonth}</span></div>
        <div class="pl-mc-cta"><div class="pl-hdots">${hdots}</div><button class="pl-cta-btn">Ver cómo vas</button></div>
      </div>
      <div style="font-family:var(--font-title);font-size:10px;font-weight:700;letter-spacing:2px;color:var(--t3);text-transform:uppercase;margin:16px 0 0">Meses anteriores</div>
      <div class="pl-past-card">
        <div class="pl-past-hd" onclick="_pTogglePast()"><h3>Historial</h3><span class="pl-chevron${_planPastOpen?' open':''}" id="pl-chevron">▾</span></div>
        ${_planPastOpen?(pm.length?`<div class="pl-past-list">${pm.map((m,i)=>`
          <div class="pl-past-item" onclick="_pOpenMonth(${i})">
            <div class="pl-past-sd ${m.status}"></div>
            <div class="pl-past-content"><h4>${m.month}</h4><p>${m.summary}</p></div>
            <div class="pl-past-badge ${m.status}">${m.status==='bien'?'✓ Bien':m.status==='riesgo'?'⚠ Riesgo':'✗ Difícil'}</div>
          </div>`).join('')}</div>`:`<div style="padding:16px 4px;font-size:13px;color:var(--t3);text-align:center">Aún no tienes historial. Empieza a registrar tus hormis para ver tu progreso.</div>`):''}
      </div>
    </div>`;
  if(window.lucide)lucide.createIcons();
}

function _pHSt(){
  const ms=new Date().toISOString().slice(0,7);
  const txs=D.transactions.filter(t=>t.date.startsWith(ms)&&t.isHormi);
  const avg=txs.length?txs.reduce((s,t)=>s+t.amount,0)/new Date().getDate():0;
  const b=D.budget||30;
  return avg<=b*0.8?'bien':avg<=b*1.1?'riesgo':'mal';
}

function _pHDots(){
  const ms=new Date().toISOString().slice(0,7);
  const txs=D.transactions.filter(t=>t.date.startsWith(ms)&&t.isHormi);
  const byDay={};txs.forEach(t=>{byDay[t.date]=(byDay[t.date]||0)+t.amount;});
  const b=D.budget||30;
  const vals=Object.values(byDay).slice(0,5);
  if(!vals.length)return'<div class="pl-hdot" style="background:var(--s2)"></div>'.repeat(5);
  return vals.map(a=>`<div class="pl-hdot" style="background:${a>b?'var(--red)':a>b*.7?'#F0C040':'var(--lime)'}"></div>`).join('');
}

function _pPastM(){
  const today=new Date();
  const months=[];
  for(let i=1;i<=12&&months.length<3;i++){
    const d=new Date(today.getFullYear(),today.getMonth()-i,1);
    const ms=d.toISOString().slice(0,7);
    const allTxs=D.transactions.filter(t=>t.date&&t.date.startsWith(ms));
    if(!allTxs.length)continue;
    const txs=allTxs.filter(t=>t.isHormi);
    const mn=d.toLocaleString('es-PE',{month:'long'});
    const mnC=mn.charAt(0).toUpperCase()+mn.slice(1);
    const dim=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
    const total=txs.reduce((s,t)=>s+t.amount,0);
    const avgD=total/dim;
    const b=D.budget||30;
    const byDay={};txs.forEach(t=>{byDay[t.date]=(byDay[t.date]||0)+t.amount;});
    const over=Object.values(byDay).filter(a=>a>b).length;
    const ok=Object.values(byDay).filter(a=>a<=b).length;
    const st=avgD<=b*.85?'bien':avgD<=b*1.15?'riesgo':'mal';
    months.push({month:mnC,status:st,summary:st==='bien'?`Mes sólido. Límite respetado ${ok} de ${dim} días.`:st==='riesgo'?`${over} días sobre el límite. Cerraste cerca.`:`Mes difícil. ${over} días sobre el límite.`,daysOk:ok,daysOver:over,totalDays:dim,txs,hormis:_pTopH(txs)});
  }
  return months;
}

function _pTopH(txs){
  const by={};
  txs.forEach(t=>{const k=t.description||'Otro';if(!by[k])by[k]={total:0,count:0,firstTx:t};by[k].total+=t.amount;by[k].count++;});
  return Object.entries(by).sort((a,b)=>b[1].total-a[1].total).slice(0,3).map(([name,d])=>{
    const ci=d.firstTx?.category||'other';
    const cm=allCats().find(c=>c.id===ci)||CATS[14];
    return {name,total:d.total,count:d.count,impact:d.total>150?'alto':'medio',emoji:cm.e,catName:capFirst(cm.l),detail:`Aparece ${d.count} veces este mes.`,alternatives:['Evalúa si puedes reducir esta categoría','Busca alternativas más económicas']};
  });
}

function _pTogglePast(){
  _planPastOpen=!_planPastOpen;
  if(D.planOutput)_pRenderOut(D.planOutput);
}

function _pOpenMonth(idx){
  const existing=document.getElementById('pl-ov');if(existing)existing.remove();
  const ov=document.createElement('div');ov.className='pl-overlay';ov.id='pl-ov';
  const today=new Date();
  let month,byDay={},hormis=[],dim=0;
  if(idx===null){
    const ms=today.toISOString().slice(0,7);
    const txs=D.transactions.filter(t=>t.date.startsWith(ms)&&t.isHormi);
    const mn=today.toLocaleString('es-PE',{month:'long'});
    dim=new Date(today.getFullYear(),today.getMonth()+1,0).getDate();
    txs.forEach(t=>{byDay[t.date]=(byDay[t.date]||0)+t.amount;});
    hormis=_pTopH(txs);
    month={month:mn.charAt(0).toUpperCase()+mn.slice(1),status:_pHSt()};
  }else{
    const m=_planCachedPastMonths[idx];if(!m)return;
    dim=m.totalDays;
    m.txs.forEach(t=>{byDay[t.date]=(byDay[t.date]||0)+t.amount;});
    hormis=m.hormis;month=m;
  }
  const bud=D.budget||30;
  const activeDays=idx===null?today.getDate():dim;
  let gridHTML='';
  for(let d=1;d<=dim;d++){
    const k=Object.keys(byDay).find(dt=>parseInt(dt.slice(-2))===d);
    const amt=k?byDay[k]:0;
    const cls=d>activeDays?'future':amt>bud?'over':amt>0?'ok':'future';
    gridHTML+=`<div class="pl-ddot ${cls}"></div>`;
  }
  const hRows=hormis.length?hormis.map((h,i)=>`
    <div class="pl-hormi-row" onclick="_pOpenHormi(${idx},${i})">
      <span class="pl-h-emoji">${h.emoji}</span>
      <div class="pl-h-info"><h4>${h.name}</h4><p>${h.count} veces · ${_pFmt(h.total)}</p></div>
      <span class="pl-impact ${h.impact}">${h.impact==='alto'?'Alto':'Medio'}</span>
    </div>`).join(''):`<div style="font-size:13px;color:var(--t3);padding:14px 0">Sin datos de hormis este mes</div>`;
  ov.innerHTML=`
    <div class="pl-ov-handle"></div>
    <div class="pl-ov-hd"><button class="pl-ov-back" onclick="document.getElementById('pl-ov').remove()">←</button><h2>${month.month}</h2></div>
    <div style="padding:20px 20px 0">
      <div style="font-family:var(--font-title);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:12px">Progreso del mes</div>
      <div class="pl-day-grid">${gridHTML}</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t3)"><div style="width:8px;height:8px;border-radius:3px;background:var(--lime)"></div>Dentro del límite</div>
        <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t3)"><div style="width:8px;height:8px;border-radius:3px;background:var(--red);opacity:.7"></div>Sobre el límite</div>
        <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--t3)"><div style="width:8px;height:8px;border-radius:3px;background:var(--s2)"></div>Sin datos</div>
      </div>
      <div style="font-family:var(--font-title);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--t3);margin-bottom:8px">Principales hormis</div>
      <div id="hormi-cat-list"></div>
    </div>`;
  document.body.appendChild(ov);
  renderHormiCategories();
}

function _pOpenHormi(monthIdx,hormiIdx){
  const existing=document.getElementById('pl-ov2');if(existing)existing.remove();
  let h,hormiTxs=[];
  if(monthIdx===null){
    const ms=new Date().toISOString().slice(0,7);
    const txs=D.transactions.filter(t=>t.date&&t.date.startsWith(ms)&&t.isHormi);
    h=_pTopH(txs)[hormiIdx];
    if(!h)return;
    hormiTxs=txs.filter(t=>(t.description||'Otro')===h.name);
  }else{
    h=_planCachedPastMonths[monthIdx]?.hormis[hormiIdx];
    if(!h)return;
    hormiTxs=(_planCachedPastMonths[monthIdx]?.txs||[]).filter(t=>(t.description||'Otro')===h.name);
  }
  const ci=hormiTxs[0]?.category||'other';
  const cm=allCats().find(c=>c.id===ci)||CATS[14];
  const hp=calcHoraPico(hormiTxs);
  const dp=calcDiaPico(hormiTxs);
  h.catName=h.catName||capFirst(cm.l);
  h.time=hp!==null?String(hp).padStart(2,'0')+':00':null;
  h.day=dp||null;
  const ov2=document.createElement('div');ov2.className='pl-overlay';ov2.id='pl-ov2';
  ov2.innerHTML=`
  <div class="pl-ov-handle"></div>
  <div class="pl-ov-hd">
    <button class="pl-ov-back" onclick="document.getElementById('pl-ov2').remove()">←</button>
    <h2>Detalle de hormi</h2>
  </div>
  <div style="margin:14px 20px 0;background:#1a2e2a;border-radius:18px;padding:18px">
    <span style="font-size:44px;display:block;margin-bottom:8px">${h.emoji}</span>
    <span style="font-size:11px;color:rgba(255,255,255,0.5);display:block;margin-bottom:4px">${h.catName||''}</span>
    <h2 style="font-family:var(--font-title);font-size:22px;font-weight:800;color:#fff;margin-bottom:6px">${h.name}</h2>
    <p style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.5">${h.detail}</p>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 20px 0">
    <div style="background:#F2F2F2;border-radius:14px;padding:14px">
      <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#888;margin-bottom:5px">Total gastado</div>
      <div style="font-size:22px;font-weight:800;color:#0A0A0A;line-height:1">${_pFmt(h.total)}</div>
      <div style="font-size:11px;color:#888;margin-top:3px">este mes</div>
    </div>
    <div style="background:#F2F2F2;border-radius:14px;padding:14px">
      <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#888;margin-bottom:5px">Veces que apareció</div>
      <div style="font-size:22px;font-weight:800;color:#0A0A0A;line-height:1">${h.count}x</div>
      <div style="font-size:11px;color:#888;margin-top:3px">este mes</div>
    </div>
    <div style="background:#F2F2F2;border-radius:14px;padding:14px">
      <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#888;margin-bottom:5px">Hora pico</div>
      <div style="font-size:15px;font-weight:800;color:#0A0A0A;line-height:1">${h.time||'–'}</div>
      <div style="font-size:11px;color:#888;margin-top:3px">más probable</div>
    </div>
    <div style="background:#F2F2F2;border-radius:14px;padding:14px">
      <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#888;margin-bottom:5px">Día pico</div>
      <div style="font-size:15px;font-weight:800;color:#0A0A0A;line-height:1">${h.day||'–'}</div>
      <div style="font-size:11px;color:#888;margin-top:3px">cuando más ocurre</div>
    </div>
  </div>
  <div style="margin:10px 20px 0;background:#F7F7F7;border-radius:14px;padding:14px">
    <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#888;margin-bottom:6px">💡 Insight</div>
    <p style="font-size:13px;color:#0A0A0A;line-height:1.5">${h.detail}</p>
  </div>
  <div style="margin:12px 20px 24px">
    <div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#888;margin-bottom:8px">Alternativas para ti</div>
    ${h.alternatives.map(a=>`
      <div style="background:#F2F2F2;border-radius:12px;padding:12px 14px;margin-bottom:7px;display:flex;gap:10px;align-items:flex-start">
        <span style="font-size:15px;flex-shrink:0">🎯</span>
        <p style="font-size:13px;color:#0A0A0A;line-height:1.4">${a}</p>
      </div>`).join('')}
  </div>`;
  document.body.appendChild(ov2);
}

function _pChk(key){
  _planChecked[key]=!_planChecked[key];
  const el=document.querySelector(`[onclick="_pChk('${key}')"]`);if(!el)return;
  el.querySelector('.pl-wchk')?.classList.toggle('on',_planChecked[key]);
  el.querySelector('p')?.classList.toggle('done',_planChecked[key]);
}

function _pApply(limit){
  D.budget=Math.max(1,Math.round(limit*10)/10);
  save();saveUserData();_planLimitApplied=true;
  const btn=document.querySelector('.pl-btn-apply');
  if(btn){btn.textContent='✓ Aplicado';btn.classList.add('applied');}
  toast('Límite diario actualizado a S/'+D.budget,'ok');
}

function planApplyLimit(limit){_pApply(limit);}

// Calcula el gasto promedio mensual en hormis (últimos 30 días de transacciones)
function _pHormisPromedio(){
  const txs=D.transactions||[];
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-30);
  const cutoffStr=cutoff.toISOString().slice(0,10);
  const h30=txs.filter(t=>t.isHormi&&!t.isDraft&&t.date>=cutoffStr);
  if(!h30.length)return(D.budget||30)*30;
  return h30.reduce((s,t)=>s+t.amount,0);
}

// Devuelve la categoría hormi con más gasto en los últimos 30 días, o null si <14 días de datos
function _pTopCategory(){
  const txs=D.transactions||[];
  const uniqueDays=[...new Set(txs.filter(t=>!t.isDraft).map(t=>t.date))];
  if(uniqueDays.length<14)return null;
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-30);
  const cutoffStr=cutoff.toISOString().slice(0,10);
  const recent=txs.filter(t=>!t.isDraft&&t.isHormi&&t.date>=cutoffStr);
  const bycat={};
  recent.forEach(t=>{if(!bycat[t.category])bycat[t.category]=0;bycat[t.category]+=t.amount;});
  let topId=null,topAmt=0;
  Object.entries(bycat).forEach(([id,amt])=>{if(amt>topAmt){topAmt=amt;topId=id;}});
  if(!topId)return null;
  const cat=(typeof CATS!=='undefined'?CATS:[]).find(c=>c.id===topId);
  const label=cat?cat.l.charAt(0).toUpperCase()+cat.l.slice(1):topId;
  return{id:topId,label,totalMonth:topAmt};
}

// Selecciona una opción en Caso 3
function _pSelectOpt(letter){
  _planSelectedOpt=letter;
  document.querySelectorAll('.pl-opt-card').forEach((el,i)=>{
    el.classList.toggle('selected',['A','B','C'][i]===letter);
  });
  const btn=document.getElementById('pl-apply-opt-btn');
  if(btn){btn.disabled=false;}
}

// Aplica la opción seleccionada en Caso 3
function _pApplyOpt(){
  const p=D.planOutput;
  if(!p||!_planSelectedOpt)return;
  if(_planSelectedOpt==='A'){
    _planFD.meses=p.mesesNecesarios;
    toast('Plazo extendido a '+p.mesesNecesarios+' meses','ok');
    planGenerate();
  } else if(_planSelectedOpt==='B'){
    _planFD.metaTotal=p.metaAlcanzable;
    toast('Meta ajustada a '+_pFmt(p.metaAlcanzable),'ok');
    planGenerate();
  } else if(_planSelectedOpt==='C'&&p.topCat){
    const savingExtra=Math.round(p.topCat.totalMonth*0.4);
    const newFlujo=(p.flujoLibre||0)+savingExtra;
    const newDaily=Math.max(1,Math.floor((newFlujo-(p.ahorroMensualNecesario||0))/30));
    _pApply(newDaily);
    _pRenderOut(D.planOutput);
  }
}

function planEdit(){
  D.planOutput=null;save();
  _planStage=1;_planPastOpen=false;_planChecked={};_planLimitApplied=false;
  _pWizard(1);
}

// Legacy aliases (keep for any old references)
function planShowStage(n){_pWizard(n);}
function planShowOutput(p){_pRenderOut(p);}

// (old plan stubs removed — replaced by _pWizard/_pRenderOut above)

function guessCat(desc){
  const d=desc.toLowerCase();
  if(/café|coffee|starbucks|bembos|kfc|mc|burger|pizza|sushi|restaur|almuerzo|comida|chifa|pollo|menú/.test(d))return CATS.find(c=>c.id==='food');
  if(/bebida|jugo|gaseosa|smoothie|té|limonada/.test(d))return CATS.find(c=>c.id==='drink');
  if(/snack|dulce|galleta|choc|helad|cheesecake|empanada|golos|candy/.test(d))return CATS.find(c=>c.id==='snack');
  if(/rappi|pedidos|ya|delivery|glovo|uber\s*eat/.test(d))return CATS.find(c=>c.id==='del');
  if(/uber|taxi|cabify|bus|transporte|gasolina|tren|metropolitano|linea 1|estación/.test(d))return CATS.find(c=>c.id==='trans');
  if(/netflix|spotify|amazon|prime|disney|youtube|apple|suscri|app/.test(d))return CATS.find(c=>c.id==='subs');
  if(/farmacia|clinica|médico|doctor|salud|medicina|psicolog/.test(d))return CATS.find(c=>c.id==='health');
  if(/salon|peluquería|manicure|pedicure|estétic|beauty|cosmético/.test(d))return CATS.find(c=>c.id==='beauty');
  if(/gimnasio|gym|deporte|voley|natación|entren/.test(d))return CATS.find(c=>c.id==='sport');
  if(/univ|curso|libro|educaci|máster|escuela|taller/.test(d))return CATS.find(c=>c.id==='edu');
  if(/ropa|zapatilla|tienda|saga|ripley|falabella|zara/.test(d))return CATS.find(c=>c.id==='shop');
  if(/bar|cerveza|disco|club|karaoke|tragos/.test(d))return CATS.find(c=>c.id==='soc');
  if(/cine|teatro|concierto|cineplanet|cinemark|entrada/.test(d))return CATS.find(c=>c.id==='enter');
  if(/mercado|supermercado|tottus|wong|\bmetro\b|plaza vea|vivanda|makro|verduler|carnicer|abarrote/.test(d))return CATS.find(c=>c.id==='market');
  return CATS.find(c=>c.id==='other');
}

function jsAttr(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;');}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
// toast() usa innerHTML: todo contenido dinámico (variables, errores
// de API, datos de IA/boletas) DEBE pasar por esc() antes de
// interpolarse. Solo HTML literal escrito aquí en el código puede
// ir sin escapar.
function toast(msg,type='',ms=2600){const el=document.getElementById('toast');el.innerHTML=msg;el.className=`toast show ${type}`;clearTimeout(el._t);el._t=setTimeout(()=>el.className='toast',ms);}

// ── FULLSCREEN IMAGE ──────────────────────────────────────────────────────────
function openFullImg(b64){
  const el=document.getElementById('img-fullscreen');
  const img=document.getElementById('img-fullscreen-img');
  if(!el||!img)return;
  img.src='data:image/jpeg;base64,'+b64;
  el.classList.add('on');
}

// ── VOICE BUBBLE ──────────────────────────────────────────────────────────────
let _voicePending=null;
let _vbRec=null;
let _lugarCache={},_lugarCacheTried=new Set();
let _vbState='idle';
let _vbFinal='';
let _vbInterim='';
let _vbRetries=0;
let _isRecording=false;
const _MIC_SVG=(s)=>`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${s}" stroke-width="2.2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
const _SPIN_SVG=`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="animation:vbSpin .9s linear infinite"><circle cx="12" cy="12" r="10" stroke="#d3e458" stroke-width="2.5" stroke-opacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="#d3e458" stroke-width="2.5" stroke-linecap="round"/></svg>`;

function vbEl(id){return document.getElementById(id);}
function vbSetState(state,data){
  _vbState=state;
  const wrap=vbEl('vb-wrap'),icon=vbEl('vb-icon'),popup=vbEl('vb-popup'),pill=vbEl('vb-pill-text'),acts=vbEl('vb-acts');
  if(!wrap)return;
  wrap.className='';
  if(state!=='idle')wrap.classList.add(state);
  acts.className='';
  pill.className='';
  if(state==='idle'){
    icon.innerHTML=_MIC_SVG('#d3e458');
    popup.style.display='none';
  }else if(state==='recording'){
    icon.innerHTML=_MIC_SVG('#E53935');
    pill.innerHTML='🔴 Grabando... toca para procesar';
    popup.className='on';popup.style.display='';
  }else if(state==='processing'){
    icon.innerHTML=_SPIN_SVG;
    pill.innerHTML='⏳ Entendiendo...';
    popup.className='on';popup.style.display='';
  }else if(state==='result'){
    const low=data.confidence==='low';
    icon.innerHTML=`<span style="color:#d3e458;font-size:20px;font-weight:700;line-height:1">✓</span>`;
    pill.className=low?'low':'';
    pill.innerHTML=`✓ S/ ${data.amt.toFixed(2)} — ${data.desc||'gasto'}${low?' · <span style="font-weight:400">¿Es correcto?</span>':''}`;
    popup.className='on';popup.style.display='';
    acts.className='on';
  }else if(state==='error'){
    icon.innerHTML=`<span style="color:#E53935;font-size:20px;font-weight:700;line-height:1">✗</span>`;
    pill.className='err';
    pill.textContent=data||'No entendí — intenta de nuevo';
    popup.className='on';popup.style.display='';
    setTimeout(()=>{if(_vbState==='error')vbSetState('idle');},2500);
  }
}
function vbUpdatePillLive(text){
  const pill=vbEl('vb-pill-text');
  if(!pill||_vbState!=='recording')return;
  if(!text){pill.innerHTML='🔴 Grabando... toca para procesar';return;}
  const highlighted=text.replace(/(\d+(?:[.,]\d{1,2})?)/g,'<span style="color:#d3e458;font-weight:700">$1</span>');
  pill.innerHTML=highlighted;
}
function vbTap(){
  if(_vbState==='idle')vbStartRecording();
  else if(_vbState==='recording')vbStopManual();
  // result/processing/error: ignore tap
}
let _voiceTimeout=null;
function vbStartRecording(){
  if(!isPro()){requirePro('voz',null);return;}
  if(_vbState==='recording')return;
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('Voz no disponible en este navegador','err');return;}
  if(_vbRec){try{_vbRec.abort();}catch(x){}_vbRec=null;}
  _vbFinal='';_vbInterim='';_vbRetries=0;_isRecording=true;
  vbSetState('recording');
  const rec=new SR();
  _vbRec=rec;
  rec.lang='es-PE';
  rec.continuous=false;
  rec.interimResults=true;
  rec.maxAlternatives=5;
  rec.onresult=(ev)=>{
    console.log('VOZ onresult - resultados:',ev.results.length);
    let final='',interim='';
    for(let i=ev.resultIndex;i<ev.results.length;i++){
      const t=ev.results[i][0].transcript;
      if(ev.results[i].isFinal)final+=t; else interim+=t;
    }
    if(final)_vbFinal+=final;
    _vbInterim=interim;
  };
  rec.onerror=(ev)=>{
    clearTimeout(_voiceTimeout);_voiceTimeout=null;
    _isRecording=false;_vbRec=null;
    if(ev.error==='aborted')return;
    vbSetState('idle');
    toast('Error de micrófono: '+ev.error,'warn');
  };
  rec.onend=()=>{
    console.log('VOZ onend - estado:',_vbState,'final:',_vbFinal,'interim:',_vbInterim);
    clearTimeout(_voiceTimeout);_voiceTimeout=null;
    _isRecording=false;_vbRec=null;
    const text=(_vbFinal+' '+_vbInterim).trim();
    // si el usuario canceló explícitamente, no procesar
    if(_vbState==='idle'||_vbState==='error'){return;}
    if(text){
      vbSetState('processing');
      vbCallAI(text);
      return;
    }
    // sin texto: un solo reintento, y SOLO si seguimos en recording
    if(_vbState==='recording'&&_vbRetries<1){
      _vbRetries++;
      setTimeout(()=>{if(_vbState==='recording')vbStartRecording();},400);
      return;
    }
    // cualquier otro caso: volver a idle SIEMPRE (nunca colgar)
    _vbRetries=0;
    vbSetState('idle');
    toast('No se detectó audio. Intenta de nuevo hablando más cerca.','warn');
  };
  _voiceTimeout=setTimeout(()=>{
    if(_isRecording&&_vbRec){try{_vbRec.stop();}catch(x){}}
  },15000);
  try{rec.start();}catch(x){
    clearTimeout(_voiceTimeout);_voiceTimeout=null;
    _vbRec=null;vbSetState('error','No se pudo iniciar el micrófono');
  }
}
function vbStopManual(){
  console.log('VOZ stop manual - rec existe:',!!_vbRec,'estado:',_vbState);
  const recAtStop=_vbRec;
  if(!recAtStop){vbSetState('idle');return;}
  try{recAtStop.stop();}catch(x){}
  setTimeout(()=>{
    // solo actúa si SIGUE siendo la misma instancia de grabación
    // (si _vbRec cambió, es una grabación nueva — no tocarla)
    if(_vbState==='recording'&&_vbRec===recAtStop){
      const text=(_vbFinal+' '+_vbInterim).trim();
      _isRecording=false;
      try{recAtStop.abort();}catch(x){}
      _vbRec=null;
      if(text){vbSetState('processing');vbCallAI(text);}
      else{vbSetState('idle');toast('No se detectó audio','warn');}
    }
  },3000);
}
async function vbCallAI(voiceText){
  try{
    const voicePrompt=`Un usuario peruano dictó por voz un gasto. La transcripción automática puede tener ERRORES DE RECONOCIMIENTO — tu trabajo es interpretar qué quiso decir realmente.

Transcripción: "${voiceText}"

CORRECCIÓN DE TRANSCRIPCIÓN:
- Los nombres de productos peruanos suelen transcribirse mal. Ejemplos del tipo de error: "junior"→"chuño", "mai cena"→"maicena", "papa yuca"→"papa/yuca". Usa tu conocimiento de productos peruanos para corregir.
- Los nombres de comercios peruanos también: si suena parecido a una cadena conocida (Tottus, Wong, Metro, Plaza Vea, Vivanda, Tambo, Oxxo, Starbucks, Bembos, KFC, Juan Valdez, Inkafarma, Mifarma), corrige al nombre real más probable según el contexto del producto. Ojo: si el producto es de supermercado (abarrotes, verduras), es más probable un supermercado que una cafetería.
- Si el usuario dice un lugar genérico ("bodega", "la tienda", "el mercado"), déjalo tal cual — no inventes una cadena.
- BEBIDAS DE CAFETERÍA: el reconocimiento de voz en español suele fallar con términos de cafetería modernos. Si el contexto es una bebida y la transcripción suena rara, considera estas posibilidades frecuentes: 'chocolatada'/'macha'/'shake'/'marcha' pueden ser MATCHA; 'late'/'latte'; 'frappe'/'frapé'; 'capuchino'/'cappuccino'; 'cold brew'/'cold bru'. Si el usuario menciona un sabor + una palabra rara + 'latte' o 'shake', es muy probable que sea una bebida de cafetería con ese sabor. Prioriza la interpretación más común en cafeterías peruanas.

EXTRAE:
- monto: número en soles
- consumo: el producto o servicio, ya CORREGIDO y escrito correctamente en español
- lugar: el comercio, ya CORREGIDO, o null si no lo mencionó
- categoria: UNO de estos IDs, decidido por QUÉ ES el producto (no dónde se compró):
  food (comida preparada, platos, menús) · drink (cualquier bebida: café, capuchino, jugo, gaseosa) · snack (dulces, galletas, postres, golosinas) · market (insumos crudos y de despensa: azúcar, arroz, harina, maicena, chuño, verduras, carnes, limpieza) · trans (taxi, bus, combustible) · subs (apps, suscripciones) · health (medicinas, farmacia) · beauty (perfumes, cosméticos, cuidado personal, peluquería) · sport (gimnasio, deporte) · edu (libros, cursos) · shop (ropa, calzado, accesorios) · soc (bares, salidas) · enter (cine, conciertos) · del (delivery) · other (SOLO si nada aplica)

REGLA: 'other' es el último recurso. Un perfume es beauty. Un capuchino es drink. La maicena y el azúcar son market. Si identificas el producto, tiene categoría.

Responde SOLO JSON sin markdown:
{"monto":0.00,"consumo":"...","lugar":"..." o null,"categoria":"ID"}
Si no hay monto claro: {"error":"no_amount"}`;
    const{data:{session:_ss4}}=await _sb.auth.getSession();
    const resp=await fetch(SCAN_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${_ss4?.access_token||''}`},body:JSON.stringify({prompt:voicePrompt})});
    if(!resp.ok)throw new Error('HTTP '+resp.status);
    const data=await resp.json();
    if(data.error==='no_amount'||data.error){
      vbSetState('error','No entendí el monto — intenta de nuevo');
    }else if(data.monto>0){
      const consumo=data.consumo||'';
      const lugar=data.lugar||null;
      const catId=data.categoria;
      const cat=(catId&&allCats().find(c=>c.id===catId))||guessCat(consumo||'');
      _voicePending=null;
      vbSetState('idle');
      closeOv('sh-fab');
      fabReset();
      _txSource='voice';
      _voiceMode=true;   // marca que venimos de voz, para el botón regrabar
      previewBeforeSave({monto:data.monto,consumo,lugar,catId:cat.id,fecha:_selDay||td()});
    }else{
      vbSetState('error','No entendí el monto — intenta de nuevo');
    }
  }catch(e){
    vbSetState('error','Error de conexión — intenta de nuevo');
  }
}
function previewBeforeSave(txData){
  openAddSheet(txData.fecha||_selDay||td());
  _scanState='ready';
  setTimeout(()=>{
    if(txData.monto)document.getElementById('a-amt').value=txData.monto;
    if(txData.consumo)document.getElementById('tx-consumo').value=txData.consumo;
    if(txData.lugar)document.getElementById('tx-lugar').value=txData.lugar;
    if(txData.fecha)document.getElementById('a-date').value=txData.fecha;
    if(txData.catId)selAddCat(txData.catId);
    if(txData.monto){aHormi=txData.monto<=D.threshold;document.getElementById('h-pill').classList.toggle('on',aHormi);}
    const cb=document.getElementById('scan-confirm-banner');if(cb)cb.style.display='';
    syncHeaderButtons();
  },80);
}
function vbSave(){
  if(!_voicePending)return;
  const {amt,consumo,lugar,cat}=_voicePending;
  closeOv('sh-fab');fabReset();
  _voicePending=null;vbSetState('idle');
  _txSource='voice';
  previewBeforeSave({monto:amt,consumo,lugar,catId:cat.id,fecha:_selDay||td()});
}
function vbCancel(){
  _voicePending=null;
  if(_vbRec){try{_vbRec.stop();}catch(x){}_vbRec=null;}
  vbSetState('idle');
  fabReset();
}
function vbRetry(){
  _voicePending=null;
  _vbFinal='';_vbInterim='';_vbRetries=0;
  vbSetState('idle');
  setTimeout(()=>vbStartRecording(),150);
}
function vbRetryFromForm(){
  _voiceMode=false;
  _scanState='idle';
  discardScan();          // limpia el formulario
  closeOv('sh-add');
  openSheet('sh-fab');
  setTimeout(()=>{
    openFabVoice();
    setTimeout(()=>vbStartRecording(),200);
  },250);
}
function fabReset(){
  const opts=document.getElementById('sh-fab-opts');
  const voice=document.getElementById('sh-fab-voice');
  const title=document.getElementById('sh-fab-title');
  if(opts)opts.style.display='';
  if(voice)voice.style.display='none';
  if(title)title.textContent='Agregar gasto';
}
function openFabVoice(){
  const opts=document.getElementById('sh-fab-opts');
  const voice=document.getElementById('sh-fab-voice');
  const title=document.getElementById('sh-fab-title');
  if(opts)opts.style.display='none';
  if(title)title.textContent='registro por voz';
  if(voice){voice.style.display='flex';voice.style.flexDirection='column';voice.style.alignItems='center';}
  vbSetState('idle');
}
function closeFabSheet(){if(_vbRec){try{_vbRec.stop();}catch(x){}_vbRec=null;}vbSetState('idle');closeOv('sh-fab');fabReset();}
function fabMaybeClose(e){if(e.target===e.currentTarget){closeOv('sh-fab');if(_vbRec){try{_vbRec.stop();}catch(x){}_vbRec=null;}vbSetState('idle');fabReset();}}
// Legacy compat
function startVoiceBubble(){openSheet('sh-fab');setTimeout(openFabVoice,300);}
function voiceConfirmYes(){vbSave();}
function voiceConfirmNo(){vbCancel();}
function startVoice(){startVoiceBubble();}

// ── S-UPGRADE JS ──────────────────────────────────────────────────────────────
let _upgradeSlide=0;
function updateTrialButton(){
  const btn=document.getElementById('btn-start-trial-main');
  if(!btn)return;
  const yaActivoTrial=D.trialUsed===true||(D.trialStart!==null&&D.trialStart!==undefined);
  if(yaActivoTrial){
    btn.textContent='Hazte PRO ahora';
    btn.style.background='#407178';
    btn.style.color='#fff';
    btn.onclick=function(){
      const labels={mensual:'Mensual a S/ 15.90/mes',trimestral:'3 Meses a S/ 38.90',anual:'Anual a S/ 130.90'};
      const msg=encodeURIComponent('Hola, quiero adquirir HORMI Pro 🐜 Plan: '+(labels[_selectedPlan]||labels.mensual));
      window.open(`https://wa.me/51970300434?text=${msg}`,'_blank');
    };
    const sub=document.getElementById('upgrade-cta-sub');
    if(sub)sub.style.display='none';
  }else{
    btn.textContent='Hazte PRO ahora';
    btn.style.background='';
    btn.style.color='';
    btn.onclick=goToPurchaseNew;
    const sub=document.getElementById('upgrade-cta-sub');
    if(sub)sub.style.display='';
  }
}
function openUpgrade(){
  if(!D.trialStart&&!D.trialUsed){openSheet('sh-trial');return;}
  const su=document.getElementById('s-upgrade');su.style.display='';su.style.opacity='';su.style.pointerEvents='';su.classList.add('on');
  if(!_selectedPlan)_selectedPlan='trimestral';
  renderUpgradePlansNew();
  updateTrialButton();
  _upgradeSlide=0;updateUpgradeSlide();
  initUpgradeSwipe();
}
function closeUpgrade(){const el=document.getElementById('s-upgrade');el.style.display='none';el.style.opacity='0';el.style.pointerEvents='none';el.classList.remove('on');}
let _upgradeSwipeX=0,_upgradeSwipeBound=false;
function initUpgradeSwipe(){
  if(_upgradeSwipeBound)return;_upgradeSwipeBound=true;
  const el=document.getElementById('upgrade-slides');
  if(!el)return;
  el.addEventListener('touchstart',e=>{_upgradeSwipeX=e.touches[0].clientX;},{passive:true});
  el.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-_upgradeSwipeX;
    if(Math.abs(dx)>42){if(dx<0&&_upgradeSlide<4)_upgradeSlide++;else if(dx>0&&_upgradeSlide>0)_upgradeSlide--;}
    updateUpgradeSlide();
  },{passive:true});
}
function setUpgradeSlide(i){_upgradeSlide=i;updateUpgradeSlide();}
function updateUpgradeSlide(){
  const slides=document.getElementById('upgrade-slides');
  if(slides)slides.style.transform=`translateX(-${_upgradeSlide*100}%)`;
  document.querySelectorAll('#upgrade-dots .upgrade-dot').forEach((d,i)=>d.classList.toggle('on',i===_upgradeSlide));
}
const PLANS_NEW=[
  {k:'mensual',nm:'Mensual',old:'S/ 19.90',price:'S/ 15.90',sub:'/mes',badge:null},
  {k:'trimestral',nm:'3 Meses',old:'S/ 49.90',price:'S/ 38.90',sub:'(S/ 12.90/mes)',badge:'ahorra 19%'},
  {k:'anual',nm:'Anual',old:'S/ 149',price:'S/ 130.90',sub:'(S/ 10.90/mes)',badge:'⭐ más popular'}
];
function renderUpgradePlansNew(){
  const el=document.getElementById('upgrade-plans-new');if(!el)return;
  el.innerHTML=PLANS_NEW.map(p=>`
    <div class="upgrade-plan${_selectedPlan===p.k?' sel':''}" onclick="selPlanNew('${p.k}')">
      ${p.badge?`<div class="up-plan-badge">${p.badge}</div>`:''}
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><div class="up-plan-nm">${p.nm}</div><div class="up-plan-sub">${p.sub}</div></div>
        <div style="text-align:right"><div class="up-plan-old">${p.old}</div><div class="up-plan-price">${p.price}</div></div>
      </div>
    </div>`).join('');
}
function selPlanNew(k){_selectedPlan=k;renderUpgradePlansNew();}
function goToPurchaseNew(){
  const labels={mensual:'Mensual a S/ 15.90/mes',trimestral:'3 Meses a S/ 38.90',anual:'Anual a S/ 130.90'};
  window.open(`https://wa.me/51970300434?text=${encodeURIComponent('Hola, quiero adquirir HORMI Pro 🐜 Plan: '+(labels[_selectedPlan]||labels.mensual))}`,'_blank');
}

// ── ACTIVATION CODE (#1) ──────────────────────────────────────────────────────
function showConfetti(){
  const colors=['#d3e458','#080808','#E53935','#D97706','#1565C0','#2E7D32','#9C27B0'];
  for(let i=0;i<55;i++){
    const el=document.createElement('div');
    const sz=5+Math.random()*9;
    el.style.cssText=`position:fixed;top:-12px;left:${Math.random()*100}%;width:${sz}px;height:${sz}px;border-radius:${Math.random()>.5?'50%':'3px'};background:${colors[Math.floor(Math.random()*colors.length)]};pointer-events:none;z-index:9999;animation:confetti-fall ${1.8+Math.random()*1.6}s ease-in forwards;animation-delay:${Math.random()*0.7}s`;
    document.body.appendChild(el);setTimeout(()=>el.remove(),4000);
  }
}
function activateProCode(){
  const input=document.getElementById('pro-code-in');if(!input)return;
  const code=input.value.trim().toUpperCase();
  if(!code.startsWith('HORMI')){toast('Código inválido — debe empezar con HORMI','err');return;}
  if(code.length<8){toast('Código muy corto (mínimo 8 caracteres)','err');return;}
  const numPart=code.slice(-3);
  const num=parseInt(numPart);
  if(isNaN(num)||num<100||num>999){toast('Código inválido — debe terminar en 3 dígitos (100-999)','err');return;}
  D.isPro=true;D.proCode=code;D.proSince=td();save();saveUserData();
  input.value='';
  showConfetti();
  toast('🎉 ¡Bienvenida a HORMI Pro!','ok');
  setTimeout(()=>renderSet(),400);
}

// ── TOOLTIPS (#12) ────────────────────────────────────────────────────────────
const TOOLTIPS=[
  {id:'bc',text:'Este es tu semáforo diario 🚦 Verde = bien, amarillo = cuidado, rojo = límite superado',cls:'at',left:24,top:0},
  {id:'wk',text:'Toca cualquier día para ver o agregar gastos de esa fecha',cls:'at',left:24,top:0},
  {id:'fab',text:'Registra un gasto: manualmente, escaneando un voucher, o por voz',cls:'ab',left:120,bottom:0},
  {id:'stats',text:'Aquí ves en qué se va tu plata y cuánto podrías ahorrar reduciendo tus hormis',cls:'at',left:24,top:0},
  {id:'goals',text:'Una meta = elegir una hormiga y ponerle un límite mensual. HORMI trackea automáticamente',cls:'at',left:24,top:0},
];
let _tooltipQueue=[];
function initTooltips(){
  if(!D.tooltipsSeen)D.tooltipsSeen=[];
  _tooltipQueue=TOOLTIPS.filter(t=>!D.tooltipsSeen.includes(t.id));
  showNextTooltip();
}
function showNextTooltip(){
  if(!_tooltipQueue.length){document.getElementById('tooltip-ov').classList.remove('on');return;}
  const t=_tooltipQueue[0];
  const targetEl=document.getElementById(t.id==='bc'?'bc':t.id==='wk'?'wk-row':t.id==='fab'?'n-home':t.id==='stats'?'n-stats':'n-goals');
  const pop=document.getElementById('tooltip-pop');
  const textEl=document.getElementById('tooltip-text');
  if(!pop||!textEl)return;
  textEl.textContent=t.text;
  pop.className=`tooltip-pop ${t.cls}`;
  if(targetEl){
    const r=targetEl.getBoundingClientRect();
    const appR=document.getElementById('app').getBoundingClientRect();
    if(t.cls==='at'){pop.style.top=(r.bottom-appR.top+10)+'px';pop.style.bottom='auto';}
    else{pop.style.bottom=(appR.bottom-r.top+10)+'px';pop.style.top='auto';}
    pop.style.left=Math.min(t.left,appR.width-270)+'px';
  }
  document.getElementById('tooltip-ov').classList.add('on');
}
function dismissTooltip(){
  if(!_tooltipQueue.length)return;
  const t=_tooltipQueue.shift();
  if(!D.tooltipsSeen.includes(t.id))D.tooltipsSeen.push(t.id);
  save();
  showNextTooltip();
}

// ── GOALS MULTI-SELECT (#15) ──────────────────────────────────────────────────
let mgSelectedHormis={};
let mgSelectedCats={};
function buildMgChipsMulti(){
  const el=document.getElementById('mg-chips');if(!el)return;
  const items=D.hormis.length?[...D.hormis]:[];
  el.innerHTML=items.map(h=>`<div class="chip${mgSelectedHormis[h]!==undefined?' on':''}" onclick="togMgHormi('${h.replace(/'/g,"\\'")}')">${h}</div>`).join('')
    +`<div class="chip" onclick="addMgHormiNew()" style="border-style:dashed">＋ nueva hormiga</div>`;
  buildMgCatGrid();
  renderMgInputs();
}
function buildMgCatGrid(){
  const el=document.getElementById('mg-cats');if(!el)return;
  const cats=allCats();
  el.innerHTML=cats.map(c=>`<button class="eb${mgSelectedCats[c.id]!==undefined?' on':''}" onclick="togMgCat('${c.id}')" style="min-width:60px"><div class="eb-e">${c.e}</div><div class="eb-nm">${c.l}</div></button>`).join('');
}
function togMgCat(catId){
  if(mgSelectedCats[catId]!==undefined)delete mgSelectedCats[catId];
  else mgSelectedCats[catId]=0;
  buildMgCatGrid();renderMgInputs();
}
function togMgHormi(label){
  if(mgSelectedHormis[label]!==undefined)delete mgSelectedHormis[label];
  else mgSelectedHormis[label]=0;
  buildMgChipsMulti();
}
function addMgHormiNew(){
  const v=prompt('Nombre de la nueva hormiga:');if(!v?.trim())return;
  if(!D.hormis.includes(v.trim()))D.hormis.push(v.trim());
  mgSelectedHormis[v.trim()]=0;save();buildMgChipsMulti();
}
function renderMgInputs(){
  const el=document.getElementById('mg-inputs');if(!el)return;
  const hKeys=Object.keys(mgSelectedHormis);
  const cKeys=Object.keys(mgSelectedCats);
  if(!hKeys.length&&!cKeys.length){el.innerHTML='';return;}
  const mkRow=(label,inputId,stateObj,key)=>`<div style="display:flex;align-items:center;gap:9px;margin-bottom:8px">
    <div style="flex:1;font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${label}</div>
    <div style="position:relative;width:118px;flex-shrink:0">
      <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--t3);font-size:13px;pointer-events:none">S/</span>
      <input type="number" inputmode="decimal" class="txt-in" id="${inputId}" placeholder="0.00" value="${stateObj[key]||''}" style="margin-bottom:0;padding-left:28px" oninput="${stateObj===mgSelectedHormis?`mgSelectedHormis['${key.replace(/'/g,"\\'")}']`:`mgSelectedCats['${key}']`}=parseFloat(this.value)||0">
    </div>
  </div>`;
  let html='';
  if(hKeys.length)html+=`<div class="f-lbl" style="margin-top:8px">presupuesto por hormiga (S/)</div>`+hKeys.map(h=>mkRow(h,'mgamt-'+h.replace(/[\s']/g,'_'),mgSelectedHormis,h)).join('');
  if(cKeys.length){
    const cats=allCats();
    html+=`<div class="f-lbl" style="${hKeys.length?'margin-top:12px':'margin-top:8px'}">presupuesto por categoría (S/)</div>`
      +cKeys.map(cid=>{const c=cats.find(x=>x.id===cid)||{e:'🫙',l:cid};return mkRow(c.e+' '+c.l,'mgcamt-'+cid,mgSelectedCats,cid);}).join('');
  }
  el.innerHTML=html;
}

// ── drag on scan drop
const sd=document.getElementById('scan-drop');
if(sd){
  sd.addEventListener('dragover',e=>{e.preventDefault();sd.classList.add('over');});
  sd.addEventListener('dragleave',()=>sd.classList.remove('over'));
  sd.addEventListener('drop',e=>{
    e.preventDefault();sd.classList.remove('over');
    const f=e.dataTransfer.files[0];if(!f)return;
    const dt=new DataTransfer();dt.items.add(f);
    document.getElementById('img-in').files=dt.files;
    scanImg(document.getElementById('img-in'));
  });
}
document.addEventListener('DOMContentLoaded',()=>{if(window.lucide)lucide.createIcons();});