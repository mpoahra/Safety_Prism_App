(() => {
  const api = async (url, options={}) => { const r = await fetch(url, {credentials:'same-origin', ...options}); const d = await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error || `HTTP ${r.status}`); return d; };
  const style = document.createElement('style');
  style.textContent = `.hse-live-panel{margin:24px 0;padding:20px;background:#fff;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.08)}.hse-live-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}.hse-kpi{padding:16px;border-radius:12px;background:#f4f7fa}.hse-kpi b{display:block;font-size:28px}.hse-import{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:14px}.hse-import input{max-width:280px}.hse-msg{margin-top:10px;font-weight:700}`;
  document.head.appendChild(style);

  function panel(){
    if(document.getElementById('hse-live-panel')) return document.getElementById('hse-live-panel');
    const p=document.createElement('section'); p.id='hse-live-panel'; p.className='hse-live-panel';
    p.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><h2 style="font-size:24px;font-weight:900;margin:0">مرکز فرماندهی HSE — داده زنده</h2><small>متصل به Flask + Database</small></div><button id="hse-refresh" style="padding:8px 16px;border-radius:999px;border:0;background:#1B263B;color:#fff">بروزرسانی</button></div><div id="hse-kpis" class="hse-live-grid" style="margin-top:16px"></div><div class="hse-import"><label>گزارش‌ها <input id="hse-reports" type="file" accept=".csv"></label><label>اقدامات اصلاحی <input id="hse-actions" type="file" accept=".csv"></label><label>نفرات/داده پایه <input id="hse-people" type="file" accept=".csv"></label></div><div id="hse-msg" class="hse-msg"></div></section>`;
    document.querySelector('main')?.prepend(p); return p;
  }
  async function refresh(){
    const d=await api('/api/dashboard/analytics'); const k=d.kpi||{};
    document.getElementById('hse-kpis').innerHTML=[['گزارش‌ها',k.reports||0],['باز',k.open_reports||0],['اقدامات',k.actions||0],['معوق',k.overdue||0],['بسته‌شده',k.closed_actions||0]].map(x=>`<div class="hse-kpi"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
  }
  async function upload(id,kind){ const f=document.getElementById(id).files[0]; if(!f)return; const fd=new FormData(); fd.append('file',f); const m=document.getElementById('hse-msg'); m.textContent='در حال Import...'; try{const d=await api('/api/import/'+kind,{method:'POST',body:fd});m.textContent=`Import انجام شد: ${d.inserted||0} جدید، ${d.updated||0} بروزرسانی، ${d.errors||0} خطا`; await refresh();}catch(e){m.textContent='خطا: '+e.message;} }
  document.addEventListener('DOMContentLoaded',()=>{panel(); document.getElementById('hse-refresh').onclick=refresh; document.getElementById('hse-reports').onchange=()=>upload('hse-reports','reports'); document.getElementById('hse-actions').onchange=()=>upload('hse-actions','actions'); document.getElementById('hse-people').onchange=()=>upload('hse-people','people'); refresh().catch(e=>console.error(e));});
})();
