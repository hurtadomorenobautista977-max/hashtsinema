/* Shared card data is accessed with the Supabase publishable key. */
const CinemaCloud = (() => {
  const config = window.CINEMA_SUPABASE;
  async function request(path, {method='GET',body,prefer}={}) {
    const response = await fetch(config.url + '/rest/v1/' + path, {
      method,
      headers:{apikey:config.key,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},
      body:body===undefined?undefined:JSON.stringify(body)
    });
    const data = await response.json().catch(()=>null);
    if(!response.ok) throw Object.assign(new Error('Supabase request failed'),{status:response.status});
    return data;
  }
  return {
    load: () => request('eight_cinemas_work?select=card_id,changes,revision'),
    async save(id, changes, revision) {
      const body = {changes,revision:revision+1};
      const rows = revision===0
        ? await request('eight_cinemas_work',{method:'POST',body:{...body,card_id:id},prefer:'return=representation'})
        : await request('eight_cinemas_work?card_id=eq.'+encodeURIComponent(id)+'&revision=eq.'+revision,{method:'PATCH',body,prefer:'return=representation'});
      if(!rows?.length) throw Object.assign(new Error('Update conflict'),{status:409});
      return rows[0];
    }
  };
})();
