const $ = id => document.getElementById(id);
const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fa = number => new Intl.NumberFormat('fa-IR').format(number);

const icons = {
 home:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/>',
 board:'<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4m8-4v4m-8 8h2m4 0h2"/>',
 weekly:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
 common:'<path d="M8 3h8v3H8z"/><path d="M8 5H5v16h14V5h-3M8 10h8m-8 4h8m-8 4h5"/>',
 docs:'<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/>',
 cinema:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14m8-14v14M3 10h5m8 0h5M3 14h5m8 0h5"/>',
 done:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 alert:'<path d="M12 3 2 20h20L12 3zm0 6v5m0 3h.01"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
 user:'<circle cx="12" cy="8" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
 theme:'<path d="M21 13a9 9 0 1 1-10-10 8 8 0 0 0 10 10Z"/>'
};
const ic = key => `<svg class="ic" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[key]||icons.docs}</svg>`;

const statuses = ['برنامه‌ریزی‌شده','در حال اجرا','در انتظار تأیید','تکمیل‌شده'];
const colors = ['', 'blue', 'amber', 'green'];
const labels = [['home','▦','نمای کل برنامه'],['list','☷','جدول برنامه‌ریزی'],['board','▥','برد کانبان'],['calendar','▦','تقویم ۴۰روزه'],['weekly','◷','مرور هفتگی'],['common','▤','اقدامات عمومی'],['docs','▱','اسناد مبنا']];
const names = ['بهمن بیرجند','بهمن شهرکرد','کیهان آبادان','سپهر ساری','۲۹ بهمن تبریز','مهرشاهد تهران','چهارباغ اصفهان','همافران نوشهر'];
const groups = [[3,5,4,6],[7,0,2,1]];
const general = DOCS[0].find(Array.isArray).slice(1);
const specific = DOCS[1].filter(Array.isArray).map(table => table.slice(1));
const contextIndexes = DOCS[2].flatMap((part,index) => typeof part === 'string' && /^[۱۲۳۴۵]\. سینما/.test(part) ? [index] : []);
const docNames = ['اقدامات عمومی','اقدامات اولیه','شرح وضعیت پنج سینما'];
const tasks = [];
const initialTracking = {owner:'',due:null,start:null,status:0,blocked:false,note:'',output:'',evidence:'',history:[]};
names.forEach((name, cinema) => {
  general.forEach(([number,title,body],index) => tasks.push({
    ...initialTracking,id:'G'+(cinema+1)+'-'+(index+1),cinema,kind:'عمومی',number,title,body
  }));
  (specific[cinema] || []).forEach(([number,title],index) => tasks.push({
    ...initialTracking,id:'C'+(cinema+1)+'-'+(index+1),cinema,kind:'اختصاصی',number,title,body:''
  }));
});
let asOf = 1;
let synced = false, cloudEdits = {}, revisions = {};
const pending = new Set();
const all = () => tasks.map(t=>({...t,...(synced?cloudEdits[t.id]:undefined)}));
const day = n => !n?'تعیین نشده':fa(n<=30?n:n-30)+' '+(n<=30?'آذر':'دی');
const count = (rows,fn) => rows.filter(fn).length;
const late = t => Boolean(t.due) && t.due<asOf && t.status!==3;
const pill = (label,color='') => `<span class="pill ${color}">${esc(label)}</span>`;
const empty = text => `<p class="empty">${text}</p>`;
const option = (value,label,current) => `<option value="${esc(value)}" ${String(value)===String(current)?'selected':''}>${esc(label)}</option>`;
let homeMode='cards', route='home', cinema=0, tab='actions', doc=0, week=2;
let filters = {q:'',cinema:'',kind:'',status:'',attention:'',owner:''};
const heading = (title,subtitle,button='') => `<div class="heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${button}</div>`;
const go = (where,index) => {
  route=where;
  if(index!==undefined) cinema=Number(index);
  filters={q:'',cinema:'',kind:'',status:'',attention:'',owner:''}; tab='actions';
  $('side').classList.remove('open');
  render();
  window.scrollTo(0,0);
};
function render() {
  $('nav').innerHTML='<div class="navlabel">برنامه</div>'+labels.map(([id,icon,title])=>`<button data-go="${id}" class="${route===id?'active':''}"><i>${ic(id)}</i>${title}</button>`).join('')+
  '<div class="navlabel">سینماها</div>'+groups.flat().map(i=>`<button data-go="cinema" data-cinema="${i}" class="${route==='cinema'&&cinema===i?'active':''}"><i>${ic('cinema')}</i>${names[i]}</button>`).join('');
  $('account').textContent=synced?'فضای کاری متصل':'اتصال به فضای کاری';
  const label = route==='cinema'?names[cinema]:labels.find(x=>x[0]===route)[2];
  $('crumb').textContent='بهمن سبز / هشت سینما / '+label;
  const pages={home:overview,list:()=>work(false),board:()=>work(true),cinema:cinemaPage,common:commonPage,docs:docsPage,calendar:calendarPage,weekly:weeklyPage};
  $('view').innerHTML=pages[route]();
}
function overview() {
  const rows=all(), done=count(rows,t=>t.status===3), overdue=count(rows,late), blocked=count(rows,t=>t.blocked&&t.status!==3);
  const groupRows=groups.map((indices,g)=>`<tr class="group"><td colspan="5">${esc(DOCS[2].find(Array.isArray)[g][0])}</td></tr>`+indices.map(i=>{
    const local=rows.filter(t=>t.cinema===i), complete=count(local,t=>t.status===3), percent=Math.round(100*complete/local.length);
    return `<tr><td><button class="link" data-go="cinema" data-cinema="${i}">${names[i]}</button></td><td>${fa(complete)} از ${fa(local.length)}<div class="progress"><b style="width:${percent}%"></b></div></td><td>${fa(count(local,late))}</td><td>${fa(count(local,t=>t.blocked&&t.status!==3))}</td><td>${local.some(t=>t.history.length)?'ثبت شده':'ثبت نشده'}</td></tr>`;
  }).join('')).join('');
  const cinemaCards=groups.map((indices,g)=>`<div class="cinema-group"><h3>${esc(DOCS[2].find(Array.isArray)[g][0])}</h3><div class="cinema-grid">${indices.map(i=>{
    const local=rows.filter(t=>t.cinema===i),complete=count(local,t=>t.status===3),percent=Math.round(100*complete/local.length);
    return `<button class="cinema-tile" data-go="cinema" data-cinema="${i}"><span class="iconwrap">${ic('cinema')} <strong>${names[i]}</strong></span><span class="rowflex"><small>${fa(complete)} از ${fa(local.length)} تکمیل</small><small>${fa(percent)}٪</small></span><span class="progress"><b style="width:${percent}%"></b></span><small>${fa(count(local,late))} معوق · ${fa(count(local,t=>t.blocked&&t.status!==3))} مانع</small></button>`;
  }).join('')}</div></div>`).join('');
  return heading('نمای کل برنامه','رصد و پایش توسعه مخاطب شبکه سینماهای بهمن سبز','<button class="primary" data-go="board">مشاهده برد کانبان</button>')+
  `<section class="hero rowflex"><div><h2>برنامه عملیاتی ۴۰روزه</h2><p>۱ آذر تا ۱۰ دی ۱۴۰۵</p></div><label>تاریخ مبنای رصد <select id="asof">${Array.from({length:40},(_,i)=>option(i+1,day(i+1),asOf)).join('')}</select></label></section>`+
  `<div class="stats">${[['سینماهای منتخب',8],['اقدام تکمیل‌شده',done],['اقدام معوق',overdue],['اقدام دارای مانع',blocked]].map(([l,n],i)=>`<div class="stat"><span class="symbol">${ic(['cinema','done','weekly','alert'][i])}</span><span>${l}</span><strong>${fa(n)}</strong></div>`).join('')}</div>`+
  `<div class="dashboard-grid"><section class="panel"><div class="section-head"><h2>${ic('cinema')} وضعیت هشت سینما</h2><button data-home-mode>${homeMode==='cards'?ic('list')+' نمای جدول':ic('home')+' نمای کارت'}</button></div>${homeMode==='cards'?cinemaCards:`<div class="scroll"><table><thead><tr><th>سینما</th><th>تکمیل اقدامات</th><th>معوق</th><th>مانع</th><th>ثبت پیگیری</th></tr></thead><tbody>${groupRows}</tbody></table></div>`}</section><section class="panel"><div class="section-head"><h2>${ic('alert')} نیازمند پیگیری</h2><button class="link" data-attention>همه موارد</button></div>${rows.filter(t=>t.status!==3&&(t.blocked||late(t))).sort((a,b)=>Number(b.blocked)-Number(a.blocked)||a.due-b.due).slice(0,6).map(t=>`<button class="attention" data-task="${t.id}"><b class="ellipsis">${esc(t.title)}</b><span>${names[t.cinema]} · ${day(t.due)} · ${t.blocked?'دارای مانع':'معوق'}</span></button>`).join('')||empty('موردی برای پیگیری فوری ثبت نشده است.')}</section></div>`;
}
function selectedRows() {
  const q=filters.q.trim().replaceAll('ي','ی').replaceAll('ك','ک');
  return all().filter(t=>(filters.cinema===''||t.cinema===+filters.cinema)&&(!filters.kind||t.kind===filters.kind)&&(filters.status===''||t.status===+filters.status)&&(!filters.attention||t.status!==3&&(filters.attention==='late'?late(t):filters.attention==='blocked'?t.blocked:t.blocked||late(t)))&&(!filters.owner||t.owner===filters.owner)&&[t.title,t.body,t.id,names[t.cinema],t.owner].join(' ').replaceAll('ي','ی').replaceAll('ك','ک').toLowerCase().includes(q.toLowerCase()));
}
function work(board) {
  const select=(field,title,items)=>`<select aria-label="${title}" data-filter="${field}">${option('',title,filters[field])}${items.map(([v,l])=>option(v,l,filters[field])).join('')}</select>`;
  return heading(board?'برد کانبان':'جدول برنامه‌ریزی',board?(synced?'کارت را باز کنید یا به ستون وضعیت جدید بکشید.':'برای جابه‌جایی کارت‌ها به فضای کاری وصل شوید.'):'مسئول، موعد و وضعیت اقدامات همه سینماها','<button data-go="'+(board?'list':'board')+'">'+(board?'نمای جدول':'نمای برد')+'</button>')+
  `<div class="filters"><input id="query" aria-label="جست‌وجوی اقدام" placeholder="جست‌وجو در متن، سینما یا شناسه" value="${esc(filters.q)}">${select('cinema','همه سینماها',names.map((n,i)=>[i,n]))}${select('kind','همه انواع',['عمومی','اختصاصی'].map(n=>[n,n]))}${select('status','همه وضعیت‌ها',statuses.map((n,i)=>[i,n]))}${select('attention','همه موعدها و موانع',[['any','نیازمند پیگیری'],['late','معوق'],['blocked','دارای مانع']])}${select('owner','همه مسئولان',[...new Set(all().map(t=>t.owner))].filter(Boolean).map(n=>[n,n]))}</div><div id="results">${result(board)}</div>`;
}
function badges(t) {
  return pill(statuses[t.status],colors[t.status])+(t.blocked&&t.status!==3?' '+pill('دارای مانع','red'):'')+(late(t)?' '+pill('معوق','red'):'');
}
function table(rows) {
  if(!rows.length) return empty('اقدامی با این فیلتر پیدا نشد.');
  return `<div class="scroll"><table><thead><tr><th>ردیف / اقدام</th><th>سینما</th><th>نوع</th><th>مسئول</th><th>موعد</th><th>وضعیت</th></tr></thead><tbody>${rows.map(t=>`<tr><td><small dir="ltr" style="text-align:right">${t.id} · ${esc(t.number)}</small><button data-task="${t.id}" class="link source">${esc(t.title)}</button></td><td>${names[t.cinema]}</td><td>${pill(t.kind)}</td><td>${esc(t.owner)||'—'}</td><td>${day(t.due)}</td><td>${badges(t)}</td></tr>`).join('')}</tbody></table></div>`;
}
function result(board) {
  const rows=selectedRows();
  if(!board) return `<div class="panel">${table(rows)}</div>`;
  return `<div class="board">${statuses.map((label,index)=>{
    const lane=rows.filter(t=>t.status===index);
    return `<section class="lane" data-lane="${index}"><h2>${label} ${pill(fa(lane.length),colors[index])}</h2>${lane.map(t=>`<button class="card" draggable="${synced}" data-task="${t.id}"><div class="rowflex"><small dir="ltr">${t.id}</small>${pill(t.kind)}</div><strong>${esc(t.title)}</strong><small>${ic('calendar')} ${day(t.due)} · ${names[t.cinema]}</small><small>${ic('user')} ${esc(t.owner)||'مسئول تعیین نشده'}</small>
      <div class="progress" role="progressbar" aria-label="پیشرفت" aria-valuenow="${progress(t)}" aria-valuemin="0" aria-valuemax="100"><b style="width:${progress(t)}%"></b></div>
      ${late(t)?pill('معوق','red'):''} ${t.blocked&&t.status!==3?pill('دارای مانع','red'):''}</button>`).join('')||empty('اقدامی در این ستون نیست.')}</section>`;
  }).join('')}</div>`;
}
function documentBody(parts) {
  return `<div class="doc source">${parts.map((part,index)=>Array.isArray(part)?`<div class="scroll"><table>${part.map((row,r)=>`<tr>${row.map(cell=>{const tag=row[0]==='ردیف'||r===0&&part[0][0]==='ردیف'?'th':'td';return `<${tag}>${esc(cell)}</${tag}>`;}).join('')}</tr>`).join('')}</table></div>`:part?`<${index===0||/^([۱۲۳۴۵1-5]\. سینما|دسته‌بندی)/.test(part)?'h2':'p'}>${esc(part)}</${index===0||/^([۱۲۳۴۵1-5]\. سینما|دسته‌بندی)/.test(part)?'h2':'p'}>`:'').join('')}</div>`;
}
function docsPage() {
  return heading('اسناد مبنا','متن کامل سه سند برنامه')+`<div class="tabs">${docNames.map((n,i)=>`<button data-doc="${i}" class="${doc===i?'active':''}">${n}</button>`).join('')}</div><section class="panel padded">${documentBody(DOCS[doc])}</section>`;
}
function commonPage() {
  const rows=all().filter(t=>t.kind==='عمومی');
  return heading('اقدامات عمومی','پیگیری اجرای هر اقدام در هشت سینما')+
  `<section class="panel padded">${documentBody(DOCS[0])}</section>`+general.map((row,i)=>`<section class="panel"><div class="section-head"><h2>${esc(row[1])}</h2></div>${table(rows.filter(t=>t.id.endsWith('-'+(i+1))))}</section>`).join('');
}
function cinemaPage() {
  const group=groups[0].includes(cinema)?0:1, rows=all().filter(t=>t.cinema===cinema);
  const own=rows.filter(t=>t.kind==='اختصاصی'), shared=rows.filter(t=>t.kind==='عمومی');
  const idx=contextIndexes[cinema];
  return heading('سینما '+names[cinema],esc(DOCS[2].find(Array.isArray)[group][0]))+
  `<div class="tabs">${[['actions','اقدامات'],['profile','شرح وضعیت']].map(([id,label])=>`<button data-tab="${id}" class="${tab===id?'active':''}">${label}</button>`).join('')}</div>`+
  (cinema===0?`<section class="panel padded"><h2>هدف سفارش در دوره ۴۰روزه</h2><p>۳٬۹۷۶ تا ۴٬۰۹۰ سفارش · رشد هدف ۵ تا ۸ درصد</p><small>مبنای مقایسه: ۲٬۲۷۲ سفارش در ۲۴ روز آبان، معادل حدود ۳٬۷۸۷ سفارش در ۴۰ روز.</small></section>`:'')+
  (tab==='actions'&&!own.length?`<div class="panel">${empty('برای این سینما اقدام اختصاصی در اسناد مبنا ثبت نشده است.')}</div>`:'')+
  (tab==='profile'?`<div class="panel padded">${idx===undefined?empty('شرح وضعیت این سینما در اسناد مبنا ارائه نشده است.'):documentBody(DOCS[2].slice(idx,contextIndexes[cinema+1]))}</div>`:
  [[own,'اقدامات اختصاصی'],[shared,'اقدامات عمومی']].filter(([r])=>r.length).map(([r,label])=>`<section class="panel"><div class="section-head"><h2>${label}</h2><small>${fa(count(r,t=>t.status===3))} از ${fa(r.length)} تکمیل</small></div>${table(r)}</section>`).join(''));
}
function calendarPage() {
  const rows=all();
  return heading('تقویم ۴۰روزه','موعد اقدامات از ۱ آذر تا ۱۰ دی')+
  `<div class="calendar">${Array.from({length:40},(_,i)=>`<section class="day"><b>${day(i+1)}</b>${rows.filter(t=>t.due===i+1).map(t=>`<button data-task="${t.id}" title="${esc(t.title)}">${names[t.cinema]} · ${t.id}</button>`).join('')}</section>`).join('')}</div>`;
}
function weeklyPage() {
  const start=(week-1)*7+1,end=Math.min(week*7,40),rows=all().filter(t=>t.due>=start&&t.due<=end);
  return heading('مرور هفتگی','مرور تعهدات هر هفته بر اساس موعد فعلی اقدامات')+
  `<div class="tabs">${Array.from({length:6},(_,i)=>`<button data-week="${i+1}" class="${week===i+1?'active':''}">هفته ${fa(i+1)}</button>`).join('')}</div><div class="panel"><div class="section-head"><h2>${day(start)} تا ${day(end)}</h2><div>${pill(fa(count(rows,t=>t.status===3))+' تکمیل','green')} ${pill(fa(count(rows,late))+' معوق','red')}</div></div>${table(rows)}</div>`;
}
const progress = t => t.status===3?100:(t.progress ?? [0,0,0,100][t.status]);
function openTask(id) {
  const t=all().find(x=>x.id===id); if(!t)return;
  $('detail').innerHTML=`<form id="taskForm" data-id="${id}"><div class="section-head"><div><small>${ic('docs')} ${names[t.cinema]} / ${t.kind} / ${id} · ردیف ${esc(t.number)}</small><h2 class="source">${esc(t.title)}</h2></div><button type="button" data-close aria-label="بستن">×</button></div><div class="padded">${t.body?`<p class="source">${esc(t.body)}</p>`:''}<fieldset class="fields" style="border:0;padding:0;margin:0" ${synced?'':'disabled'}>
  <label>مسئول<input name="owner" value="${esc(t.owner)}"></label>
  <label>شروع اجرا<select name="start"><option value="">تعیین نشده</option>${Array.from({length:40},(_,i)=>option(i+1,day(i+1),t.start)).join('')}</select></label>
  <label>موعد اجرا<select name="due"><option value="">تعیین نشده</option>${Array.from({length:40},(_,i)=>option(i+1,day(i+1),t.due)).join('')}</select></label>
  <label>وضعیت<select name="status">${statuses.map((s,i)=>option(i,s,t.status)).join('')}</select></label>
  <label>درصد پیشرفت<input name="progress" type="number" min="0" max="100" required value="${progress(t)}"></label>
  <label class="check"><input name="blocked" type="checkbox" ${t.blocked?'checked':''}> دارای مانع</label>
  <label class="wide">خروجی مورد انتظار<textarea name="output">${esc(t.output)}</textarea></label>
  <label class="wide">${ic('list')} آخرین پیگیری / گام بعدی<textarea name="note">${esc(t.note)}</textarea></label>
  <label class="wide">مستند اجرا یا پیوند آن<textarea name="evidence">${esc(t.evidence)}</textarea></label>
  </fieldset><details><summary>تاریخچه تغییرات (${fa(t.history.length)})</summary>${t.history.map(item=>`<div><small>${esc(item.date)}</small>${esc(item.text)}</div>`).join('')||'تغییری ثبت نشده است.'}</details></div><footer>${synced?'<button class="primary" type="submit">ذخیره تغییرات</button>':'<button class="primary" type="button" data-connect>اتصال برای ویرایش</button>'}<button type="button" data-close>بستن</button></footer></form>`;
  $('detail').showModal();
}
let toastTimer;
function toast(message) {
  $('toast').textContent=message; $('toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3000);
}
async function updateTask(id,changes) {
  if(!synced){toast('برای ذخیره در Supabase به فضای کاری وصل شوید.');return false;}
  if(pending.has(id)) return false;
  const old=all().find(t=>t.id===id);
  const fieldNames={status:'وضعیت',due:'موعد',owner:'مسئول',blocked:'مانع',note:'پیگیری',output:'خروجی',evidence:'مستند',start:'شروع',progress:'پیشرفت'};
  const changed=Object.keys(changes).filter(k=>changes[k]!==old[k]);
  if(!changed.length)return true;
  const value=(k,v)=>k==='status'?statuses[v]:(k==='due'||k==='start')?(v?day(v):'تعیین نشده'):k==='blocked'?(v?'دارد':'رفع شد'):v||'خالی';
  const text=changed.map(k=>`${fieldNames[k]} از «${value(k,old[k])}» به «${value(k,changes[k])}»`).join('، ');
  const next={...cloudEdits[id],...changes,history:[{date:new Intl.DateTimeFormat('fa-IR',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Tehran'}).format(new Date()),text},...old.history]};
  pending.add(id);
  try {
    const saved=await CinemaCloud.save(id,next,revisions[id]||0);
    revisions[id]=saved.revision;
    cloudEdits[id]=saved.changes;
  } catch(error) {
    if(error.status===409) {
      try {await refreshCloud();} catch {}
      $('detail').close();
      toast('کارت هم‌زمان تغییر کرد. دوباره آن را باز کنید.');
    } else if(!CinemaCloud.signedIn()||error.status===401) {
      CinemaCloud.logout();
      synced=false;
      render();
      toast('اتصال به فضای کاری قطع شده است. دوباره وارد شوید.');
    } else toast('ذخیره در Supabase انجام نشد. دوباره تلاش کنید.');
    return false;
  } finally {pending.delete(id);}
  render();
  toast('تغییرات در Supabase ذخیره شد.');
  return true;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b)return;
  if(b.dataset.go)go(b.dataset.go,b.dataset.cinema);
  if(b.dataset.task)openTask(b.dataset.task);
  if(b.hasAttribute('data-home-mode')){homeMode=homeMode==='cards'?'table':'cards';render();}
  if(b.hasAttribute('data-close'))$('detail').close();
  if(b.hasAttribute('data-connect')){$('detail').close();$('account').click();}
  if(b.dataset.doc!==undefined){doc=+b.dataset.doc;render();}
  if(b.dataset.tab){tab=b.dataset.tab;render();}
  if(b.dataset.week){week=+b.dataset.week;render();}
  if(b.hasAttribute('data-attention')){go('list');filters.attention='any';render();}
  if(b.id==='menu')$('side').classList.toggle('open');
  if(b.id==='globalSearch'){go('list');$('query').focus();}
});
document.addEventListener('input',e=>{if(e.target.id==='query'){filters.q=e.target.value;$('results').innerHTML=result(route==='board');}});
document.addEventListener('change',e=>{
  const f=e.target.dataset.filter;
  if(f){filters[f]=e.target.value;$('results').innerHTML=result(route==='board');}
  if(e.target.id==='asof'){asOf=+e.target.value;render();}
});
document.addEventListener('submit',async e=>{
  if(e.target.id!=='taskForm')return;
  e.preventDefault();
  const f=new FormData(e.target);
  const start=+f.get('start')||null,due=+f.get('due')||null,status=+f.get('status'),owner=f.get('owner').trim();
  if(start&&due&&start>due){toast('شروع اجرا باید تا موعد انجام باشد.');return;}
  if(await updateTask(e.target.dataset.id,{owner,start,due,status,progress:status===3?100:+f.get('progress'),blocked:f.has('blocked'),output:f.get('output'),note:f.get('note'),evidence:f.get('evidence')}))$('detail').close();
});
document.addEventListener('dragstart',e=>{const c=e.target.closest('.card');if(c&&synced)e.dataTransfer.setData('text/plain',c.dataset.task);});
document.addEventListener('dragover',e=>{const lane=e.target.closest('.lane');if(lane&&synced){e.preventDefault();lane.classList.add('over');}});
document.addEventListener('dragleave',e=>{const lane=e.target.closest('.lane');if(lane&&!lane.contains(e.relatedTarget))lane.classList.remove('over');});
document.addEventListener('drop',e=>{
  const lane=e.target.closest('.lane');if(!lane)return;
  e.preventDefault();lane.classList.remove('over');
  const id=e.dataTransfer.getData('text/plain');if(tasks.some(t=>t.id===id))updateTask(id,{status:+lane.dataset.lane,...(+lane.dataset.lane===3?{progress:100}:{})});
});
render();

async function refreshCloud() {
  const rows=await CinemaCloud.load();
  cloudEdits=Object.fromEntries(rows.map(row=>[row.card_id,row.changes]));
  revisions=Object.fromEntries(rows.map(row=>[row.card_id,row.revision]));
  synced=true;
  render();
}
$('account').addEventListener('click',()=>{
  if(pending.size){toast('ذخیره در حال انجام است.');return;}
  if(synced){
    $('login').innerHTML='<div class="section-head"><h2>فضای کاری بهمن سبز</h2></div><div class="padded"><p>تغییرات کارت‌ها در Supabase ذخیره می‌شوند.</p><button id="cloudRefresh">دریافت آخرین تغییرات</button> <button id="cloudLogout">خروج از فضای کاری</button> <button id="dismissLogin">بستن</button></div>';
    $('cloudRefresh').onclick=async()=>{try{await refreshCloud();$('login').close();toast('آخرین اطلاعات دریافت شد.');}catch{toast('دریافت اطلاعات انجام نشد.');}};
    $('cloudLogout').onclick=()=>{CinemaCloud.logout();synced=false;render();$('login').close();};
  } else {
    $('login').innerHTML='<form class="padded"><h2>ورود به فضای کاری بهمن سبز</h2><p class="syncState">برای ویرایش و ذخیره مشترک کارت‌ها با حساب مجاز Supabase وارد شوید.</p><label>ایمیل<input name="email" type="email" dir="ltr" required autocomplete="username"></label><label>رمز عبور<input name="password" type="password" dir="ltr" required autocomplete="current-password"></label><p id="loginStatus" role="status"></p><button class="primary">ورود</button> <button type="button" id="dismissLogin">بستن</button></form>';
    $('login').querySelector('form').onsubmit=async event=>{
      event.preventDefault();
      const data=new FormData(event.target),submit=event.submitter;
      submit.disabled=true;
      try {
        await CinemaCloud.login(data.get('email').trim(),data.get('password'));
        await refreshCloud(); $('login').close(); toast('فضای کاری Supabase متصل شد.');
      } catch(error) {
        CinemaCloud.logout();
        $('loginStatus').textContent=error.status===403?'این حساب عضو فضای کاری هشت سینما نیست.':'ورود انجام نشد. اطلاعات حساب یا اتصال را بررسی کنید.';
      } finally {submit.disabled=false;}
    };
  }
  $('dismissLogin').onclick=()=>$('login').close();
  $('login').showModal();
});
$('globalSearch').innerHTML=ic('search')+' جست‌وجوی اقدام';
$('theme').innerHTML=ic('theme');
try {document.body.dataset.theme=localStorage.getItem('bahman-theme')||'light';} catch {}
$('theme').onclick=()=>{
  document.body.dataset.theme=document.body.dataset.theme==='dark'?'light':'dark';
  try {localStorage.setItem('bahman-theme',document.body.dataset.theme);} catch {}
};
if(CinemaCloud.configured&&CinemaCloud.signedIn()) refreshCloud().catch(()=>toast('اتصال به فضای کاری برقرار نشد.'));
