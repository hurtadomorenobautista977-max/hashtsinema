/* Public connection settings. Supabase Auth and Row Level Security govern access. */
const CinemaCloud = (() => {
  const config = window.CINEMA_SUPABASE;
  const sessionKey = 'bahman-eight-cinemas-auth';
  let session;
  try { session = JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch {}
  let renewal;
  const remember = value => {
    session = value;
    try {
      if(value) localStorage.setItem(sessionKey, JSON.stringify(value));
      else localStorage.removeItem(sessionKey);
    } catch {}
    return value;
  };
  async function request(path, {method='GET',body,token,prefer}={}) {
    const response = await fetch(config.url + path, {
      method,
      headers:{apikey:config.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(prefer?{Prefer:prefer}:{})},
      body:body===undefined?undefined:JSON.stringify(body)
    });
    const data = await response.json().catch(()=>null);
    if(!response.ok) throw Object.assign(new Error('Supabase request failed'),{status:response.status});
    return data;
  }
  async function token() {
    if(!session) return null;
    if(session.expires_at > Date.now()/1000+30) return session.access_token;
    if(!renewal) renewal=request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}})
      .then(remember).catch(error=>{if(error.status===400||error.status===401)remember(null);throw error;})
      .finally(()=>{renewal=null;});
    return (await renewal).access_token;
  }
  const api = async (path,options) => {
    const access = await token();
    if(!access) throw new Error('Login required');
    return request('/rest/v1/'+path,{...options,token:access});
  };
  return {
    configured: Boolean(config),
    signedIn: () => Boolean(session),
    async login(email,password) {
      remember(await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}}));
    },
    logout: () => remember(null),
    async load() {
      const members=await api('eight_cinemas_members?select=user_id&limit=1');
      if(!members.length) throw Object.assign(new Error('Membership required'),{status:403});
      return api('eight_cinemas_work?select=card_id,changes,revision');
    },
    async save(id, changes, revision) {
      const body = {changes,revision:revision+1};
      const rows = revision===0
        ? await api('eight_cinemas_work',{method:'POST',body:{...body,card_id:id},prefer:'return=representation'})
        : await api('eight_cinemas_work?card_id=eq.'+encodeURIComponent(id)+'&revision=eq.'+revision,{method:'PATCH',body,prefer:'return=representation'});
      if(!rows?.length) throw Object.assign(new Error('Update conflict'),{status:409});
      return rows[0];
    }
  };
})();
