// ── FIXED doLogin — remplacez la fonction doLogin existante par celle-ci ──────
async function doLogin(e){
  e.preventDefault();
  showErr('li-err','');
  document.getElementById('li-resend').style.display='none';
  setBtn('li-btn','<span class="spin"></span> Connexion...',true);
  try{
    const email=document.getElementById('li-email').value.trim();
    const pwd=document.getElementById('li-pwd').value;

    // 1. Firebase — avec timeout 15s
    let cred;
    try{
      cred=await withTimeout(new Promise((res,rej)=>{
        fbAuth.signInWithEmailAndPassword(email,pwd).then(res).catch(rej);
      }),15000);
    }catch(fbErr){
      // Firebase SDK ne retourne pas une vraie Promise compatible withTimeout directement
      cred=await fbAuth.signInWithEmailAndPassword(email,pwd);
    }
    const fbUser=cred.user;

    // 2. Email Firebase non confirmé
    if(!fbUser.emailVerified){
      FBU=fbUser;
      showErr('li-err','Confirmez votre email Firebase avant de vous connecter.');
      document.getElementById('li-resend').style.display='block';
      return;
    }

    FBU=fbUser;
    const sbPwd=_sbPwd(fbUser.uid);

    // 3. Login Supabase — AVEC timeout pour éviter le spinner infini
    let{data,error}=await withTimeout(sb.auth.signInWithPassword({email,password:sbPwd}),15000);

    // 4. Gestion des erreurs Supabase
    if(error){
      const msg=error.message||'';
      const status=error.status||0;

      // Cas A : "Email not confirmed" côté Supabase (Supabase exige sa propre confirmation)
      // → Solution : désactivez "Confirm email" dans Supabase Dashboard > Auth > Email
      if(msg.includes('Email not confirmed')||msg.includes('not confirmed')){
        showErr('li-err',
          '⚙️ Configuration nécessaire : dans votre dashboard Supabase, allez dans\n'+
          'Authentication → Providers → Email et désactivez "Confirm email".\n'+
          'Firebase gère déjà la vérification email.');
        return;
      }

      // Cas B : compte Supabase inexistant (premier login) → créer à la volée
      if(status===400||msg.includes('Invalid login credentials')){
        const{data:su,error:suErr}=await withTimeout(sb.auth.signUp({
          email,password:sbPwd,
          options:{data:{first_name:FBU.displayName?.split(' ')[0]||'',last_name:''}}
        }),15000);

        // Ignorer "already registered" — c'est OK
        if(suErr&&!suErr.message?.includes('already registered')&&!suErr.message?.includes('already exists')){
          throw suErr;
        }

        const retry=await withTimeout(sb.auth.signInWithPassword({email,password:sbPwd}),15000);
        if(retry.error){
          if(retry.error.message?.includes('Email not confirmed')||retry.error.message?.includes('not confirmed')){
            showErr('li-err',
              '⚙️ Allez dans Supabase Dashboard → Authentication → Providers → Email '+
              'et désactivez "Confirm email".');
            return;
          }
          throw retry.error;
        }
        data=retry.data; error=null;
      }else{
        throw error;
      }
    }

    // 5. Vérifier que la session est valide avant d'y accéder
    if(!data?.session?.user){
      throw new Error('Session invalide. Réessayez dans quelques secondes.');
    }

    // 6. Réinitialiser l'état
    CP=null; CU=null;
    document.getElementById('welcome-h').textContent='Bienvenue !!!';
    document.getElementById('prof-name').textContent='...';
    document.getElementById('prof-email').textContent='...';
    document.getElementById('ref-code').textContent='...';
    document.getElementById('big-av').innerHTML='?';
    document.getElementById('st-f').textContent='0';
    document.getElementById('st-a').textContent='0';
    document.getElementById('st-b').textContent='0 FCFA';
    document.getElementById('st-pts').textContent='0';
    Object.keys(loaded).forEach(k=>delete loaded[k]);

    CU=data.session.user;
    await _ensureProfile();

    // 7. Vérif admin — AVEC timeout
    const{data:p}=await withTimeout(
      sb.from('profiles').select('badge_level').eq('id',CU.id).single(),
      10000
    );
    if(p?.badge_level==='admin'){
      toast('Connexion admin réussie !');
      setTimeout(()=>{window.location.href='./rivo-admin.html';},700);
      return;
    }

    await loadProfileData();
    toast('Connexion réussie ! 🎉');
    setTimeout(()=>{goTo('dashboard');},500);

  }catch(err){
    const code=err.code||'';
    const em=err.message||'';
    if(code.includes('wrong-password')||code.includes('user-not-found')||
       code.includes('invalid-credential')||code.includes('INVALID_LOGIN_CREDENTIALS')){
      showErr('li-err','Email ou mot de passe incorrect.');
    }else if(code.includes('too-many-requests')){
      showErr('li-err','Trop de tentatives. Réessayez dans quelques minutes.');
    }else if(em.includes('Erreur réseau')||em.includes('network')){
      showErr('li-err','Connexion lente. Vérifiez votre internet et réessayez.');
    }else{
      showErr('li-err',em||'Erreur de connexion. Réessayez.');
    }
  }finally{
    // finally s'exécute TOUJOURS en JS — le bouton se réinitialise quoi qu'il arrive
    setBtn('li-btn','Se connecter',false);
  }
}

// ── FIXED _ensureProfile — ajoute withTimeout sur les appels DB ───────────────
async function _ensureProfile(){
  if(!CU?.id)return;
  const{data:existingP}=await withTimeout(
    sb.from('profiles').select('id').eq('id',CU.id).single(),
    10000
  );
  if(!existingP){
    const pending=JSON.parse(localStorage.getItem('rivo_pending_profile')||'null')||{};
    const nameParts=(FBU?.displayName||'').split(' ');
    await withTimeout(
      sb.from('profiles').upsert({
        id:CU.id,
        first_name:pending.first_name||nameParts[0]||'',
        last_name:pending.last_name||nameParts.slice(1).join(' ')||'',
        email:FBU?.email||CU.email||'',
        birth_date:pending.birth_date||null,
        referred_by:pending.referred_by||null,
      },{onConflict:'id'}),
      10000
    );
    if(pending.first_name) localStorage.removeItem('rivo_pending_profile');
  }
}
