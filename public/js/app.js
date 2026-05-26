let S = { products:[], debtors:[], creditors:[], activeCat:null, activeSub:null, activeDebtorId:null, activeCreditorId:null };

document.getElementById('topbarDate').textContent =
  new Date().toLocaleDateString('tr-TR',{weekday:'short',day:'numeric',month:'long',year:'numeric'});

// ── Helpers ──
const fv = id => document.getElementById(id)?.value?.trim()||'';
function showLoad(){ document.getElementById('loadingOverlay').classList.add('show'); }
function hideLoad(){ document.getElementById('loadingOverlay').classList.remove('show'); }
function toast(msg,err=false){
  const t=document.getElementById('toast');
  t.textContent=msg; t.className='toast'+(err?' error':''); t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3000);
}

// ── Sidebar toggle (mobile) ──
function toggleSidebar(){
  const s=document.querySelector('.sidebar');
  const o=document.getElementById('sidebarOverlay');
  s.classList.toggle('open');
  o.classList.toggle('open');
}
function closeSidebar(){
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}
function setDbStatus(ok, label){
  const dot=document.getElementById('dbDot');
  const lbl=document.getElementById('dbLabel');
  if(ok===true){ dot.className='db-dot ok'; lbl.textContent='Bağlı'; }
  else if(ok===null){ dot.className='db-dot'; dot.style.background='#f59e0b'; lbl.textContent='Bağlanıyor...'; }
  else { dot.className='db-dot err'; lbl.textContent='Bağlanamadı'; }
}

// ── DB Check ──
async function checkDb(){
  try{
    const {data,error}=await db.from('products').select('id').limit(1);
    if(error && error.code !== '42501' && error.status !== 409){
      setDbStatus(false);
      console.error('DB:', error.message);
    } else {
      setDbStatus(true);
    }
  }catch(e){
    // Önizleme / yerel dosyada CORS hatası alınır — GitHub Pages'de çalışır
    if(e.message && (e.message.includes('fetch') || e.message.includes('Failed'))){
      setDbStatus(null);
    } else {
      setDbStatus(false);
    }
  }
}

// ══════════════════════════════════════
//  PAGE ROUTING
// ══════════════════════════════════════
function clearFilter(){
  S.activeCat=null; S.activeSub=null;
  document.querySelectorAll('.sub-list').forEach(s=>s.classList.remove('open'));
  document.querySelectorAll('.cat-header').forEach(h=>h.classList.remove('open'));
  document.querySelectorAll('.sub-item').forEach(s=>s.classList.remove('active'));
  // Tüm Ürünler butonunu aktif yap
  const tumBtn = document.getElementById('btn-tumUrunler');
  if(tumBtn){ tumBtn.style.background='var(--green)'; tumBtn.style.color='#fff'; }
  document.getElementById('stockTitle').textContent='Tüm Ürünler';
  document.getElementById('stockSub').textContent='Stokta bulunan tüm ürünler';
  clearStockSearch();
  loadProducts();
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-stock').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
}

let _stockSearchVal = '';
function stockSearch(val){
  _stockSearchVal = val.trim();
  document.getElementById('stockSearchClear').style.display = val ? 'block' : 'none';
  renderProductsFiltered();
}

function clearStockSearch(){
  _stockSearchVal = '';
  const inp = document.getElementById('stockSearchInput');
  if(inp) inp.value = '';
  document.getElementById('stockSearchClear').style.display = 'none';
  renderProductsFiltered();
}

function renderProductsFiltered(){
  let prods = S.products;
  if(_stockSearchVal){
    const q = _stockSearchVal.toUpperCase();
    prods = prods.filter(p =>
      p.name.toUpperCase().includes(q) ||
      p.cat.toUpperCase().includes(q) ||
      p.sub.toUpperCase().includes(q)
    );
  }
  const g = document.getElementById('productGrid');
  if(!prods.length){
    g.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><p>"${_stockSearchVal}" için sonuç bulunamadı</p></div>`;
    return;
  }
  g.innerHTML = prods.map(p => {
    const pct=Math.min(100,(p.stock/Math.max(p.min_stock*3,p.stock+1))*100);
    const low=p.stock<=p.min_stock;
    return `<div class="product-card ${low?'stock-low':''}">
      <div class="pc-top"><div class="pc-name">${p.name}</div><div class="pc-cat">${p.sub}</div></div>
      <div class="pc-stock-row">
        <div class="pc-stock-num">${p.stock}</div>
        <div class="pc-stock-unit">${p.unit}</div>
        ${low?'<span class="badge badge-red" style="margin-left:auto">⚠️ Az Stok</span>':''}
      </div>
      <div class="pc-stock-bar"><div class="pc-stock-fill" style="width:${pct}%"></div></div>
      <div class="pc-price">Birim: <span>${Number(p.price).toLocaleString('tr-TR')} ₺</span></div>
      <div class="pc-history">📥 ${p.last_in||'—'} &nbsp;|&nbsp; 📤 ${p.last_out||'—'}</div>
      <div class="pc-actions">
        <button class="btn btn-green btn-sm" onclick="openModal('addStock','${p.id}')">＋ Stok</button>
        <button class="btn btn-outline btn-sm" onclick="openModal('removeStock','${p.id}')">− Çıkış</button>
        <button class="btn btn-outline btn-sm" onclick="openModal('editProduct','${p.id}')">✏️ Düzenle</button>
        <button class="btn btn-red btn-sm" onclick="deleteProduct('${p.id}','${p.name.replace(/'/g,"\\'")}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════
//  PAGE ROUTING
// ══════════════════════════════════════
// Sayfa cache — son yüklemeden kaç saniye geçti
const _pageCache = {};
const CACHE_TTL  = 45; // saniye

function _cacheGecerli(name){
  const t = _pageCache[name];
  return t && (Date.now()-t) < CACHE_TTL*1000;
}
function _cacheGuncelle(name){ _pageCache[name]=Date.now(); }
function _cacheSifirla(name){ delete _pageCache[name]; }

function showPage(name){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  const labels={stock:'Anasayfa',satis:'🛒 Satış Yap',dashboard:'Dashboard',alacaklar:'Alacaklar',verecekler:'Verecekler',eskiborc:'📒 Eski Borçlar'};
  document.querySelectorAll('.nav-btn').forEach(b=>{ if(b.textContent.trim()===labels[name]) b.classList.add('active'); });
  document.querySelectorAll('.mobile-nav-btn').forEach(b=>b.classList.remove('active'));
  const mnavMap={stock:'mnav-stock',satis:'mnav-satis',dashboard:'mnav-dashboard',alacaklar:'mnav-alacaklar',verecekler:'mnav-verecekler',eskiborc:'mnav-eskiborc'};
  if(mnavMap[name]) document.getElementById(mnavMap[name])?.classList.add('active');

  // Cache kontrolü — 45 saniye içinde aynı sayfaya tekrar gidilirse veriyi yeniden çekmez
  if(name==='stock'){
    if(!_cacheGecerli('stock')){ loadProducts(); _cacheGuncelle('stock'); }
    else { renderProductsFiltered(); } // sadece UI güncelle
  }
  if(name==='satis'){
    if(!_cacheGecerli('satis')){ loadSatisPage(); _cacheGuncelle('satis'); }
  }
  if(name==='dashboard'){
    loadDashboardInit(); // Dashboard her zaman taze veri çeksin
  }
  if(name==='alacaklar'){
    if(!_cacheGecerli('alacaklar')){ loadDebtors(); _cacheGuncelle('alacaklar'); }
    else { renderDebtorList(); if(S.activeDebtorId) renderDebtorDetail(S.activeDebtorId); updateAlacakOzet(); }
  }
  if(name==='verecekler'){
    if(!_cacheGecerli('verecekler')){ loadCreditors(); _cacheGuncelle('verecekler'); }
    else { renderCreditorList(); if(S.activeCreditorId) renderCreditorDetail(S.activeCreditorId); updateVerecekOzet(); }
  }
  if(name==='eskiborc'){
    if(!_cacheGecerli('eskiborc')){ renderEskiBorc(); _cacheGuncelle('eskiborc'); }
  }
}

// ══════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════
function resetTumBtn(){
  const b=document.getElementById('btn-tumUrunler');
  if(b){ b.style.background='var(--green-soft)'; b.style.color='var(--green)'; }
}

function toggleCat(key){
  const sub=document.getElementById('sub-'+key);
  const header=sub.previousElementSibling;
  const isOpen=sub.classList.contains('open');
  document.querySelectorAll('.sub-list').forEach(s=>s.classList.remove('open'));
  document.querySelectorAll('.cat-header').forEach(h=>h.classList.remove('open'));
  document.querySelectorAll('.sub-item').forEach(s=>s.classList.remove('active'));
  const catLabels={gubre:'Gübre',ilac:'İlaç',tohum:'Tohum',hasere:'Haşere',zehir:'Zehir',ekipman:'Ekipman'};
  if(!isOpen){
    sub.classList.add('open'); header.classList.add('open');
    S.activeCat=catLabels[key]; S.activeSub=null;
    document.getElementById('stockTitle').textContent=catLabels[key];
    document.getElementById('stockSub').textContent=catLabels[key]+' kategorisindeki ürünler';
    resetTumBtn();
  } else {
    S.activeCat=null; S.activeSub=null;
    document.getElementById('stockTitle').textContent='Tüm Ürünler';
    document.getElementById('stockSub').textContent='Stokta bulunan tüm ürünler';
    const b=document.getElementById('btn-tumUrunler');
    if(b){ b.style.background='var(--green)'; b.style.color='#fff'; }
  }
  clearStockSearch();
  loadProducts();
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-stock').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
}

function filterSub(sub){
  S.activeSub=sub; S.activeCat=null;
  document.querySelectorAll('.sub-item').forEach(s=>s.classList.toggle('active',s.textContent.trim()===sub));
  resetTumBtn();
  document.getElementById('stockTitle').textContent=sub;
  document.getElementById('stockSub').textContent=sub+' ürünleri';
  clearStockSearch();
  loadProducts();
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-stock').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  document.querySelectorAll('.mobile-nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('mnav-stock')?.classList.add('active');
  closeSidebar();
}

// ══════════════════════════════════════
//  PRODUCTS
// ══════════════════════════════════════
async function loadProducts(){ _cacheSifirla('stock');
  showLoad();
  try{
    let q=db.from('products').select('*').order('name');
    if(S.activeSub)      q=q.eq('sub',S.activeSub);
    else if(S.activeCat) q=q.eq('cat',S.activeCat);
    const {data,error}=await q;
    if(error) throw error;
    S.products=data||[];
    renderProducts();
    setDbStatus(true);
  }catch(e){
    if(e.status===409||String(e.message).includes('409')){
      setDbStatus(true);
    } else {
      toast('❌ Yüklenemedi: '+e.message,true);
      setDbStatus(false);
    }
  }
  finally{ hideLoad(); }
}

function renderProducts(){
  renderProductsFiltered();
}

async function deleteProduct(id,name){
  if(!confirm(`"${name}" ürününü silmek istediğinize emin misiniz?\n\nBu ürüne ait satış kayıtları da silinecek.`)) return;
  showLoad();
  // Önce bu ürüne ait satışları sil
  await db.from('sales').delete().eq('product_id',id);
  // Sonra ürünü sil
  const {error}=await db.from('products').delete().eq('id',id);
  hideLoad();
  if(error){toast('❌ '+error.message,true);return;}
  toast('🗑️ Ürün ve satış kayıtları silindi');
  loadProducts();
}

// ══════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════
let dashState = { from: null, to: null, cat: '', urun: '', quickLabel: 'Bugün' };

function todayStr(){ return new Date().toISOString().slice(0,10); }

function setDashQuick(mode, btn){
  document.querySelectorAll('.dash-qbtn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const now = new Date();
  const fmt = d => d.toISOString().slice(0,10);
  let from, to = fmt(now);
  if(mode==='today'){
    from = to;
    dashState.quickLabel = 'Bugün';
  } else if(mode==='yesterday'){
    const y = new Date(now); y.setDate(y.getDate()-1);
    from = to = fmt(y);
    dashState.quickLabel = 'Dün';
  } else if(mode==='week'){
    const w = new Date(now); w.setDate(w.getDate() - w.getDay() + 1);
    from = fmt(w);
    dashState.quickLabel = 'Bu Hafta';
  } else if(mode==='month'){
    from = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
    dashState.quickLabel = 'Bu Ay';
  } else if(mode==='year'){
    from = `${now.getFullYear()}-01-01`;
    dashState.quickLabel = 'Bu Yıl';
  } else {
    from = '2020-01-01';
    dashState.quickLabel = 'Tüm Zamanlar';
  }
  document.getElementById('dashDateFrom').value = from;
  document.getElementById('dashDateTo').value   = to;
  dashState.from = from; dashState.to = to;
  applyDashFilter();
}

function applyDashFilter(){
  dashState.from = document.getElementById('dashDateFrom').value || '2020-01-01';
  dashState.to   = document.getElementById('dashDateTo').value   || todayStr();
  dashState.cat  = document.getElementById('dashCatFilter').value;
  dashState.urun = document.getElementById('dashUrunFilter').value.trim();
  loadDashboard();
}

async function loadDashboard(){
  showLoad();
  try{
    const from = dashState.from || todayStr();
    const to   = dashState.to   || todayStr();

    let q = db.from('sales').select('*')
      .gte('sale_date', from)
      .lte('sale_date', to)
      .order('sale_date',{ascending:false})
      .order('created_at',{ascending:false});

    if(dashState.cat)  q = q.eq('cat', dashState.cat);
    if(dashState.urun) q = q.ilike('product_name', `%${dashState.urun}%`);

    const [{data:sales},{data:products}] = await Promise.all([
      q,
      db.from('products').select('id,stock,min_stock'),
    ]);

    const s = sales||[], prods = products||[];

    // Ödeme türüne göre ayır
    const nakitSatislar  = s.filter(x=>!x.odeme_turu||x.odeme_turu==='nakit');
    const kismiSatislar  = s.filter(x=>x.odeme_turu==='kismi');
    const alacakSatislar = s.filter(x=>x.odeme_turu==='alacak');
    const askidaSatislar = [...kismiSatislar,...alacakSatislar];

    const nakitRev  = nakitSatislar.reduce((a,x)=>a+Number(x.total),0);
    const kismiRev  = kismiSatislar.reduce((a,x)=>a+Number(x.total),0);
    const alacakRev = alacakSatislar.reduce((a,x)=>a+Number(x.total),0);
    const askidaRev = kismiRev+alacakRev;
    const toplamRev = s.reduce((a,x)=>a+Number(x.total),0);
    const qty = s.reduce((a,x)=>a+Number(x.qty),0);
    const low = prods.filter(p=>p.stock<=p.min_stock).length;

    const isOneDay = from === to;
    const label = isOneDay ? (from===todayStr()?'Bugün':from) : `${from} – ${to}`;

    document.getElementById('dashCards').innerHTML=`
      <div class="dash-card highlight">
        <div class="dash-card-label">💵 Nakit Gelir</div>
        <div class="dash-card-value">${nakitRev.toLocaleString('tr-TR')} ₺</div>
        <div class="dash-card-sub">${nakitSatislar.length} nakit işlem · ${label}</div>
      </div>
      ${askidaRev>0?`
      <div class="dash-card" style="border-color:#ffe082;background:#fffde7">
        <div class="dash-card-label" style="color:var(--orange)">⏳ Askıda (Alacak)</div>
        <div class="dash-card-value" style="color:var(--orange)">${askidaRev.toLocaleString('tr-TR')} ₺</div>
        <div class="dash-card-sub">${askidaSatislar.length} işlem henüz tahsil edilmedi</div>
      </div>`:''}
      <div class="dash-card">
        <div class="dash-card-label">🧾 Toplam İşlem</div>
        <div class="dash-card-value">${s.length}</div>
        <div class="dash-card-sub">${label}</div>
      </div>
      <div class="dash-card">
        <div class="dash-card-label">🛒 Satılan Birim</div>
        <div class="dash-card-value">${qty}</div>
        <div class="dash-card-sub">Toplam adet/kg/lt</div>
      </div>
      <div class="dash-card">
        <div class="dash-card-label">⚠️ Az Stok</div>
        <div class="dash-card-value" style="color:var(--red)">${low}</div>
        <div class="dash-card-sub">Minimum stokta</div>
      </div>
      ${s.length > 0 ? `
      <div class="dash-card">
        <div class="dash-card-label">📈 Toplam Ciro</div>
        <div class="dash-card-value">${toplamRev.toLocaleString('tr-TR')} ₺</div>
        <div class="dash-card-sub">Nakit + askıda</div>
      </div>` : ''}
    `;

    document.getElementById('dashTableTitle').textContent = `📋 Satışlar — ${label}`;
    document.getElementById('dashTableMeta').textContent = s.length > 0
      ? `${nakitSatislar.length} nakit · ${askidaSatislar.length} askıda · Toplam: ${toplamRev.toLocaleString('tr-TR')} ₺`
      : '';

    const odemeLabel=(t)=>{
      if(!t||t==='nakit') return '';
      if(t==='alacak') return '<span style="display:inline-block;font-size:10px;font-weight:700;background:#fff8e1;color:#f57c00;border:1px solid #ffe082;border-radius:4px;padding:1px 6px;margin-left:4px">💳 Alacağa atıldı</span>';
      if(t==='kismi')  return '<span style="display:inline-block;font-size:10px;font-weight:700;background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;border-radius:4px;padding:1px 6px;margin-left:4px">💙 Kısmi ödeme</span>';
      return '';
    };
    const satirBg=(t)=>{
      if(t==='alacak') return 'background:#fffde7';
      if(t==='kismi')  return 'background:#f3f9ff';
      return '';
    };

    const tb = document.getElementById('salesTableBody');
    tb.innerHTML = s.length
      ? s.map(x=>`<tr style="${satirBg(x.odeme_turu)}">
          <td><b>${x.product_name}</b>${odemeLabel(x.odeme_turu)}</td>
          <td><span class="badge badge-green">${x.cat}</span></td>
          <td>${x.qty} ${x.unit}</td>
          <td>${Number(x.price).toLocaleString('tr-TR')} ₺</td>
          <td><b style="color:${x.odeme_turu&&x.odeme_turu!=='nakit'?'var(--orange)':'inherit'}">${Number(x.total).toLocaleString('tr-TR')} ₺</b></td>
          <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-3)">${x.sale_date}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-3)">${x.sale_time||'—'}</td>
        </tr>`).join('')
      : `<tr><td colspan="7" style="text-align:center;color:var(--text-3);padding:32px">Bu filtre için satış kaydı bulunamadı</td></tr>`;

  }catch(e){ toast('❌ '+e.message,true); }
  finally{ hideLoad(); }
}

async function loadDashboardInit(){
  // Varsayılan: bugün
  const t = todayStr();
  document.getElementById('dashDateFrom').value = t;
  document.getElementById('dashDateTo').value   = t;
  dashState.from = t; dashState.to = t;
  await loadDashboard();
}

// ══════════════════════════════════════
//  TAM VERİ YEDEĞİ — XLSX
// ══════════════════════════════════════
async function tamYedekAl(){
  const btn = document.getElementById('yedekBtn');
  btn.innerHTML = '⏳ Veriler çekiliyor...';
  btn.disabled = true;

  try{
    btn.innerHTML = '⏳ Tablolar yükleniyor...';

    const [
      {data: products},
      {data: sales},
      {data: debtors},
      {data: debtor_transactions},
      {data: debt_payments},
      {data: creditors},
      {data: creditor_transactions},
      {data: creditor_payments},
    ] = await Promise.all([
      db.from('products').select('*').order('cat').order('name'),
      db.from('sales').select('*').order('sale_date',{ascending:false}).order('sale_time',{ascending:false}),
      db.from('debtors').select('*').order('name'),
      db.from('debtor_transactions').select('*').order('debtor_id').order('date',{ascending:false}),
      db.from('debt_payments').select('*').order('transaction_id').order('date',{ascending:false}),
      db.from('creditors').select('*').order('name'),
      db.from('creditor_transactions').select('*').order('creditor_id').order('date',{ascending:false}),
      db.from('creditor_payments').select('*').order('transaction_id').order('date',{ascending:false}),
    ]);

    btn.innerHTML = '⏳ Excel hazırlanıyor...';

    const wb = XLSX.utils.book_new();
    const simdi = new Date().toLocaleString('tr-TR');
    const tarihDosya = new Date().toISOString().slice(0,10);

    // ─── Yardımcı fonksiyonlar ────────────────────────────────────
    function bas(ws, r, c, val, bold=false, bg=null, numFmt=null){
      const addr = XLSX.utils.encode_cell({r,c});
      ws[addr] = {v: val, t: typeof val==='number'?'n':'s'};
      if(bold||bg||numFmt) ws[addr].s = {
        font:{bold},
        fill: bg?{fgColor:{rgb:bg}}:undefined,
        numFmt: numFmt||undefined,
        alignment:{vertical:'center'}
      };
    }

    function baslikSatiri(ws, r, basliklar, bg='1B5E20', fg='FFFFFF'){
      basliklar.forEach((b,c)=>{
        const addr=XLSX.utils.encode_cell({r,c});
        ws[addr]={v:b,t:'s',s:{font:{bold:true,color:{rgb:fg}},fill:{fgColor:{rgb:bg}},alignment:{horizontal:'center',vertical:'center'}}};
      });
    }

    function setRef(ws, maxR, maxC){
      ws['!ref']=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:maxR,c:maxC}});
    }

    // ─── 1. ÖZET ────────────────────────────────────────────────
    {
      const ws = {};
      const toplamSatis=(sales||[]).reduce((a,s)=>a+Number(s.total),0);
      const toplamBorc=(debtor_transactions||[]).reduce((a,t)=>a+Number(t.total),0);
      const toplamOdenenBorc=(debt_payments||[]).reduce((a,p)=>a+Number(p.amount),0);
      const kalanAlacak=Math.max(0,toplamBorc-toplamOdenenBorc);
      const toplamAlim=(creditor_transactions||[]).reduce((a,t)=>a+Number(t.total),0);
      const toplamOdenenAlim=(creditor_payments||[]).reduce((a,p)=>a+Number(p.amount),0);
      const kalanVerecek=Math.max(0,toplamAlim-toplamOdenenAlim);
      const azStok=(products||[]).filter(p=>p.stock<=p.min_stock).length;

      let r=0;
      bas(ws,r,0,'Zinar Zirai İlaç Satışı — VERİ YEDEĞİ',true,'0D7A00'); bas(ws,r,1,'',false,'0D7A00');
      r++; bas(ws,r,0,'Yedek Tarihi'); bas(ws,r,1,simdi);
      r++; bas(ws,r,0,'Toplam Kayıt'); bas(ws,r,1,
        (products||[]).length+(sales||[]).length+(debtor_transactions||[]).length+(creditor_transactions||[]).length);
      r+=2;

      baslikSatiri(ws,r,['BÖLÜM','DEĞER / TUTAR'],'2E7D32');
      r++;
      const satirlar=[
        ['📦 Stokta Ürün Çeşidi', (products||[]).length],
        ['⚠️ Az Stokta Ürün', azStok],
        ['🛒 Toplam Satış İşlemi', (sales||[]).length],
        ['💰 Toplam Satış Tutarı', toplamSatis.toLocaleString('tr-TR')+' ₺'],
        ['',''],
        ['💳 Alacaklı Kişi Sayısı', (debtors||[]).length],
        ['💳 Toplam Alacak Tutarı', toplamBorc.toLocaleString('tr-TR')+' ₺'],
        ['💳 Tahsil Edilen', toplamOdenenBorc.toLocaleString('tr-TR')+' ₺'],
        ['💳 KAlAN ALACAK', kalanAlacak.toLocaleString('tr-TR')+' ₺'],
        ['',''],
        ['📦 Tedarikçi Sayısı', (creditors||[]).length],
        ['📦 Toplam Alım Tutarı', toplamAlim.toLocaleString('tr-TR')+' ₺'],
        ['📦 Ödenen', toplamOdenenAlim.toLocaleString('tr-TR')+' ₺'],
        ['📦 KALAN BORÇ', kalanVerecek.toLocaleString('tr-TR')+' ₺'],
      ];
      satirlar.forEach(([k,v],i)=>{
        const bg = k.includes('KALAN')?'FFF9C4':k===''?null:(i%2===0?'F1F8E9':null);
        bas(ws,r+i,0,k,k.includes('KALAN'),bg||undefined);
        bas(ws,r+i,1,v,k.includes('KALAN'),bg||undefined);
      });
      setRef(ws,r+satirlar.length,1);
      ws['!cols']=[{wch:35},{wch:25}];
      XLSX.utils.book_append_sheet(wb,ws,'📋 Özet');
    }

    // ─── 2. STOK LİSTESİ — Kategoriye Göre Gruplu ───────────────
    {
      const ws={};
      let r=0;

      // Başlık bandı
      bas(ws,r,0,'STOK LİSTESİ — KATEGORİ BAZLI',true,'0D7A00');
      for(let c=1;c<=11;c++){
        const a=XLSX.utils.encode_cell({r,c});
        ws[a]={v:'',t:'s',s:{fill:{fgColor:{rgb:'0D7A00'}}}};
      }
      r++;
      bas(ws,r,0,'Yedek Tarihi: '+simdi); r+=2;

      // Sütun başlıkları
      const kolonlar=['Ürün Adı','Mevcut Stok','Birim','Satış Fiyatı (₺)',
        'Stok Değeri (₺)','Min. Stok','Durum','Son Giriş','Son Çıkış',
        'Toplam Satılan','Toplam Satış Tutarı (₺)'];
      baslikSatiri(ws,r,['','...KATEGORİ / ALT KATEGORİ / ÜRÜN...','','','','','','','','','',''],'1B5E20');
      r++;
      baslikSatiri(ws,r,['#',...kolonlar],'2E7D32');
      r++;

      // Kategori → alt kategori → ürünler gruplandır
      const katMap={};
      (products||[]).forEach(p=>{
        if(!katMap[p.cat]) katMap[p.cat]={};
        if(!katMap[p.cat][p.sub]) katMap[p.cat][p.sub]=[];
        katMap[p.cat][p.sub].push(p);
      });

      // Her ürünün satış istatistiklerini hesapla
      const satisStat={};
      (sales||[]).forEach(s=>{
        if(!satisStat[s.product_name]){satisStat[s.product_name]={qty:0,total:0};}
        satisStat[s.product_name].qty+=Number(s.qty);
        satisStat[s.product_name].total+=Number(s.total);
      });

      let siraNo=1;

      const katRenkler={
        'Gübre':   {bg:'E8F5E9',hbg:'1B5E20'},
        'İlaç':    {bg:'E3F2FD',hbg:'0D47A1'},
        'Tohum':   {bg:'FFF8E1',hbg:'E65100'},
        'Haşere':  {bg:'FCE4EC',hbg:'880E4F'},
        'Zehir':   {bg:'EDE7F6',hbg:'4A148C'},
        'Ekipman': {bg:'E0F7FA',hbg:'006064'},
      };

      Object.keys(katMap).sort().forEach(kat=>{
        const renkler=katRenkler[kat]||{bg:'F5F5F5',hbg:'424242'};
        const katUrunler=Object.values(katMap[kat]).flat();
        const katToplamStok=katUrunler.reduce((a,p)=>a+Number(p.stock),0);
        const katToplamDeger=katUrunler.reduce((a,p)=>a+Number(p.stock)*Number(p.price),0);
        const katTukenmiş=katUrunler.filter(p=>p.stock<=0).length;
        const katAzStok=katUrunler.filter(p=>p.stock>0&&p.stock<=p.min_stock).length;

        // Kategori başlık satırı
        const katBaslik=`📁 ${kat.toUpperCase()} (${katUrunler.length} ürün)`;
        bas(ws,r,0,katBaslik,true,renkler.hbg.replace('#',''));
        // renkli span
        for(let c=1;c<=11;c++){
          const a=XLSX.utils.encode_cell({r,c});
          ws[a]={v:c===1?`${katUrunler.length} ürün  |  Stok değeri: ${katToplamDeger.toLocaleString('tr-TR')} ₺  |  Tükenmiş: ${katTukenmiş}  |  Az Stok: ${katAzStok}`:''
            ,t:'s',s:{font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:renkler.hbg.replace('#','')}}}};
        }
        r++;

        Object.keys(katMap[kat]).sort().forEach(sub=>{
          const subUrunler=katMap[kat][sub];
          const subToplamDeger=subUrunler.reduce((a,p)=>a+Number(p.stock)*Number(p.price),0);

          // Alt kategori başlık satırı
          const subBaslik=`  └─ ${sub} (${subUrunler.length})`;
          bas(ws,r,0,subBaslik,true,renkler.bg.replace('#',''));
          for(let c=1;c<=11;c++){
            const a=XLSX.utils.encode_cell({r,c});
            ws[a]={v:c===1?`${subUrunler.length} ürün  |  Toplam stok değeri: ${subToplamDeger.toLocaleString('tr-TR')} ₺`:'',
              t:'s',s:{fill:{fgColor:{rgb:renkler.bg.replace('#','')}},font:{bold:true,color:{rgb:'1B5E20'}}}};
          }
          r++;

          // Ürün satırları
          subUrunler.sort((a,b)=>a.name.localeCompare(b.name,'tr')).forEach(p=>{
            const durum=p.stock<=0?'❌ TÜKENDİ':p.stock<=p.min_stock?'⚠️ AZ STOK':'✅ YETERLİ';
            const satBg=p.stock<=0?'FFCDD2':p.stock<=p.min_stock?'FFF9C4':null;
            const stokDegeri=Number(p.stock)*Number(p.price);
            const satIstat=satisStat[p.name]||{qty:0,total:0};
            const satirVeri=[
              siraNo,
              p.name,
              p.stock,
              p.unit,
              p.price,
              stokDegeri,
              p.min_stock,
              durum,
              p.last_in||'—',
              p.last_out||'—',
              satIstat.qty||0,
              satIstat.total||0,
            ];
            satirVeri.forEach((v,c)=>{
              const addr=XLSX.utils.encode_cell({r,c});
              ws[addr]={v:v??'',t:typeof v==='number'?'n':'s'};
              if(satBg) ws[addr].s={fill:{fgColor:{rgb:satBg}}};
            });
            siraNo++; r++;
          });

          // Alt kategori toplam satırı
          const subToplamStok=subUrunler.reduce((a,p)=>a+Number(p.stock),0);
          bas(ws,r,0,'    TOPLAM',true,'C8E6C9');
          bas(ws,r,1,'',false,'C8E6C9');
          bas(ws,r,2,subToplamStok,true,'C8E6C9');
          bas(ws,r,5,subToplamDeger,true,'C8E6C9');
          for(let c=3;c<=11;c++){
            if(c===2||c===5) continue;
            const a=XLSX.utils.encode_cell({r,c});
            ws[a]={v:'',t:'s',s:{fill:{fgColor:{rgb:'C8E6C9'}}}};
          }
          r++;
        });

        // Kategori toplam satırı
        bas(ws,r,0,`${kat} GENEL TOPLAM`,true,'A5D6A7');
        bas(ws,r,2,katToplamStok,true,'A5D6A7');
        bas(ws,r,5,katToplamDeger,true,'A5D6A7');
        for(let c=1;c<=11;c++){
          if(c===2||c===5) continue;
          const a=XLSX.utils.encode_cell({r,c});
          ws[a]={v:'',t:'s',s:{fill:{fgColor:{rgb:'A5D6A7'}}}};
        }
        r+=2;
      });

      // GENEL TOPLAM
      const genToplamDeger=(products||[]).reduce((a,p)=>a+Number(p.stock)*Number(p.price),0);
      const genToplamSatis=(sales||[]).reduce((a,s)=>a+Number(s.total),0);
      bas(ws,r,0,'📊 GENEL TOPLAM',true,'1B5E20');
      bas(ws,r,1,`${(products||[]).length} farklı ürün`,true,'1B5E20');
      bas(ws,r,5,genToplamDeger,true,'1B5E20');
      bas(ws,r,11,genToplamSatis,true,'1B5E20');
      for(let c=2;c<=11;c++){
        if(c===5||c===11) continue;
        const a=XLSX.utils.encode_cell({r,c});
        ws[a]={v:'',t:'s',s:{fill:{fgColor:{rgb:'1B5E20'}}}};
      }

      setRef(ws,r,11);
      ws['!cols']=[{wch:5},{wch:38},{wch:10},{wch:7},{wch:16},{wch:18},{wch:10},{wch:14},{wch:12},{wch:12},{wch:14},{wch:20}];
      // Satır yükseklikleri
      ws['!rows']=[{hpt:20},{hpt:16},{hpt:16}];
      XLSX.utils.book_append_sheet(wb,ws,'🌿 Stok Listesi');
    }

    // ─── 3. SATIŞ GEÇMİŞİ ────────────────────────────────────────
    {
      const ws={};
      const basliklar=['Tarih','Saat','Ürün Adı','Kategori','Miktar','Birim','Birim Fiyat (₺)','Toplam (₺)','Ödeme Türü'];
      baslikSatiri(ws,0,basliklar,'1565C0');

      (sales||[]).forEach((s,i)=>{
        const r=i+1;
        [s.sale_date,s.sale_time||'—',s.product_name,s.cat,s.qty,s.unit,s.price,s.total]
          .forEach((v,c)=>{
            const addr=XLSX.utils.encode_cell({r,c});
            ws[addr]={v:v??'',t:typeof v==='number'?'n':'s'};
          });
      });
      // TOPLAM satırı
      const totR=(sales||[]).length+2;
      bas(ws,totR,0,'GENEL TOPLAM',true,'E8F5E9');
      bas(ws,totR,7,(sales||[]).reduce((a,s)=>a+Number(s.total),0),true,'E8F5E9');
      bas(ws,totR,8,'Toplam',true,'E8F5E9');
      setRef(ws,totR,basliklar.length-1);
      ws['!cols']=[{wch:12},{wch:8},{wch:35},{wch:12},{wch:8},{wch:7},{wch:16},{wch:14},{wch:12}];
      XLSX.utils.book_append_sheet(wb,ws,'🛒 Satış Geçmişi');
    }

    // ─── 4. ALACAKLAR (Kişi + işlem + ödeme birleşik) ───────────
    {
      const ws={};
      const basliklar=['Kişi Adı','TC Kimlik','Telefon','Köy/Mahalle','İşlem Tarihi','Ürün','Miktar','Birim',
        'Birim Fiyat (₺)','İşlem Tutarı (₺)','Ödenen (₺)','Kalan (₺)','Durum',
        'Ödeme Tarihleri','Ödeme Notları'];
      baslikSatiri(ws,0,basliklar,'B71C1C');
      let r=1;

      (debtors||[]).forEach(d=>{
        const dtxs=(debtor_transactions||[]).filter(t=>t.debtor_id===d.id)
          .sort((a,b)=>a.date.localeCompare(b.date));
        const topBorc=dtxs.reduce((a,t)=>a+Number(t.total),0);
        const topOdenen=(debt_payments||[])
          .filter(p=>dtxs.find(t=>t.id===p.transaction_id))
          .reduce((a,p)=>a+Number(p.amount),0);
        const topKalan=Math.max(0,topBorc-topOdenen);

        // Kişi başlık satırı
        bas(ws,r,0,d.name,true,'FFCCBC');
        bas(ws,r,1,d.tc_kimlik||'—',false,'FFCCBC');
        bas(ws,r,2,d.telefon||'—',false,'FFCCBC');
        bas(ws,r,3,d.koy||'—',false,'FFCCBC');
        bas(ws,r,9,topBorc,true,'FFCCBC');
        bas(ws,r,10,topOdenen,true,'FFCCBC');
        bas(ws,r,11,topKalan,true,'FFCCBC');
        bas(ws,r,12,topKalan<=0?'✅ TAM ÖDENDİ':'❌ BORÇ VAR',true,'FFCCBC');
        r++;

        if(dtxs.length===0){
          bas(ws,r,1,'— İşlem yok —',false,'FFF8E1');
          r++;
        } else {
          dtxs.forEach(t=>{
            const pays=(debt_payments||[]).filter(p=>p.transaction_id===t.id)
              .sort((a,b)=>a.date.localeCompare(b.date));
            const txOdenen=pays.reduce((a,p)=>a+Number(p.amount),0);
            const txKalan=Math.max(0,Number(t.total)-txOdenen);
            const tamOdendi=txKalan<=0;
            const bg=tamOdendi?'F1F8E9':'FFF9C4';
            const odTarihler=pays.map(p=>p.date).join(', ')||'—';
            const odNotlar=pays.map(p=>p.note||'').filter(Boolean).join(', ')||'—';

            [d.name,d.tc_kimlik||'—',d.telefon||'—',d.koy||'—',t.date,t.product,t.qty,t.unit,t.price,t.total,txOdenen,txKalan,
              tamOdendi?'✅ Ödendi':'⏳ Bekliyor',odTarihler,odNotlar]
              .forEach((v,c)=>{
                const addr=XLSX.utils.encode_cell({r,c});
                ws[addr]={v:v??'',t:typeof v==='number'?'n':'s',
                  s:{fill:{fgColor:{rgb:bg}}}};
              });
            r++;
          });
        }
        r++; // kişiler arası boşluk
      });

      setRef(ws,r,basliklar.length-1);
      ws['!cols']=[{wch:20},{wch:14},{wch:14},{wch:16},{wch:12},{wch:28},{wch:8},{wch:7},{wch:14},{wch:16},{wch:14},{wch:12},{wch:14},{wch:22},{wch:22}];
      XLSX.utils.book_append_sheet(wb,ws,'💳 Alacaklar Detay');
    }

    // ─── 5. VERECEKler (Tedarikçi + alım + ödeme birleşik) ──────
    {
      const ws={};
      const basliklar=['Tedarikçi','Alım Tarihi','Ürün','Miktar','Birim',
        'Birim Fiyat (₺)','Alım Tutarı (₺)','İade Miktarı','İade Tarihi',
        'Ödenen (₺)','Kalan Borç (₺)','Stoğa Eklendi','Ödeme Tarihleri','Ödeme Notları'];
      baslikSatiri(ws,0,basliklar,'4A148C');
      let r=1;

      (creditors||[]).forEach(c=>{
        const ctxs=(creditor_transactions||[]).filter(t=>t.creditor_id===c.id)
          .sort((a,b)=>a.date.localeCompare(b.date));
        const topAlim=ctxs.reduce((a,t)=>a+Number(t.total),0);
        const topOdenen=(creditor_payments||[])
          .filter(p=>ctxs.find(t=>t.id===p.transaction_id))
          .reduce((a,p)=>a+Number(p.amount),0);
        const topKalan=Math.max(0,topAlim-topOdenen);

        // Tedarikçi başlık satırı
        bas(ws,r,0,c.name,true,'E1BEE7');
        bas(ws,r,6,topAlim,true,'E1BEE7');
        bas(ws,r,9,topOdenen,true,'E1BEE7');
        bas(ws,r,10,topKalan,true,'E1BEE7');
        bas(ws,r,11,topKalan<=0?'✅ ÖDENDİ':'❌ BORÇ VAR',true,'E1BEE7');
        r++;

        if(ctxs.length===0){
          bas(ws,r,1,'— Alım yok —',false,'FFF8E1');
          r++;
        } else {
          ctxs.forEach(t=>{
            const pays=(creditor_payments||[]).filter(p=>p.transaction_id===t.id)
              .sort((a,b)=>a.date.localeCompare(b.date));
            const txOdenen=pays.reduce((a,p)=>a+Number(p.amount),0);
            const txKalan=Math.max(0,Number(t.total)-txOdenen);
            const tamOdendi=txKalan<=0;
            const bg=tamOdendi?'F3E5F5':'FFF9C4';
            const odTarihler=pays.map(p=>p.date).join(', ')||'—';
            const odNotlar=pays.map(p=>p.note||'').filter(Boolean).join(', ')||'—';

            [c.name,t.date,t.product,t.qty,t.unit,t.price,t.total,
              t.iade_qty||0,t.iade_date||'—',txOdenen,txKalan,
              t.stoga_eklendi?'✅ Evet':'❌ Hayır',odTarihler,odNotlar]
              .forEach((v,c2)=>{
                const addr=XLSX.utils.encode_cell({r,c:c2});
                ws[addr]={v:v??'',t:typeof v==='number'?'n':'s',
                  s:{fill:{fgColor:{rgb:bg}}}};
              });
            r++;
          });
        }
        r++;
      });

      setRef(ws,r,basliklar.length-1);
      ws['!cols']=[{wch:20},{wch:12},{wch:28},{wch:8},{wch:7},{wch:14},{wch:16},{wch:12},{wch:12},{wch:12},{wch:14},{wch:14},{wch:22},{wch:22}];
      XLSX.utils.book_append_sheet(wb,ws,'📦 Verecekler Detay');
    }

    // ─── 6. HAM VERİ (geri yükleme için) ────────────────────────
    function ekHamSayfa(veri, ad){
      if(!veri||!veri.length){ XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Veri yok']]),ad); return; }
      const kolonlar=Object.keys(veri[0]);
      const satirlar=veri.map(r=>kolonlar.map(k=>r[k]??''));
      const ws=XLSX.utils.aoa_to_sheet([kolonlar,...satirlar]);
      ws['!cols']=kolonlar.map(()=>({wch:16}));
      XLSX.utils.book_append_sheet(wb,ws,ad);
    }
    ekHamSayfa(products,              'RAW_products');
    ekHamSayfa(sales,                 'RAW_sales');
    ekHamSayfa(debtors,               'RAW_debtors');
    ekHamSayfa(debtor_transactions,   'RAW_debtor_tx');
    ekHamSayfa(debt_payments,         'RAW_debt_pay');
    ekHamSayfa(creditors,             'RAW_creditors');
    ekHamSayfa(creditor_transactions, 'RAW_creditor_tx');
    ekHamSayfa(creditor_payments,     'RAW_creditor_pay');

    // ── İndir ──
    const dosyaAdi=`tarim-stok-yedek_${tarihDosya}.xlsx`;
    XLSX.writeFile(wb, dosyaAdi);
    toast(`✅ Yedek indirildi — ${dosyaAdi} (${wb.SheetNames.length} sayfa)`);

  }catch(e){
    toast('❌ Yedek alınamadı: '+e.message, true);
    console.error(e);
  }finally{
    btn.innerHTML='<span style="font-size:16px">🛡️</span> Tam Yedek Al';
    btn.disabled=false;
  }
}

// ══════════════════════════════════════
//  PDF EXPORT — Tarayıcı Print Motoru
// ══════════════════════════════════════
async function exportPDF(){
  const btn = document.getElementById('pdfBtn');
  btn.innerHTML = '⏳ Hazırlanıyor...';
  btn.disabled = true;

  try{
    const from = dashState.from || todayStr();
    const to   = dashState.to   || todayStr();
    const catLabel  = dashState.cat  || 'Tüm Kategoriler';
    const urunLabel = dashState.urun || '—';
    const donemLabel = from === to ? from : `${from} – ${to}`;
    const simdi = new Date().toLocaleString('tr-TR');

    // Tablodaki satırları topla
    const rows = [];
    document.querySelectorAll('#salesTableBody tr').forEach(tr=>{
      const cells = tr.querySelectorAll('td');
      if(cells.length >= 7){
        rows.push({
          urun:    cells[0].textContent.trim(),
          kat:     cells[1].textContent.trim(),
          miktar:  cells[2].textContent.trim(),
          fiyat:   cells[3].textContent.trim(),
          toplam:  cells[4].textContent.trim(),
          tarih:   cells[5].textContent.trim(),
          saat:    cells[6].textContent.trim(),
        });
      }
    });

    // Toplam hesapla
    let genelToplam = 0;
    rows.forEach(r=>{
      genelToplam += parseFloat(r.toplam.replace(/[^\d,]/g,'').replace(',','.')) || 0;
    });

    // PDF HTML içeriği oluştur
    const satirlar = rows.length === 0
      ? `<tr><td colspan="7" class="bos">Bu filtre için satış kaydı bulunamadı.</td></tr>`
      : rows.map((r,i)=>`
          <tr class="${i%2===0?'cift':'tek'}">
            <td class="bold">${r.urun}</td>
            <td class="center"><span class="badge">${r.kat}</span></td>
            <td class="center">${r.miktar}</td>
            <td class="right">${r.fiyat}</td>
            <td class="right bold green">${r.toplam}</td>
            <td class="center mono">${r.tarih}</td>
            <td class="center mono">${r.saat}</td>
          </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8"/>
<title>Satış Raporu — ${donemLabel}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
  *{ box-sizing:border-box; margin:0; padding:0; }
  body{ font-family:'Nunito',sans-serif; font-size:11px; color:#1a2e1a; background:#fff; padding:0 20px 20px; }

  /* SAYFA AYARLARI */
  @page{ size:A4; margin:14mm 18mm 16mm 18mm; }
  @media print{
    body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; padding:0; }
    .no-print{ display:none; }
  }

  /* BAŞLIK */
  .header{ background:#0d7a00; color:#fff; padding:14px 22px; border-radius:8px 8px 0 0; display:flex; justify-content:space-between; align-items:center; margin:0 -20px; }
  .header-left{ display:flex; align-items:center; gap:12px; }
  .logo{ width:38px; height:38px; background:#e8f5e9; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:900; color:#0d7a00; font-size:14px; flex-shrink:0; }
  .baslik{ font-size:16px; font-weight:800; }
  .alt-baslik{ font-size:10px; opacity:.8; margin-top:2px; }
  .header-right{ text-align:right; font-size:10px; opacity:.85; line-height:1.8; }

  /* FİLTRE BİLGİSİ */
  .filtre-kutu{ background:#f0faf0; border:1px solid #c8e6c9; border-top:none; padding:10px 22px; display:flex; gap:36px; margin:0 -20px 18px; }
  .filtre-item label{ font-size:9px; font-weight:700; color:#4a6a4a; text-transform:uppercase; letter-spacing:.06em; display:block; margin-bottom:3px; }
  .filtre-item span{ font-size:11px; font-weight:700; color:#0d7a00; }

  /* ÖZET KARTLAR */
  .ozet{ display:flex; gap:12px; margin-bottom:18px; }
  .kart{ flex:1; padding:12px 16px; border-radius:8px; border:1px solid #e0e0e0; }
  .kart.vurgu{ background:#0d7a00; border-color:#0d7a00; color:#fff; }
  .kart-label{ font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; opacity:.7; margin-bottom:5px; }
  .kart.vurgu .kart-label{ opacity:.8; }
  .kart-deger{ font-size:17px; font-weight:900; color:#0d7a00; font-family:'JetBrains Mono',monospace; }
  .kart.vurgu .kart-deger{ color:#fff; }
  .kart-alt{ font-size:9px; color:#888; margin-top:3px; }
  .kart.vurgu .kart-alt{ color:rgba(255,255,255,.7); }

  /* TABLO */
  .tablo-baslik{ font-size:12px; font-weight:800; color:#0d7a00; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; }
  .tablo-meta{ font-size:10px; color:#888; font-weight:600; }
  table{ width:100%; border-collapse:collapse; }
  thead tr{ background:#0d7a00; color:#fff; }
  th{ padding:9px 12px; text-align:left; font-size:10px; font-weight:700; letter-spacing:.04em; }
  th.center{ text-align:center; }
  th.right{ text-align:right; }
  td{ padding:8px 12px; font-size:10px; border-bottom:1px solid #f0f0f0; }
  tr.cift td{ background:#fff; }
  tr.tek  td{ background:#f8fdf8; }
  td.center{ text-align:center; }
  td.right{ text-align:right; }
  td.bold{ font-weight:700; }
  td.green{ color:#0d7a00; }
  td.mono{ font-family:'JetBrains Mono',monospace; font-size:10px; color:#888; }
  td.bos{ text-align:center; color:#aaa; padding:32px; }
  .badge{ background:#e8f5e9; color:#0d7a00; padding:3px 9px; border-radius:50px; font-size:9px; font-weight:700; }

  /* TOPLAM SATIRI */
  .toplam-satir td{ background:#e8f5e9 !important; font-weight:800; border-top:2px solid #0d7a00; font-size:11px; padding:10px 12px; }
  .toplam-satir td.green{ color:#0d7a00; font-size:13px; }

  /* ALT BİLGİ */
  .footer{ margin-top:18px; padding-top:10px; border-top:1px solid #e0e0e0; display:flex; justify-content:space-between; font-size:9px; color:#aaa; }
</style>
</head>
<body>

  <!-- BAŞLIK -->
  <div class="header">
    <div class="header-left">
      <div class="logo">TS</div>
      <div>
        <div class="baslik">Zinar Zirai İlaç Satışı</div>
        <div class="alt-baslik">Satış Raporu</div>
      </div>
    </div>
    <div class="header-right">
      <div>Oluşturulma: ${simdi}</div>
      <div>Dönem: ${donemLabel}</div>
    </div>
  </div>

  <!-- FİLTRE BİLGİSİ -->
  <div class="filtre-kutu">
    <div class="filtre-item"><label>Dönem</label><span>${donemLabel}</span></div>
    <div class="filtre-item"><label>Kategori</label><span>${catLabel}</span></div>
    <div class="filtre-item"><label>Ürün Filtresi</label><span>${urunLabel}</span></div>
    <div class="filtre-item"><label>Toplam Kayıt</label><span>${rows.length} adet</span></div>
  </div>

  <!-- ÖZET KARTLAR -->
  <div class="ozet">
    <div class="kart vurgu">
      <div class="kart-label">Toplam Kazanç</div>
      <div class="kart-deger">${genelToplam.toLocaleString('tr-TR')} ₺</div>
      <div class="kart-alt">${donemLabel}</div>
    </div>
    <div class="kart">
      <div class="kart-label">İşlem Sayısı</div>
      <div class="kart-deger">${rows.length}</div>
      <div class="kart-alt">Toplam satış kaydı</div>
    </div>
    <div class="kart">
      <div class="kart-label">Ortalama / İşlem</div>
      <div class="kart-deger">${rows.length > 0 ? Math.round(genelToplam/rows.length).toLocaleString('tr-TR')+' ₺' : '—'}</div>
      <div class="kart-alt">İşlem başına kazanç</div>
    </div>
    <div class="kart">
      <div class="kart-label">Kategori</div>
      <div class="kart-deger" style="font-size:13px">${catLabel}</div>
      <div class="kart-alt">${urunLabel !== '—' ? 'Ürün: '+urunLabel : 'Tüm ürünler'}</div>
    </div>
  </div>

  <!-- SATIŞ TABLOSU -->
  <div class="tablo-baslik">
    <span>Satış Detayları</span>
    <span class="tablo-meta">${rows.length} kayıt &nbsp;·&nbsp; Toplam: ${genelToplam.toLocaleString('tr-TR')} ₺</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:30%">Ürün Adı</th>
        <th class="center" style="width:12%">Kategori</th>
        <th class="center" style="width:10%">Miktar</th>
        <th class="right"  style="width:12%">Birim Fiyat</th>
        <th class="right"  style="width:13%">Toplam</th>
        <th class="center" style="width:13%">Tarih</th>
        <th class="center" style="width:10%">Saat</th>
      </tr>
    </thead>
    <tbody>
      ${satirlar}
      ${rows.length > 0 ? `
      <tr class="toplam-satir">
        <td colspan="4" class="bold">GENEL TOPLAM</td>
        <td class="right green">${genelToplam.toLocaleString('tr-TR')} ₺</td>
        <td colspan="2"></td>
      </tr>` : ''}
    </tbody>
  </table>

  <!-- ALT BİLGİ -->
  <div class="footer">
    <span>Zinar Zirai İlaç Satışı — Gizli Ticari Belge</span>
    <span>Oluşturulma: ${simdi}</span>
  </div>

</body>
</html>`;

    // Yeni pencerede aç ve print tetikle
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(html);
    w.document.close();
    // Font yüklenmesi için kısa bekle sonra print
    w.onload = () => {
      setTimeout(() => {
        w.focus();
        w.print();
      }, 600);
    };

    toast('✅ PDF hazır — yazdır / kaydet seçin');

  } catch(e){
    toast('❌ Hata: '+e.message, true);
    console.error(e);
  } finally {
    btn.innerHTML = '<span style="font-size:16px">⬇</span> PDF Çıktısı Al';
    btn.disabled = false;
  }
}

// ══════════════════════════════════════
//  DEBTORS
// ══════════════════════════════════════
async function loadDebtors(filter=''){ _cacheSifirla('alacaklar');
  showLoad();
  try{
    let q=db.from('debtors').select('*').order('name');
    if(filter) q=q.ilike('name',`%${filter}%`);
    const {data:debtors,error:debtorsError}=await q;
    if(debtorsError) throw debtorsError;
    const {data:transactions,error:transactionsError}=await db.from('debtor_transactions').select('*');
    if(transactionsError) throw transactionsError;
    const {data:payments,error:paymentsError}=await db.from('debt_payments').select('*');
    if(paymentsError) throw paymentsError;
    S.debtors = (debtors||[]).map(d=>({
      ...d,
      debtor_transactions: (transactions||[])
        .filter(t=>String(t.debtor_id)===String(d.id))
        .map(t=>({
          ...t,
          paid: t.paid === 1 || t.paid === true || t.paid === '1',
          debt_payments: (payments||[]).filter(p=>String(p.transaction_id)===String(t.id))
        }))
    }));
    console.log('debtors:', JSON.stringify(S.debtors));
    renderDebtorList();
    if(S.activeDebtorId) renderDebtorDetail(S.activeDebtorId);
    // Özet bar güncelle
    updateAlacakOzet();
  }catch(e){
    console.error('loadDebtors hata:', e);
    toast('❌ '+e.message,true);
  }
  finally{hideLoad();}
}

function renderDebtorList(){
  const list=document.getElementById('debtorList');
  if(!S.debtors.length){list.innerHTML=`<div class="empty-state"><div class="empty-icon">👤</div><p>Henüz kişi yok</p></div>`;return;}
  list.innerHTML=S.debtors.map(d=>{
    const txs=d.debtor_transactions||[];
    const totalBorc=txs.reduce((a,t)=>a+Number(t.total),0);
    const totalOdenen=txs.flatMap(t=>t.debt_payments||[]).reduce((a,p)=>a+Number(p.amount),0);
    const kalan=Math.max(0,totalBorc-totalOdenen);
    const temiz=kalan<=0;
    return `<div class="person-item ${S.activeDebtorId===d.id?'active':''}" onclick="selectDebtor('${d.id}')">
      <div style="flex:1;min-width:0">
        <div class="pi-name">${d.name}</div>
        <div style="font-size:10px;color:var(--text-3);margin-top:1px">
          ${d.telefon?'📞 '+d.telefon:''}${d.koy?' · 📍'+d.koy:''}
        </div>
        <div class="pi-amount" style="margin-top:2px">${temiz?'✓ Temiz':kalan.toLocaleString('tr-TR')+' ₺'}</div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;margin-left:6px" onclick="event.stopPropagation()">
        <button class="pi-action-btn edit" title="İsim Düzenle" onclick="openModal('editDebtor','${d.id}')">✏️</button>
        <button class="pi-action-btn del ${temiz?'':'locked'}" title="${temiz?'Sil':'Borç varken silinemez'}"
          onclick="${temiz?`deleteDebtor('${d.id}','${d.name.replace(/'/g,"\\'")}')`:`toast('⛔ Borç sıfırlanmadan kişi silinemez',true)`}">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function updateAlacakOzet(){
  const bar=document.getElementById('alacakOzetBar');
  if(!bar) return;
  const txs=S.debtors.flatMap(d=>d.debtor_transactions||[]);
  const pays=txs.flatMap(t=>t.debt_payments||[]);
  const toplam=txs.reduce((a,t)=>a+Number(t.total),0);
  const odenen=pays.reduce((a,p)=>a+Number(p.amount),0);
  const kalan=Math.max(0,toplam-odenen);
  const kisiSayisi=S.debtors.filter(d=>{
    const dtxs=d.debtor_transactions||[];
    const dtoplam=dtxs.reduce((a,t)=>a+Number(t.total),0);
    const dodenen=dtxs.flatMap(t=>t.debt_payments||[]).reduce((a,p)=>a+Number(p.amount),0);
    return Math.max(0,dtoplam-dodenen)>0;
  }).length;

  const fmt=n=>n.toLocaleString('tr-TR')+' ₺';
  document.getElementById('alacak-toplam').textContent=fmt(toplam);
  document.getElementById('alacak-odenen').textContent=fmt(odenen);
  document.getElementById('alacak-kalan').textContent=fmt(kalan);
  document.getElementById('alacak-kisi').textContent=kisiSayisi+' kişi';
  bar.style.display='grid';
}

function updateVerecekOzet(){
  const bar=document.getElementById('verecekOzetBar');
  if(!bar) return;
  const txs=S.creditors.flatMap(c=>c.creditor_transactions||[]);
  const pays=txs.flatMap(t=>t.creditor_payments||[]);
  const toplam=txs.reduce((a,t)=>a+Number(t.total),0);
  const odenen=pays.reduce((a,p)=>a+Number(p.amount),0);
  const kalan=Math.max(0,toplam-odenen);
  const kisiSayisi=S.creditors.filter(c=>{
    const ctxs=c.creditor_transactions||[];
    const ctoplam=ctxs.reduce((a,t)=>a+Number(t.total),0);
    const codenen=ctxs.flatMap(t=>t.creditor_payments||[]).reduce((a,p)=>a+Number(p.amount),0);
    return Math.max(0,ctoplam-codenen)>0;
  }).length;

  const fmt=n=>n.toLocaleString('tr-TR')+' ₺';
  document.getElementById('verecek-toplam').textContent=fmt(toplam);
  document.getElementById('verecek-odenen').textContent=fmt(odenen);
  document.getElementById('verecek-kalan').textContent=fmt(kalan);
  document.getElementById('verecek-kisi').textContent=kisiSayisi+' tedarikçi';
  bar.style.display='grid';
}

function selectDebtor(id){ S.activeDebtorId=id; renderDebtorList(); renderDebtorDetail(id); }


function renderDebtorDetail(id){
  console.log('renderDebtorDetail:', id, S.debtors.find(d=>d.id===id));
  const d=S.debtors.find(x=>x.id===id); if(!d) return;
  // FIFO: eskiden yeniye sırala (ödeme dağılımı için)
  const txs=[...(d.debtor_transactions||[])].sort((a,b)=>a.date.localeCompare(b.date));
  const totalBorc=txs.reduce((a,t)=>a+Number(t.total),0);
  const totalOdenen=txs.flatMap(t=>t.debt_payments||[]).reduce((a,p)=>a+Number(p.amount),0);
  const kalan=Math.max(0,totalBorc-totalOdenen);
  const tamOdendi=kalan<=0;
  const txsGoster=[...txs].reverse(); // UI: yeniden eskiye

  document.getElementById('debtorDetail').innerHTML=`
    <div class="detail-header">
      <div>
        <div class="detail-name">${d.name}</div>
        <div style="margin-top:5px;display:flex;flex-direction:column;gap:3px">
          ${d.tc_kimlik?`<div style="font-size:11px;color:var(--text-3)">🪪 TC: <span style="font-family:'JetBrains Mono',monospace;font-weight:600;color:var(--text-2)">${d.tc_kimlik}</span></div>`:''}
          ${d.telefon?`<div style="font-size:11px;color:var(--text-3)">📞 <span style="font-weight:600;color:var(--text-2)">${d.telefon}</span></div>`:''}
          ${d.koy?`<div style="font-size:11px;color:var(--text-3)">📍 <span style="font-weight:600;color:var(--text-2)">${d.koy}</span></div>`:''}
        </div>
        <div style="font-size:11px;color:var(--text-3);margin-top:4px">${txs.length} işlem kaydı</div>
      </div>
      <div style="text-align:right">
        <div class="detail-total debt" style="color:${tamOdendi?'var(--green)':'var(--red)'}">
          ${kalan.toLocaleString('tr-TR')} ₺
        </div>
        <div style="font-size:10px;color:var(--text-3)">Toplam Kalan Borç</div>
        <div style="font-size:10px;color:var(--green);margin-top:2px">
          Ödenen: ${totalOdenen.toLocaleString('tr-TR')} ₺ / ${totalBorc.toLocaleString('tr-TR')} ₺
        </div>
      </div>
    </div>

    <div style="padding:0 14px 14px">
      ${!tamOdendi ? `
        <button class="btn btn-green"
          style="width:100%;justify-content:center;font-size:14px;padding:13px;border-radius:14px"
          onclick="openModal('addTotalPayment','${d.id}')">
          💵 Ödeme Al &nbsp;—&nbsp; Kalan: <strong>${kalan.toLocaleString('tr-TR')} ₺</strong>
        </button>` : `
        <div style="background:var(--green-soft);border:1.5px solid var(--green-border);
             border-radius:14px;padding:13px;text-align:center;font-weight:800;
             color:var(--green-dark);font-size:14px">
          ✅ Tüm borçlar ödendi
        </div>`}
    </div>

    <div style="padding:0 14px 8px;display:flex;align-items:center;justify-content:space-between">
      <div style="font-size:12px;font-weight:800;color:var(--text-2)">📋 İşlem Geçmişi</div>
    </div>

    <div class="detail-body">
      ${!txsGoster.length
        ? `<div class="empty-state"><div class="empty-icon">📄</div><p>Henüz işlem yok</p></div>`
        : txsGoster.map(t=>{
            const payments=(t.debt_payments||[]).sort((a,b)=>a.date.localeCompare(b.date));
            const odenenBu=payments.reduce((a,p)=>a+Number(p.amount),0);
            const txKalan=Math.max(0,Number(t.total)-odenenBu);
            const txTamOdendi=txKalan<=0;
            return `
            <div class="trans-card" style="flex-direction:column;gap:0;cursor:default;border-left:4px solid ${txTamOdendi?'var(--green)':'var(--red)'}">
              <div style="display:flex;align-items:center;gap:10px">
                <div class="trans-date">${t.date}</div>
                <div class="trans-info">
                  <div class="trans-product">${t.product}</div>
                  <div class="trans-detail">${t.qty} ${t.unit} × ${Number(t.price).toLocaleString('tr-TR')} ₺</div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div class="trans-amount ${txTamOdendi?'paid':''}">${Number(t.total).toLocaleString('tr-TR')} ₺</div>
                  <div style="font-size:10px;font-weight:700;margin-top:2px;color:${txTamOdendi?'var(--green)':'var(--red)'}">
                    ${txTamOdendi?'✓ Ödendi':'Kalan: '+txKalan.toLocaleString('tr-TR')+' ₺'}
                  </div>
                </div>
              </div>
              ${payments.length ? `
              <div style="margin-top:10px;padding-top:8px;border-top:1px dashed var(--green-border)">
                <div style="font-size:10px;font-weight:800;color:var(--text-3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">
                  Ödeme Geçmişi
                </div>
                ${payments.map(p=>`
                  <div class="payment-row" style="margin-bottom:4px">
                    <div class="payment-row-date">${p.date}</div>
                    <div class="payment-row-note">${p.note||'—'}</div>
                    <div class="payment-row-amount">+${Number(p.amount).toLocaleString('tr-TR')} ₺</div>
                  </div>`).join('')}
              </div>` : ''}
            </div>`;
          }).join('')}
    </div>`;
}

async function togglePaid(id,val,type){
  const tbl=type==='debtor'?'debtor_transactions':'creditor_transactions';
  const {error}=await db.from(tbl).update({paid:val}).eq('id',id);
  if(error){toast('❌ '+error.message,true);return;}
  toast(val?'✅ Ödeme alındı':'↩ İşaret kaldırıldı');
  type==='debtor'?loadDebtors():loadCreditors();
}

function filterPersonList(type,val){ type==='debtor'?loadDebtors(val):loadCreditors(val); }

// ══════════════════════════════════════
//  AUTH & INIT
// ══════════════════════════════════════

function showLoginScreen(){
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('mainApp').style.display='none';
}

function showMainApp(){
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('mainApp').style.display='grid';
}

function toggleLoginPass(){
  const inp=document.getElementById('loginPassword');
  const eye=document.getElementById('loginPassEye');
  if(inp.type==='password'){ inp.type='text'; eye.textContent='🙈'; }
  else { inp.type='password'; eye.textContent='👁'; }
}

async function doLogin(){
  const email = document.getElementById('loginEmail')?.value?.trim();
  const pass  = document.getElementById('loginPass')?.value?.trim();
  if(!email||!pass) return;
  
  const res = await fetch('/tarim-stok/api/auth.php',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({action:'login', email, password:pass})
  });
  const json = await res.json();
  if(json.error){ 
    document.getElementById('loginError').textContent='Hatalı giriş.';
    document.getElementById('loginError').style.display='block';
    return;
  }
  window.location.href='/tarim-stok/index.php';
}

// ══════════════════════════════════════
//  ESKİ BORÇLAR
// ══════════════════════════════════════
let _ebKayitlar = [];

async function renderEskiBorc(){
  const liste = document.getElementById('eskiBorcListe');
  liste.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><p>Yükleniyor...</p></div>`;

  try{
    const {data, error} = await db.from('eski_alacaklar').select('*').order('created_at',{ascending:false});
    if(error) throw error;
    _ebKayitlar = data || [];
  }catch(e){
    liste.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
    return;
  }

  // Özet bar
  const toplam = _ebKayitlar.reduce((a,k)=>a+Number(k.borc_tutari),0);
  const odenen = _ebKayitlar.reduce((a,k)=>a+Number(k.odenen||0),0);
  const kalan  = Math.max(0, toplam - odenen);
  const fmt    = n => n.toLocaleString('tr-TR') + ' ₺';
  const bar    = document.getElementById('eskiBorcOzetBar');
  document.getElementById('eb-toplam').textContent = fmt(toplam);
  document.getElementById('eb-odenen').textContent = fmt(odenen);
  document.getElementById('eb-kalan').textContent  = fmt(kalan);
  document.getElementById('eb-kisi').textContent   = _ebKayitlar.length + ' kişi';
  bar.style.display = 'grid';

  if(!_ebKayitlar.length){
    liste.innerHTML = `<div class="empty-state"><div class="empty-icon">📒</div><p>Henüz kayıt yok — ＋ Borçlu Ekle butonunu kullanın</p></div>`;
    return;
  }

  liste.innerHTML = _ebKayitlar.map(k=>{
    const kOdenen = Number(k.odenen||0);
    const kKalan  = Math.max(0, Number(k.borc_tutari) - kOdenen);
    const tamOdendi = kKalan <= 0;
    return `
    <div style="background:#fff;border:1.5px solid ${tamOdendi?'var(--green-border)':'#ffe082'};
      border-left:4px solid ${tamOdendi?'var(--green)':'var(--orange)'};
      border-radius:var(--radius-sm);padding:14px 16px;
      box-shadow:var(--shadow);display:flex;align-items:center;gap:12px;flex-wrap:wrap">

      <!-- Kişi bilgisi -->
      <div style="flex:1;min-width:0">
        <div style="font-size:15px;font-weight:900;color:var(--text)">${k.ad_soyad}</div>
        <div style="margin-top:4px;display:flex;gap:10px;flex-wrap:wrap">
          ${k.telefon?`<span style="font-size:11px;color:var(--text-3)">📞 ${k.telefon}</span>`:''}
          ${k.koy?`<span style="font-size:11px;color:var(--text-3)">📍 ${k.koy}</span>`:''}
        </div>
        ${k.aciklama?`<div style="font-size:11px;color:var(--text-3);margin-top:4px;font-style:italic">💬 ${k.aciklama}</div>`:''}
      </div>

      <!-- Tutar bilgisi -->
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:18px;font-weight:900;font-family:'JetBrains Mono',monospace;
          color:${tamOdendi?'var(--green)':'var(--orange)'}">
          ${kKalan.toLocaleString('tr-TR')} ₺
        </div>
        <div style="font-size:10px;color:var(--text-3)">Kalan</div>
        <div style="font-size:10px;color:var(--text-3);margin-top:1px">
          Toplam: ${Number(k.borc_tutari).toLocaleString('tr-TR')} ₺
          ${kOdenen>0?` · Ödenen: ${kOdenen.toLocaleString('tr-TR')} ₺`:''}
        </div>
        ${tamOdendi?`<div style="font-size:10px;color:var(--green);font-weight:700;margin-top:2px">✅ Kapandı</div>`:''}
      </div>

      <!-- Butonlar -->
      <div style="display:flex;gap:6px;flex-shrink:0">
        ${!tamOdendi?`
        <button class="btn btn-green btn-sm" onclick="ebOdemeModal('${k.id}')">💵 Ödeme Al</button>`:''}
        <button class="pi-action-btn edit" title="Düzenle" onclick="ebDuzenleModal('${k.id}')">✏️</button>
        <button class="pi-action-btn del" title="Sil" onclick="ebSil('${k.id}','${k.ad_soyad.replace(/'/g,"\\'")}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function eskiBorcModal(){
  const ktu = document.getElementById('ebModalKutu');
  ktu.innerHTML = `
    <h3 style="font-size:17px;font-weight:900;color:var(--green-dark);margin-bottom:16px">📒 Borçlu Ekle</h3>
    <div class="form-group"><label>Ad Soyad <span style="color:var(--red)">*</span></label>
      <input id="eb-f-ad" placeholder="Ad Soyad"/></div>
    <div class="form-row">
      <div class="form-group"><label>Telefon</label>
        <input id="eb-f-tel" type="tel" placeholder="0555 123 45 67"/></div>
      <div class="form-group"><label>Köy / Mahalle</label>
        <input id="eb-f-koy" placeholder="Köy adı"/></div>
    </div>
    <div class="form-group"><label>Borç Tutarı (₺) <span style="color:var(--red)">*</span></label>
      <input id="eb-f-tutar" type="number" min="0" placeholder="0"/></div>
    <div class="form-group"><label>Açıklama (opsiyonel)</label>
      <input id="eb-f-aciklama" placeholder="Borç hakkında not..."/></div>
    <div style="display:flex;gap:8px;margin-top:18px">
      <button class="btn btn-outline" style="flex:1;justify-content:center" onclick="kapatEbModal()">İptal</button>
      <button class="btn btn-green"  style="flex:1;justify-content:center" onclick="ebKaydet()">✅ Kaydet</button>
    </div>`;
  document.getElementById('ebModalBg').style.display='flex';
  setTimeout(()=>document.getElementById('eb-f-ad')?.focus(),100);
}

function ebDuzenleModal(id){
  const k = _ebKayitlar.find(x=>x.id===id); if(!k) return;
  const ktu = document.getElementById('ebModalKutu');
  ktu.innerHTML = `
    <h3 style="font-size:17px;font-weight:900;color:var(--green-dark);margin-bottom:16px">✏️ Kaydı Düzenle</h3>
    <div class="form-group"><label>Ad Soyad <span style="color:var(--red)">*</span></label>
      <input id="eb-f-ad" value="${k.ad_soyad}" placeholder="Ad Soyad"/></div>
    <div class="form-row">
      <div class="form-group"><label>Telefon</label>
        <input id="eb-f-tel" type="tel" value="${k.telefon||''}" placeholder="0555 123 45 67"/></div>
      <div class="form-group"><label>Köy / Mahalle</label>
        <input id="eb-f-koy" value="${k.koy||''}" placeholder="Köy adı"/></div>
    </div>
    <div class="form-group"><label>Borç Tutarı (₺) <span style="color:var(--red)">*</span></label>
      <input id="eb-f-tutar" type="number" min="0" value="${k.borc_tutari}" placeholder="0"/></div>
    <div class="form-group"><label>Açıklama (opsiyonel)</label>
      <input id="eb-f-aciklama" value="${k.aciklama||''}" placeholder="Borç hakkında not..."/></div>
    <div style="display:flex;gap:8px;margin-top:18px">
      <button class="btn btn-outline" style="flex:1;justify-content:center" onclick="kapatEbModal()">İptal</button>
      <button class="btn btn-green"  style="flex:1;justify-content:center" onclick="ebGuncelle('${id}')">💾 Güncelle</button>
    </div>`;
  document.getElementById('ebModalBg').style.display='flex';
}

function ebOdemeModal(id){
  const k = _ebKayitlar.find(x=>x.id===id); if(!k) return;
  const kOdenen = Number(k.odenen||0);
  const kKalan  = Math.max(0, Number(k.borc_tutari) - kOdenen);
  const ktu = document.getElementById('ebModalKutu');
  ktu.innerHTML = `
    <h3 style="font-size:17px;font-weight:900;color:var(--green-dark);margin-bottom:16px">💵 Ödeme Al</h3>
    <div style="background:var(--green-light);border:1px solid var(--green-border);border-radius:12px;
      padding:12px 14px;margin-bottom:16px">
      <div style="font-size:14px;font-weight:900;color:var(--text)">${k.ad_soyad}</div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:13px">
        <span style="color:var(--text-3)">Toplam Borç</span>
        <span style="font-weight:800;font-family:'JetBrains Mono',monospace">${Number(k.borc_tutari).toLocaleString('tr-TR')} ₺</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px">
        <span style="color:var(--text-3)">Ödenen</span>
        <span style="font-weight:800;color:var(--green);font-family:'JetBrains Mono',monospace">${kOdenen.toLocaleString('tr-TR')} ₺</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:15px;padding-top:8px;
        border-top:1px solid var(--green-border);margin-top:6px">
        <span style="font-weight:800">Kalan</span>
        <span style="font-weight:900;color:var(--orange);font-family:'JetBrains Mono',monospace">${kKalan.toLocaleString('tr-TR')} ₺</span>
      </div>
    </div>
    <div class="form-group"><label>Alınan Tutar (₺)</label>
      <input id="eb-f-odeme" type="number" min="1" max="${kKalan}" placeholder="0"/>
      <div style="margin-top:6px">
        <button type="button" class="btn btn-outline btn-sm" style="width:100%;justify-content:center"
          onclick="document.getElementById('eb-f-odeme').value='${kKalan}'">Tamamını Öde (${kKalan.toLocaleString('tr-TR')} ₺)</button>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:18px">
      <button class="btn btn-outline" style="flex:1;justify-content:center" onclick="kapatEbModal()">İptal</button>
      <button class="btn btn-green"  style="flex:1;justify-content:center" onclick="ebOdemeKaydet('${id}')">💵 Ödemeyi Kaydet</button>
    </div>`;
  document.getElementById('ebModalBg').style.display='flex';
  setTimeout(()=>document.getElementById('eb-f-odeme')?.focus(),100);
}

function kapatEbModal(){
  document.getElementById('ebModalBg').style.display='none';
}

async function ebKaydet(){
  const ad    = document.getElementById('eb-f-ad')?.value?.trim();
  const tel   = document.getElementById('eb-f-tel')?.value?.trim();
  const koy   = document.getElementById('eb-f-koy')?.value?.trim();
  const tutar = +document.getElementById('eb-f-tutar')?.value;
  const acik  = document.getElementById('eb-f-aciklama')?.value?.trim();
  if(!ad){ alert('Ad Soyad gerekli'); return; }
  if(!tutar||tutar<=0){ alert('Borç tutarı gerekli'); return; }
  const btn = document.querySelector('#ebModalKutu .btn-green');
  btn.disabled=true; btn.textContent='⏳ Kaydediliyor...';
  const {error} = await db.from('eski_alacaklar').insert({
    ad_soyad:ad, telefon:tel||null, koy:koy||null,
    borc_tutari:tutar, aciklama:acik||null, odenen:0
  });
  if(error){ alert('Hata: '+error.message); btn.disabled=false; btn.textContent='✅ Kaydet'; return; }
  kapatEbModal();
  renderEskiBorc();
}

async function ebGuncelle(id){
  const ad    = document.getElementById('eb-f-ad')?.value?.trim();
  const tel   = document.getElementById('eb-f-tel')?.value?.trim();
  const koy   = document.getElementById('eb-f-koy')?.value?.trim();
  const tutar = +document.getElementById('eb-f-tutar')?.value;
  const acik  = document.getElementById('eb-f-aciklama')?.value?.trim();
  if(!ad){ alert('Ad Soyad gerekli'); return; }
  if(!tutar||tutar<=0){ alert('Borç tutarı gerekli'); return; }
  const btn = document.querySelector('#ebModalKutu .btn-green');
  btn.disabled=true; btn.textContent='⏳ Güncelleniyor...';
  const {error} = await db.from('eski_alacaklar').update({
    ad_soyad:ad, telefon:tel||null, koy:koy||null,
    borc_tutari:tutar, aciklama:acik||null
  }).eq('id',id);
  if(error){ alert('Hata: '+error.message); btn.disabled=false; btn.textContent='💾 Güncelle'; return; }
  kapatEbModal();
  renderEskiBorc();
}

async function ebOdemeKaydet(id){
  const k = _ebKayitlar.find(x=>x.id===id); if(!k) return;
  const miktar = +document.getElementById('eb-f-odeme')?.value;
  const kKalan = Math.max(0, Number(k.borc_tutari) - Number(k.odenen||0));
  if(!miktar||miktar<=0){ alert('Geçerli tutar girin'); return; }
  if(miktar>kKalan){ alert(`En fazla ${kKalan.toLocaleString('tr-TR')} ₺ girilebilir`); return; }
  const btn = document.querySelector('#ebModalKutu .btn-green');
  btn.disabled=true; btn.textContent='⏳ Kaydediliyor...';
  const yeniOdenen = Number(k.odenen||0) + miktar;
  const {error} = await db.from('eski_alacaklar').update({odenen: yeniOdenen}).eq('id',id);
  if(error){ alert('Hata: '+error.message); btn.disabled=false; btn.textContent='💵 Ödemeyi Kaydet'; return; }
  kapatEbModal();
  renderEskiBorc();
}

async function ebSil(id, ad){
  if(!confirm(`"${ad}" adlı kaydı silmek istediğinize emin misiniz?\nBu işlem geri alınamaz.`)) return;
  const {error} = await db.from('eski_alacaklar').delete().eq('id',id);
  if(error){ alert('Hata: '+error.message); return; }
  renderEskiBorc();
}

async function doLogout(){
  if(!confirm('Çıkış yapmak istediğinize emin misiniz?')) return;
  window.location.href='/tarim-stok/logout.php';
}

(async()=>{
  showMainApp();
  await checkDb();
  await loadProducts();
})();

// ══════════════════════════════════════
//  CREDITORS
// ══════════════════════════════════════
async function loadCreditors(filter=''){ _cacheSifirla('verecekler');
  showLoad();
  try{
    let q=db.from('creditors').select('*').order('name');
    if(filter) q=q.ilike('name',`%${filter}%`);
    const {data:creditors,error:creditorsError}=await q;
    if(creditorsError) throw creditorsError;
    const {data:transactions}=await db.from('creditor_transactions').select('*');
    const {data:payments}=await db.from('creditor_payments').select('*');
    S.creditors=(creditors||[]).map(c=>({
      ...c,
      creditor_transactions:(transactions||[])
        .filter(t=>String(t.creditor_id)===String(c.id))
        .map(t=>({
          ...t,
          creditor_payments:(payments||[]).filter(p=>String(p.transaction_id)===String(t.id))
        }))
    }));
    renderCreditorList();
    if(S.activeCreditorId) renderCreditorDetail(S.activeCreditorId);
    updateVerecekOzet();
  }catch(e){toast('❌ '+e.message,true);}
  finally{hideLoad();}
}

function renderCreditorList(){
  const list=document.getElementById('creditorList');
  if(!S.creditors.length){list.innerHTML=`<div class="empty-state"><div class="empty-icon">🏭</div><p>Henüz tedarikçi yok</p></div>`;return;}
  list.innerHTML=S.creditors.map(c=>{
    const txs=c.creditor_transactions||[];
    const totalBorc=txs.reduce((a,t)=>a+Number(t.total),0);
    const totalOdenen=txs.flatMap(t=>t.creditor_payments||[]).reduce((a,p)=>a+Number(p.amount),0);
    const kalan=Math.max(0,totalBorc-totalOdenen);
    const txSayi=txs.length;
    return `<div class="person-item ${S.activeCreditorId===c.id?'active':''}" onclick="selectCreditor('${c.id}')">
      <div style="flex:1;min-width:0">
        <div class="pi-name">${c.name}</div>
        <div style="margin-top:2px;font-size:12px;font-weight:800;font-family:'JetBrains Mono',monospace;color:${kalan>0?'var(--orange)':'var(--green)'}">
          ${kalan>0?kalan.toLocaleString('tr-TR')+' ₺ borç':'✓ Ödendi'}
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;margin-left:6px" onclick="event.stopPropagation()">
        <button class="pi-action-btn edit" title="İsim Düzenle" onclick="openModal('editCreditor','${c.id}')">✏️</button>
        <button class="pi-action-btn del" title="Tedarikçiyi Sil"
          onclick="deleteCreditor('${c.id}','${c.name.replace(/'/g,"\'")}','${txSayi}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function selectCreditor(id){ S.activeCreditorId=id; renderCreditorList(); renderCreditorDetail(id); }

function renderCreditorDetail(id){
  const c=S.creditors.find(x=>x.id===id); if(!c) return;
  const txs=(c.creditor_transactions||[]).sort((a,b)=>b.date.localeCompare(a.date));
  const total=txs.reduce((a,t)=>a+Number(t.total),0);

  // ── Ürün gruplandırma ──
  // normalize: küçük harf + trim → aynı ürünleri grupla
  const gruplar = {};
  txs.forEach(t=>{
    const key = t.product.trim().toLowerCase();
    if(!gruplar[key]) gruplar[key]={name:t.product.trim(), items:[], toplamQty:0, toplamTutar:0, unit:t.unit};
    gruplar[key].items.push(t);
    gruplar[key].toplamQty += Number(t.qty);
    gruplar[key].toplamTutar += Number(t.total);
  });
  const grupListesi = Object.values(gruplar).sort((a,b)=>b.toplamTutar-a.toplamTutar);

  const totalOdenen=txs.flatMap(t=>t.creditor_payments||[]).reduce((a,p)=>a+Number(p.amount),0);
  const kalanBorc=Math.max(0,total-totalOdenen);
  const tamOdendi=kalanBorc<=0;

  document.getElementById('creditorDetail').innerHTML=`
    <div class="detail-header">
      <div>
        <div class="detail-name">${c.name}</div>
        <div style="font-size:11px;color:var(--text-3);margin-top:2px">
          ${txs.length} alım · ${grupListesi.length} farklı ürün
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:900;font-family:'JetBrains Mono',monospace;color:${tamOdendi?'var(--green)':'var(--orange)'}">
          ${kalanBorc.toLocaleString('tr-TR')} ₺
        </div>
        <div style="font-size:10px;color:var(--text-3)">Kalan Borç</div>
        <div style="font-size:10px;color:var(--green);margin-top:2px">Ödenen: ${totalOdenen.toLocaleString('tr-TR')} ₺ / ${total.toLocaleString('tr-TR')} ₺</div>
      </div>
    </div>

    <!-- ÖDEME BUTONU -->
    <div style="padding:0 14px 14px;display:flex;gap:8px">
      ${!tamOdendi ? `
        <button class="btn btn-green" style="flex:1;justify-content:center;font-size:13px;padding:11px;border-radius:14px"
          onclick="openModal('addCreditorPayment','${c.id}')">
          💸 Ödeme Yap — Borç: <strong>${kalanBorc.toLocaleString('tr-TR')} ₺</strong>
        </button>` : `
        <div style="flex:1;background:var(--green-soft);border:1.5px solid var(--green-border);
             border-radius:14px;padding:11px;text-align:center;font-weight:800;color:var(--green-dark);font-size:13px">
          ✅ Tüm ödemeler tamamlandı
        </div>`}
      <button class="btn btn-outline btn-sm" style="flex-shrink:0" onclick="openModal('addCreditorTrans','${c.id}')">＋ Alım Ekle</button>
    </div>

    <div class="detail-body">
      ${!grupListesi.length
        ? `<div class="empty-state"><div class="empty-icon">📄</div><p>Henüz alım yok</p></div>`
        : grupListesi.map((g,gi)=>`
          <!-- GRUP BAŞLIĞI — tıklanınca açılır -->
          <div class="cred-grup" id="cg-${id}-${gi}">
            <div class="cred-grup-header" onclick="toggleCreditorGroup('${id}-${gi}')">
              <div style="flex:1;min-width:0">
                <div style="font-size:14px;font-weight:800;color:var(--text)">${g.name}</div>
                <div style="font-size:11px;color:var(--text-3);margin-top:2px">
                  ${g.items.length} alım &nbsp;·&nbsp; Toplam: ${g.toplamQty.toLocaleString('tr-TR')} ${g.unit}
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0;margin:0 10px">
                <div style="font-size:14px;font-weight:900;font-family:'JetBrains Mono',monospace;color:var(--green-dark)">
                  ${g.toplamTutar.toLocaleString('tr-TR')} ₺
                </div>
              </div>
              <div class="cg-arrow" id="cga-${id}-${gi}">▼</div>
            </div>

            <!-- GRUP İÇİ — gizli başlıyor -->
            <div class="cred-grup-body" id="cgb-${id}-${gi}">
              ${g.items.map(t=>{
                const stogaEklendi=!!t.stoga_eklendi;
                const iadeVar=Number(t.iade_qty||0)>0;
                const iadeBekliyor=iadeVar&&!stogaEklendi;
                const cpays=(t.creditor_payments||[]).sort((a,b)=>a.date.localeCompare(b.date));
                const txOdenen=cpays.reduce((a,p)=>a+Number(p.amount),0);
                const txKalan=Math.max(0,Number(t.total)-txOdenen);
                const txTamOdendi=txKalan<=0;
                return `
                <div class="cred-grup-row ${stogaEklendi?'stoga-eklendi':''} ${iadeBekliyor?'iade-bekliyor':''}"
                  style="flex-direction:column;gap:0;border-left:3px solid ${txTamOdendi?'var(--green)':iadeBekliyor?'var(--orange)':'var(--green-border)'}">
                  <div style="display:flex;align-items:center;gap:6px;padding:2px 0">
                    <div style="font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--text-3);width:78px;flex-shrink:0">${t.date}</div>
                    <div style="flex:1;font-size:12px;color:var(--text-2);min-width:0">
                      <div>${Number(t.qty).toLocaleString('tr-TR')} ${t.unit}
                        <span style="color:var(--text-3)">× ${Number(t.price).toLocaleString('tr-TR')} ₺</span>
                      </div>
                      ${iadeVar?`<div style="font-size:10px;font-weight:700;color:var(--orange);margin-top:1px">
                        ↩ ${Number(t.iade_qty).toLocaleString('tr-TR')} ${t.unit} iade
                        ${t.iade_date?'('+t.iade_date+')':''}
                        ${!stogaEklendi?'<span style="color:var(--red)">— Stok bekleniyor</span>':''}
                      </div>`:''}
                    </div>
                    <div style="text-align:right;flex-shrink:0;margin-right:4px">
                      <div style="font-size:12px;font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--green-dark)">${Number(t.total).toLocaleString('tr-TR')} ₺</div>
                      <div style="font-size:10px;font-weight:700;color:${txTamOdendi?'var(--green)':'var(--orange)'}">
                        ${txTamOdendi?'✓ Ödendi':'Kalan: '+txKalan.toLocaleString('tr-TR')+' ₺'}
                      </div>
                    </div>
                    <div style="display:flex;gap:3px;flex-shrink:0">
                      ${!txTamOdendi?`<button class="stoga-toggle" style="font-size:10px;padding:3px 7px;border-color:var(--orange);color:var(--orange)"
                        onclick="openModal('addCreditorTransPayment','${t.id}');event.stopPropagation()">💸 Öde</button>`:''}
                      <button class="stoga-toggle ${stogaEklendi?'on':''} ${iadeBekliyor?'warn':''}"
                        title="${stogaEklendi?'Stoğa eklendi (geri al)':iadeVar?'İade stoğa eklendiyse işaretle':'Stoğa eklendi işaretle'}"
                        onclick="toggleStogaEklendi('${t.id}','${stogaEklendi?'false':'true'}','${iadeVar}');event.stopPropagation()">
                        ${stogaEklendi?'📦':iadeBekliyor?'📦⚠️':'📦'}
                      </button>
                      <button class="pi-action-btn edit" title="Düzenle" onclick="openModal('editCreditorTrans','${t.id}');event.stopPropagation()">✏️</button>
                    </div>
                  </div>
                  ${cpays.length?`
                  <div style="margin-top:6px;padding:6px 8px;background:rgba(19,164,0,.05);border-radius:6px">
                    <div style="font-size:10px;font-weight:700;color:var(--text-3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em">Ödeme Geçmişi</div>
                    ${cpays.map(p=>`
                    <div style="display:flex;gap:8px;font-size:11px;padding:2px 0;border-bottom:1px solid rgba(19,164,0,.08)">
                      <span style="font-family:'JetBrains Mono',monospace;color:var(--text-3);width:76px;flex-shrink:0">${p.date}</span>
                      <span style="flex:1;color:var(--text-2)">${p.note||'—'}</span>
                      <span style="font-weight:800;font-family:'JetBrains Mono',monospace;color:var(--green-dark)">${Number(p.amount).toLocaleString('tr-TR')} ₺</span>
                    </div>`).join('')}
                  </div>`:''}
                </div>`;
              }).join('')}
              <!-- Grup özet satırı -->
              <div style="display:flex;justify-content:space-between;padding:6px 12px 8px;border-top:1px solid var(--green-border);margin-top:4px">
                <span style="font-size:11px;font-weight:700;color:var(--text-3)">Toplam: ${g.toplamQty.toLocaleString('tr-TR')} ${g.unit}</span>
                <span style="font-size:11px;font-weight:900;font-family:'JetBrains Mono',monospace;color:var(--green-dark)">${g.toplamTutar.toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>
          </div>`).join('')}
    </div>`;
}

function toggleCreditorGroup(key){
  const body=document.getElementById('cgb-'+key);
  const arrow=document.getElementById('cga-'+key);
  if(!body) return;
  const open=body.classList.toggle('open');
  if(arrow){ arrow.style.transform=open?'rotate(180deg)':'rotate(0deg)'; }
}

async function toggleStogaEklendi(txId, yeniDurum, iadeVar=false){
  // İade varken ve stoğa eklendi işaretleniyorsa — onay al
  if(yeniDurum && iadeVar){
    if(!confirm('Bu alımda iade var. İade miktarını stoğa manuel eklediniz mi?\n\n"Tamam" — Evet, stoğa ekledim, işaretle\n"İptal" — Hayır, henüz eklemedim')) return;
  }
  let creditorId=null;
  for(const c of S.creditors){
    const tx=(c.creditor_transactions||[]).find(t=>t.id===txId);
    if(tx){ tx.stoga_eklendi=yeniDurum; creditorId=c.id; break; }
  }
  const {error}=await db.from('creditor_transactions').update({stoga_eklendi:yeniDurum}).eq('id',txId);
  if(error){ toast('❌ '+error.message,true); return; }
  toast(yeniDurum?'📦 Stoğa eklendi olarak işaretlendi':'↩ İşaret kaldırıldı');
  await loadCreditors();
  if(S.activeCreditorId===creditorId) renderCreditorDetail(creditorId);
}

// ══════════════════════════════════════
//  MODALS
// ══════════════════════════════════════
let _mType=null,_mId=null;

function openModal(type,id=null){
  _mType=type; _mId=id;
  const p=id?S.products.find(x=>x.id===id):null;
  const today=new Date().toISOString().slice(0,10);
  const tpl={
    addProduct:`<h3>➕ Yeni Ürün Ekle</h3>
      <div class="form-group"><label>Ürün Adı</label><input id="f-name" placeholder="Örn: A Gübresi"/></div>
      <div class="form-row">
        <div class="form-group">
          <label>Kategori</label>
          <select id="f-cat" onchange="updateSubOptions()" style="width:100%;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:10px;font-family:'Nunito',sans-serif;font-size:13px;color:#1a2e1a;outline:none;background:#fff;cursor:pointer;appearance:auto">
            <option value="Gübre">🌱 Gübre</option>
            <option value="İlaç">💊 İlaç</option>
            <option value="Tohum">🌾 Tohum</option>
            <option value="Haşere">🐛 Haşere</option>
            <option value="Zehir">☠️ Zehir</option>
            <option value="Ekipman">🔧 Ekipman</option>
          </select>
        </div>
        <div class="form-group">
          <label>Alt Kategori</label>
          <select id="f-sub" style="width:100%;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:10px;font-family:'Nunito',sans-serif;font-size:13px;color:#1a2e1a;outline:none;background:#fff;cursor:pointer;appearance:auto">
            <option value="Sıvı Gübre">Sıvı Gübre</option>
            <option value="Katı Gübre">Katı Gübre</option>
            <option value="Yaprak Gübre">Yaprak Gübre</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Başlangıç Stok</label><input id="f-stock" type="number" value="0"/></div>
        <div class="form-group"><label>Birim</label>
          <select id="f-unit" style="width:100%;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:10px;font-family:'Nunito',sans-serif;font-size:13px;color:#1a2e1a;outline:none;background:#fff;cursor:pointer;appearance:auto">
            <option>adet</option><option>kg</option><option>lt</option><option>gr</option><option>ton</option><option>paket</option><option>kutu</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Birim Fiyat (₺)</label><input id="f-price" type="number" placeholder="0"/></div>
        <div class="form-group"><label>Min. Stok Uyarı</label><input id="f-min" type="number" value="10"/></div>
      </div>
      <div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">İptal</button><button class="btn btn-green" onclick="saveProduct()">Kaydet</button></div>`,

    editProduct:`<h3>✏️ Ürün Düzenle</h3>
      <div class="form-group"><label>Ürün Adı</label><input id="f-name" value="${p?.name||''}"/></div>
      <div class="form-row">
        <div class="form-group"><label>Birim Fiyat (₺)</label><input id="f-price" type="number" value="${p?.price||''}"/></div>
        <div class="form-group"><label>Min. Stok</label><input id="f-min" type="number" value="${p?.min_stock||''}"/></div>
      </div>
      <div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">İptal</button><button class="btn btn-green" onclick="updateProduct()">Güncelle</button></div>`,

    addStock:`<h3>📥 Stok Ekle</h3>
      <div style="background:var(--green-light);border:1.5px solid var(--green);border-radius:12px;padding:12px 16px;margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Ürün</div>
        <div style="font-size:16px;font-weight:900;color:var(--green-dark)">${p?.name||'—'}</div>
        <div style="font-size:12px;color:var(--text-3);margin-top:2px">Mevcut stok: <b>${p?.stock||0} ${p?.unit||''}</b></div>
      </div>
      <div class="form-group"><label>Eklenecek Miktar (${p?.unit||''})</label><input id="f-qty" type="number" min="1" placeholder="0"/></div>
      <div class="form-group"><label>Tarih</label><input id="f-date" type="date" value="${today}"/></div>
      <div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">İptal</button><button class="btn btn-green" onclick="doAddStock()">✅ Stoğa Ekle</button></div>`,

    removeStock:`<h3>📤 Stok Çıkışı — ${p?.name||''}</h3>
      <p style="font-size:12px;color:var(--text-3);margin-bottom:12px">Mevcut: <b>${p?.stock||0} ${p?.unit||''}</b></p>
      <div class="form-group"><label>Miktar (${p?.unit||''})</label><input id="f-qty" type="number" min="1" max="${p?.stock||0}" placeholder="0"/></div>
      <div class="form-group"><label>Birim Fiyat (₺)</label><input id="f-price" type="number" value="${p?.price||''}"/></div>
      <div class="form-group"><label>Alıcı (opsiyonel)</label><input id="f-buyer" placeholder="Müşteri adı"/></div>
      <div class="form-group"><label>Tarih</label><input id="f-date" type="date" value="${today}"/></div>
      <div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">İptal</button><button class="btn btn-red" onclick="doRemoveStock()">Çıkış Yap</button></div>`,

    addDebtor:`<h3>👤 Alacaklı Kişi Ekle</h3>
      <div class="form-group"><label>Ad Soyad</label><input id="f-name" placeholder="Ad Soyad"/></div>
      <div class="form-row">
        <div class="form-group"><label>TC Kimlik No</label><input id="f-tc" type="text" maxlength="11" placeholder="12345678901"/></div>
        <div class="form-group"><label>Telefon</label><input id="f-tel" type="tel" placeholder="0555 123 45 67"/></div>
      </div>
      <div class="form-group"><label>Köy / Mahalle</label><input id="f-koy" placeholder="Köy veya mahalle adı"/></div>
      <div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">İptal</button><button class="btn btn-green" onclick="saveDebtor()">Ekle</button></div>`,

    editDebtor:`<h3>✏️ Kişiyi Düzenle</h3>
      <div class="form-group"><label>Ad Soyad</label><input id="f-name" placeholder="Ad Soyad"/></div>
      <div class="form-row">
        <div class="form-group"><label>TC Kimlik No</label><input id="f-tc" type="text" maxlength="11" placeholder="12345678901"/></div>
        <div class="form-group"><label>Telefon</label><input id="f-tel" type="tel" placeholder="0555 123 45 67"/></div>
      </div>
      <div class="form-group"><label>Köy / Mahalle</label><input id="f-koy" placeholder="Köy veya mahalle adı"/></div>
      <div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">İptal</button><button class="btn btn-green" onclick="updateDebtor()">Kaydet</button></div>`,

    addDebtorTrans:`<h3>➕ İşlem Ekle</h3>
      <div class="form-group"><label>Ürün</label><input id="f-prod" placeholder="Ürün adı"/></div>
      <div class="form-row">
        <div class="form-group"><label>Miktar</label><input id="f-qty" type="number" placeholder="0"/></div>
        <div class="form-group"><label>Birim</label><input id="f-unit" placeholder="kg / lt / adet"/></div>
      </div>
      <div class="form-group"><label>Birim Fiyat (₺)</label><input id="f-price" type="number" placeholder="0"/></div>
      <div class="form-group"><label>Tarih</label><input id="f-date" type="date" value="${today}"/></div>
      <div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">İptal</button><button class="btn btn-green" onclick="saveDebtorTrans()">Kaydet</button></div>`,

    addCreditor:`<h3>🏭 Tedarikçi Ekle</h3>
      <div class="form-group"><label>Tedarikçi Adı</label><input id="f-name" placeholder="Firma / Ad Soyad"/></div>
      <div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">İptal</button><button class="btn btn-green" onclick="saveCreditor()">Ekle</button></div>`,

    editCreditor:`<h3>✏️ Tedarikçiyi Düzenle</h3>
      <div class="form-group"><label>Tedarikçi Adı</label><input id="f-name" placeholder="Firma / Ad Soyad"/></div>
      <div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">İptal</button><button class="btn btn-green" onclick="updateCreditor()">Kaydet</button></div>`,

    addCreditorPayment:`<h3>💸 Ödeme Yap</h3>
      <div id="cpi-ozet" style="background:var(--green-light);border:1px solid var(--green-border);border-radius:12px;padding:12px 14px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span style="font-weight:700;color:var(--text-2)">Toplam Alım</span>
          <span id="cpi-toplam" style="font-weight:900;font-family:'JetBrains Mono',monospace;color:var(--text)">—</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span style="font-weight:700;color:var(--text-2)">Ödenen</span>
          <span id="cpi-odenen" style="font-weight:900;font-family:'JetBrains Mono',monospace;color:var(--green)">—</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:15px;padding-top:8px;border-top:1px solid var(--green-border)">
          <span style="font-weight:800">Kalan Borç</span>
          <span id="cpi-kalan" style="font-weight:900;font-family:'JetBrains Mono',monospace;color:var(--orange)">—</span>
        </div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--text-3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">
        📋 Kalemler (eskiden yeniye öder)
      </div>
      <div id="cpi-kalemler" style="max-height:180px;overflow-y:auto;border:1px solid var(--green-border);border-radius:10px;margin-bottom:14px"></div>
      <div class="form-group">
        <label>Ödenen Tutar (₺)</label>
        <input id="f-amount" type="number" placeholder="0" min="1" oninput="updateCreditorPayPreview()"/>
        <div style="margin-top:6px"><button type="button" class="btn btn-outline btn-sm" style="width:100%;justify-content:center" onclick="setCreditorFullPayment()">Tamamını Öde</button></div>
      </div>
      <div id="cpi-preview" style="display:none;border-radius:10px;padding:9px 12px;margin-bottom:8px;font-size:12px;font-weight:700"></div>
      <div class="form-group"><label>Ödeme Tarihi</label><input id="f-date" type="date" value="${today}"/></div>
      <div class="form-group"><label>Not (opsiyonel)</label><input id="f-note" placeholder="EFT, nakit, kısmi..."/></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal()">İptal</button>
        <button class="btn btn-green" onclick="saveCreditorPayment()">💸 Ödemeyi Kaydet</button>
      </div>`,

    addCreditorTransPayment:`<h3>💸 Kalem Ödemesi</h3>
      <div id="ctpi-bilgi" style="background:var(--green-light);border:1px solid var(--green-border);border-radius:12px;padding:12px 14px;margin-bottom:14px;font-size:13px;font-weight:700;color:var(--green-dark)">⏳ Yükleniyor...</div>
      <div class="form-group">
        <label>Ödenen Tutar (₺)</label>
        <input id="f-amount" type="number" placeholder="0" min="1"/>
        <div style="margin-top:6px"><button type="button" class="btn btn-outline btn-sm" style="width:100%;justify-content:center" onclick="setCreditorTransFullPayment()">Tamamını Öde</button></div>
      </div>
      <div class="form-group"><label>Ödeme Tarihi</label><input id="f-date" type="date" value="${today}"/></div>
      <div class="form-group"><label>Not (opsiyonel)</label><input id="f-note" placeholder="EFT, nakit..."/></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal()">İptal</button>
        <button class="btn btn-green" onclick="saveCreditorTransPayment()">💸 Kaydet</button>
      </div>`,

    addCreditorTrans:`<h3>📦 Alım Ekle</h3>
      <div class="form-group"><label>Ürün</label><input id="f-prod" placeholder="Ürün adı"/></div>
      <div class="form-row">
        <div class="form-group"><label>Miktar</label><input id="f-qty" type="number" placeholder="0"/></div>
        <div class="form-group"><label>Birim</label><input id="f-unit" placeholder="kg / lt / adet"/></div>
      </div>
      <div class="form-group"><label>Birim Fiyat (₺)</label><input id="f-price" type="number" placeholder="0"/></div>
      <div class="form-group"><label>Tarih</label><input id="f-date" type="date" value="${today}"/></div>
      <div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">İptal</button><button class="btn btn-green" onclick="saveCreditorTrans()">Kaydet</button></div>`,

    editCreditorTrans:`<h3>✏️ Alımı Düzenle</h3>
      <div id="ect-urun-bilgi" style="background:var(--green-light);border:1px solid var(--green-border);border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:13px;font-weight:700;color:var(--green-dark)">⏳ Yükleniyor...</div>
      <div class="form-group"><label>Ürün Adı</label><input id="f-prod" placeholder="Ürün adı"/></div>
      <div class="form-row">
        <div class="form-group"><label>Alınan Miktar</label><input id="f-qty" type="number" placeholder="0" min="0"/></div>
        <div class="form-group"><label>Birim</label><input id="f-unit" placeholder="kg / lt / adet"/></div>
      </div>
      <div class="form-group"><label>Birim Fiyat (₺)</label><input id="f-price" type="number" placeholder="0"/></div>
      <div class="form-group"><label>Tarih</label><input id="f-date" type="date" value="${today}"/></div>
      <div style="background:#fff8e1;border:1.5px solid #ffe082;border-radius:10px;padding:12px 14px;margin-bottom:12px">
        <div style="font-size:12px;font-weight:800;color:var(--orange);margin-bottom:8px">↩ İade</div>
        <div class="form-row" style="margin:0">
          <div class="form-group" style="margin:0">
            <label>İade Miktarı <span style="font-weight:400;color:var(--text-3)">(0 = iade yok)</span></label>
            <input id="f-iade-qty" type="number" placeholder="0" min="0" value="0"/>
          </div>
          <div class="form-group" style="margin:0">
            <label>İade Tarihi</label>
            <input id="f-iade-date" type="date" value="${today}"/>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text-3);margin-top:6px">İade girilirse stoğa otomatik geri eklenir</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal()">İptal</button>
        <button class="btn btn-red btn-sm" onclick="deleteCreditorTrans()">🗑️ Sil</button>
        <button class="btn btn-green" onclick="saveEditCreditorTrans()">💾 Kaydet</button>
      </div>`,

    addPayment:`<h3>💵 Ödeme Girişi Ekle</h3>
      <p style="font-size:12px;color:var(--text-3);margin-bottom:14px">Bu işlem için yapılan kısmi veya tam ödemeyi kaydedin.</p>
      <div class="form-group"><label>Ödenen Tutar (₺)</label><input id="f-amount" type="number" placeholder="0" min="1"/></div>
      <div class="form-group"><label>Ödeme Tarihi</label><input id="f-date" type="date" value="${today}"/></div>
      <div class="form-group"><label>Not (opsiyonel)</label><input id="f-note" placeholder="Örn: Nakit, EFT, ilk taksit..."/></div>
      <div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">İptal</button><button class="btn btn-green" onclick="savePayment()">Kaydet</button></div>`,

    addTotalPayment:`<h3>💵 Ödeme Al</h3>
      <div id="totalPaymentInfo" style="background:var(--green-light);border:1px solid var(--green-border);border-radius:12px;padding:12px 14px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span style="font-weight:700;color:var(--text-2)">Toplam Borç</span>
          <span id="tpi-toplam" style="font-weight:900;font-family:'JetBrains Mono',monospace;color:var(--red)">—</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span style="font-weight:700;color:var(--text-2)">Ödenen</span>
          <span id="tpi-odenen" style="font-weight:900;font-family:'JetBrains Mono',monospace;color:var(--green)">—</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:15px;padding-top:8px;border-top:1px solid var(--green-border)">
          <span style="font-weight:800;color:var(--text)">Kalan Borç</span>
          <span id="tpi-kalan" style="font-weight:900;font-family:'JetBrains Mono',monospace;color:var(--red)">—</span>
        </div>
      </div>
      <div class="form-group">
        <label>Alınan Tutar (₺)</label>
        <input id="f-amount" type="number" placeholder="0" min="1" oninput="updateTotalPaymentPreview()"/>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button type="button" class="btn btn-outline btn-sm" style="flex:1;justify-content:center" onclick="setFullPayment()">Tamamını Öde</button>
        </div>
      </div>
      <div id="tpi-preview" style="display:none;background:#fff8e1;border:1px solid #ffe082;border-radius:10px;padding:10px 12px;margin-bottom:8px;font-size:12px;font-weight:700;color:var(--orange)"></div>
      <div class="form-group"><label>Ödeme Tarihi</label><input id="f-date" type="date" value="${today}"/></div>
      <div class="form-group"><label>Not (opsiyonel)</label><input id="f-note" placeholder="Örn: Nakit, EFT, havale..."/></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal()">İptal</button>
        <button class="btn btn-green" onclick="saveTotalPayment()">💵 Öde ve Kaydet</button>
      </div>`,
  };
  document.getElementById('modalBox').innerHTML=tpl[type]||'';
  document.getElementById('modalBg').classList.add('open');
  setTimeout(()=>document.querySelector('#modalBox input')?.focus(),100);

  // addTotalPayment için kalan borç bilgilerini doldur
  if(type==='addTotalPayment'){
    const d=S.debtors.find(x=>x.id===id);
    if(d){
      const txs=d.debtor_transactions||[];
      const totalBorc=txs.reduce((a,t)=>a+Number(t.total),0);
      const totalOdenen=txs.flatMap(t=>t.debt_payments||[]).reduce((a,p)=>a+Number(p.amount),0);
      const kalan=Math.max(0,totalBorc-totalOdenen);
      document.getElementById('tpi-toplam').textContent=totalBorc.toLocaleString('tr-TR')+' ₺';
      document.getElementById('tpi-odenen').textContent=totalOdenen.toLocaleString('tr-TR')+' ₺';
      document.getElementById('tpi-kalan').textContent=kalan.toLocaleString('tr-TR')+' ₺';
      // kalan tutarı global'e sakla
      window._kalanBorc=kalan;
    }
  }
  // editDebtor için mevcut bilgileri doldur
  if(type==='editDebtor'){
    const d=S.debtors.find(x=>x.id===id);
    if(d) setTimeout(()=>{
      const set=(elId,val)=>{ const el=document.getElementById(elId); if(el) el.value=val||''; };
      set('f-name', d.name);
      set('f-tc',   d.tc_kimlik);
      set('f-tel',  d.telefon);
      set('f-koy',  d.koy);
      document.getElementById('f-name')?.select();
    },50);
  }
  // editCreditor için mevcut ismi doldur
  if(type==='editCreditor'){
    const c=S.creditors.find(x=>x.id===id);
    if(c) setTimeout(()=>{ const inp=document.getElementById('f-name'); if(inp){inp.value=c.name; inp.select();} },50);
  }
  // editCreditorTrans için mevcut alım verisini doldur
  if(type==='editCreditorTrans'){
    setTimeout(()=>{
      let tx=null;
      for(const c of S.creditors){
        tx=(c.creditor_transactions||[]).find(t=>t.id===id);
        if(tx) break;
      }
      if(!tx) return;
      const bilgi=document.getElementById('ect-urun-bilgi');
      if(bilgi) bilgi.textContent=`${tx.product} — ${Number(tx.qty).toLocaleString('tr-TR')} ${tx.unit} × ${Number(tx.price).toLocaleString('tr-TR')} ₺ = ${Number(tx.total).toLocaleString('tr-TR')} ₺`;
      const set=(elId,val)=>{ const el=document.getElementById(elId); if(el) el.value=val; };
      set('f-prod',tx.product);
      set('f-qty',tx.qty);
      set('f-unit',tx.unit);
      set('f-price',tx.price);
      set('f-date',tx.date);
      set('f-iade-qty',tx.iade_qty||0);
      if(tx.iade_date) set('f-iade-date',tx.iade_date);
    },60);
  }
  // addCreditorPayment — tedarikçinin tüm kalemleri özeti
  if(type==='addCreditorPayment'){
    setTimeout(()=>{
      const c=S.creditors.find(x=>x.id===id); if(!c) return;
      const txs=c.creditor_transactions||[];
      const totalBorc=txs.reduce((a,t)=>a+Number(t.total),0);
      const totalOdenen=txs.flatMap(t=>t.creditor_payments||[]).reduce((a,p)=>a+Number(p.amount),0);
      const kalan=Math.max(0,totalBorc-totalOdenen);
      const set=(elId,val)=>{ const el=document.getElementById(elId); if(el) el.textContent=val; };
      set('cpi-toplam', totalBorc.toLocaleString('tr-TR')+' ₺');
      set('cpi-odenen', totalOdenen.toLocaleString('tr-TR')+' ₺');
      set('cpi-kalan',  kalan.toLocaleString('tr-TR')+' ₺');
      window._creditorKalan=kalan;
      // Kalem listesi
      const kalemEl=document.getElementById('cpi-kalemler');
      if(kalemEl){
        const acikKalemler=txs.filter(t=>{
          const od=(t.creditor_payments||[]).reduce((a,p)=>a+Number(p.amount),0);
          return Number(t.total)-od>0;
        }).sort((a,b)=>a.date.localeCompare(b.date));
        kalemEl.innerHTML=acikKalemler.length
          ? acikKalemler.map(t=>{
              const od=(t.creditor_payments||[]).reduce((a,p)=>a+Number(p.amount),0);
              const txK=Math.max(0,Number(t.total)-od);
              return `<div style="display:flex;gap:8px;padding:7px 10px;border-bottom:1px solid var(--green-border);font-size:12px">
                <span style="font-family:'JetBrains Mono',monospace;color:var(--text-3);flex-shrink:0">${t.date}</span>
                <span style="flex:1;font-weight:700">${t.product}</span>
                <span style="font-weight:900;color:var(--orange);font-family:'JetBrains Mono',monospace">${txK.toLocaleString('tr-TR')} ₺</span>
              </div>`;
            }).join('')
          : '<div style="padding:12px;text-align:center;color:var(--text-3);font-size:12px">Açık kalem yok</div>';
      }
    },60);
  }
  // addCreditorTransPayment — tek kalem ödemesi
  if(type==='addCreditorTransPayment'){
    setTimeout(()=>{
      let tx=null, c=null;
      for(const cr of S.creditors){
        tx=(cr.creditor_transactions||[]).find(t=>t.id===id);
        if(tx){c=cr;break;}
      }
      if(!tx) return;
      const od=(tx.creditor_payments||[]).reduce((a,p)=>a+Number(p.amount),0);
      const kalan=Math.max(0,Number(tx.total)-od);
      window._creditorTransKalan=kalan;
      const bilgi=document.getElementById('ctpi-bilgi');
      if(bilgi) bilgi.innerHTML=`
        <div style="font-size:12px;color:var(--text-3);margin-bottom:4px">${c?.name||''}</div>
        <div style="font-size:14px;font-weight:900">${tx.product}</div>
        <div style="font-size:12px;margin-top:4px;color:var(--text-2)">${tx.date} · ${Number(tx.qty).toLocaleString('tr-TR')} ${tx.unit} · Tutar: ${Number(tx.total).toLocaleString('tr-TR')} ₺</div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--green-border);display:flex;justify-content:space-between">
          <span style="font-size:12px;color:var(--green)">Ödenen: ${od.toLocaleString('tr-TR')} ₺</span>
          <span style="font-size:13px;font-weight:900;color:var(--orange)">Kalan: ${kalan.toLocaleString('tr-TR')} ₺</span>
        </div>`;
    },60);
  }
}
function closeModal(){ document.getElementById('modalBg').classList.remove('open'); }

// Alt kategori listesi — kategoriye göre dinamik
const SUB_CATS = {
  'Gübre':    ['Sıvı Gübre','Katı Gübre','Yaprak Gübre','Organik Gübre','Mikro Besin'],
  'İlaç':     ['Herbisit','Fungisit','İnsektisit','Akarisit','Nematisit','Rodentisit'],
  'Tohum':    ['Sebze Tohumu','Hibrit Tohum','Tahıl Tohumu','Baklagil Tohumu','Çiçek Tohumu'],
  'Haşere':   ['Böcek İlacı','Fare İlacı','Karınca İlacı','Sivrisinek İlacı'],
  'Zehir':    ['Rodentisit','Mollüsisit','Fumigant'],
  'Ekipman':  ['Pompa','Aksesuar','Sulama'],
};

function updateSubOptions(){
  const cat = document.getElementById('f-cat')?.value;
  const subSel = document.getElementById('f-sub');
  if(!subSel||!cat) return;
  const opts = SUB_CATS[cat]||[];
  subSel.innerHTML = opts.map(o=>`<option value="${o}">${o}</option>`).join('');
}

async function saveProduct(){
  const name=fv('f-name');
  const cat=document.getElementById('f-cat')?.value||'';
  const sub=document.getElementById('f-sub')?.value||'';
  const stock=+fv('f-stock');
  const unit=document.getElementById('f-unit')?.value||fv('f-unit');
  const price=+fv('f-price');
  const min=+fv('f-min')||10;
  if(!name||!unit||!price){toast('⚠️ Tüm alanları doldurun',true);return;}
  const d=new Date().toISOString().slice(0,10);
  showLoad();
  const {error}=await db.from('products').insert({name,cat,sub,stock,unit,price,min_stock:min,last_in:d,last_out:d});
  hideLoad();
  if(error){toast('❌ '+error.message,true);return;}
  closeModal(); toast('✅ Ürün eklendi!'); loadProducts();
}

async function updateProduct(){
  const name=fv('f-name'),price=+fv('f-price'),min=+fv('f-min');
  showLoad();
  const {error}=await db.from('products').update({name,price,min_stock:min}).eq('id',_mId);
  hideLoad();
  if(error){toast('❌ '+error.message,true);return;}
  closeModal(); toast('✅ Güncellendi!'); loadProducts();
}

async function doAddStock(){
  const qty=+fv('f-qty'),date=fv('f-date');
  if(!qty||qty<1){toast('⚠️ Geçerli miktar girin',true);return;}
  const p=S.products.find(x=>x.id===_mId);
  showLoad();
  const {error}=await db.from('products').update({stock:p.stock+qty,last_in:date}).eq('id',_mId);
  hideLoad();
  if(error){toast('❌ '+error.message,true);return;}
  closeModal();
  toast(`📥 "${p.name}" — ${qty} ${p.unit} stoğa eklendi! (Yeni stok: ${p.stock+qty} ${p.unit})`);
  loadProducts();
}

async function doRemoveStock(){
  const qty=+fv('f-qty'),price=+fv('f-price'),date=fv('f-date');
  const p=S.products.find(x=>x.id===_mId);
  if(!qty||qty<1||qty>p.stock){toast('⚠️ Geçerli miktar girin',true);return;}
  const now=new Date();
  const time=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
  showLoad();
  const [r1,r2]=await Promise.all([
    db.from('products').update({stock:p.stock-qty,last_out:date}).eq('id',_mId),
    db.from('sales').insert({product_id:p.id,product_name:p.name,qty,unit:p.unit,price:price||p.price,total:qty*(price||p.price),sale_time:time,sale_date:date,cat:p.cat,odeme_turu:'nakit'}),
  ]);
  hideLoad();
  if(r1.error||r2.error){toast('❌ Hata oluştu',true);return;}
  closeModal(); toast(`✅ ${qty} ${p.unit} çıkış yapıldı!`); loadProducts();
}

async function saveDebtor(){
  const name=fv('f-name');
  const tc=fv('f-tc'), tel=fv('f-tel'), koy=fv('f-koy');
  if(!name){toast('⚠️ İsim girin',true);return;}
  if(tc && tc.length!==11){toast('⚠️ TC Kimlik No 11 haneli olmalı',true);return;}
  showLoad();
  const {error}=await db.from('debtors').insert({
    name,
    tc_kimlik:tc||null,
    telefon:tel||null,
    koy:koy||null
  });
  hideLoad();
  if(error){toast('❌ '+error.message,true);return;}
  closeModal(); toast('✅ Kişi eklendi!'); loadDebtors();
}

async function updateDebtor(){
  const name=fv('f-name');
  const tc=fv('f-tc'), tel=fv('f-tel'), koy=fv('f-koy');
  if(!name){toast('⚠️ İsim girin',true);return;}
  if(tc && tc.length!==11){toast('⚠️ TC Kimlik No 11 haneli olmalı',true);return;}
  showLoad();
  const {error}=await db.from('debtors').update({
    name,
    tc_kimlik:tc||null,
    telefon:tel||null,
    koy:koy||null
  }).eq('id',_mId);
  hideLoad();
  if(error){toast('❌ '+error.message,true);return;}
  closeModal();
  toast('✅ Kişi bilgileri güncellendi!');
  await loadDebtors();
  if(S.activeDebtorId===_mId) renderDebtorDetail(_mId);
}

async function deleteDebtor(id, name){
  // Güvenlik: borç kontrolü
  const d=S.debtors.find(x=>x.id===id);
  if(d){
    const txs=d.debtor_transactions||[];
    const totalBorc=txs.reduce((a,t)=>a+Number(t.total),0);
    const totalOdenen=txs.flatMap(t=>t.debt_payments||[]).reduce((a,p)=>a+Number(p.amount),0);
    const kalan=Math.max(0,totalBorc-totalOdenen);
    if(kalan>0){
      toast(`⛔ "${name}" silinemiyor — ${kalan.toLocaleString('tr-TR')} ₺ borç var`,true);
      return;
    }
  }
  if(!confirm(`"${name}" adlı kişiyi ve tüm işlem geçmişini silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`)) return;
  showLoad();
  // Önce ilişkili tüm verileri sil (payments → transactions → debtor)
  const txIds=(d?.debtor_transactions||[]).map(t=>t.id);
  if(txIds.length){
    await db.from('debt_payments').delete().in('transaction_id',txIds);
    await db.from('debtor_transactions').delete().eq('debtor_id',id);
  }
  const {error}=await db.from('debtors').delete().eq('id',id);
  hideLoad();
  if(error){toast('❌ '+error.message,true);return;}
  if(S.activeDebtorId===id){
    S.activeDebtorId=null;
    document.getElementById('debtorDetail').innerHTML=`<div class="empty-state" style="margin:auto"><div class="empty-icon">👈</div><p>Soldaki listeden kişi seçin</p></div>`;
  }
  toast(`🗑️ "${name}" silindi`);
  await loadDebtors();
}

async function saveDebtorTrans(){
  const prod=fv('f-prod'),qty=+fv('f-qty'),unit=fv('f-unit'),price=+fv('f-price'),date=fv('f-date');
  if(!prod||!qty||!unit||!price){toast('⚠️ Tüm alanları doldurun',true);return;}
  showLoad();
  const {error}=await db.from('debtor_transactions').insert({debtor_id:_mId,date,product:prod,qty,unit,price,total:qty*price,paid:false});
  hideLoad();
  if(error){toast('❌ '+error.message,true);return;}
  closeModal(); toast('✅ İşlem eklendi!'); loadDebtors();
}

// ══════════════════════════════════════
//  VERECEKLer ÖDEME SİSTEMİ
// ══════════════════════════════════════

function setCreditorFullPayment(){
  const inp=document.getElementById('f-amount');
  if(inp && window._creditorKalan){ inp.value=window._creditorKalan; updateCreditorPayPreview(); }
}

function setCreditorTransFullPayment(){
  const inp=document.getElementById('f-amount');
  if(inp && window._creditorTransKalan) inp.value=window._creditorTransKalan;
}

function updateCreditorPayPreview(){
  const amount=+document.getElementById('f-amount')?.value||0;
  const kalan=window._creditorKalan||0;
  const prev=document.getElementById('cpi-preview');
  if(!prev) return;
  if(amount<=0){ prev.style.display='none'; return; }
  prev.style.display='block';
  if(amount>=kalan){
    prev.style.cssText='background:#f0faf0;border:1px solid #c8e6c9;border-radius:10px;padding:9px 12px;margin-bottom:8px;font-size:12px;font-weight:700;color:var(--green-dark)';
    prev.textContent=`✅ Tüm borç kapatılacak (${kalan.toLocaleString('tr-TR')} ₺)`;
  } else {
    prev.style.cssText='background:#fff8e1;border:1px solid #ffe082;border-radius:10px;padding:9px 12px;margin-bottom:8px;font-size:12px;font-weight:700;color:var(--orange)';
    prev.textContent=`Ödeme sonrası kalan borç: ${(kalan-amount).toLocaleString('tr-TR')} ₺`;
  }
}

// Toplam ödeme — FIFO: eskiden yeniye kalem kalem düşer
async function saveCreditorPayment(){
  const amount=+fv('f-amount'), date=fv('f-date'), note=fv('f-note');
  const creditorId=_mId;
  if(!amount||amount<=0){ toast('⚠️ Geçerli bir tutar girin',true); return; }

  const c=S.creditors.find(x=>x.id===creditorId);
  if(!c){ toast('⚠️ Tedarikçi bulunamadı',true); return; }

  // Açık kalemleri eskiden yeniye sırala (FIFO)
  const txs=[...(c.creditor_transactions||[])].sort((a,b)=>a.date.localeCompare(b.date));
  let kalanOdenecek=amount;
  const kayitlar=[];

  for(const t of txs){
    if(kalanOdenecek<=0) break;
    const od=(t.creditor_payments||[]).reduce((a,p)=>a+Number(p.amount),0);
    const txKalan=Math.max(0,Number(t.total)-od);
    if(txKalan<=0) continue;
    const buKalem=Math.min(kalanOdenecek, txKalan);
    kayitlar.push({ creditor_id:creditorId, transaction_id:t.id, amount:buKalem, date, note:note||null });
    kalanOdenecek-=buKalem;
  }

  if(!kayitlar.length){ toast('⚠️ Açık kalem bulunamadı',true); return; }

  showLoad();
  const {error}=await db.from('creditor_payments').insert(kayitlar);
  hideLoad();
  if(error){ toast('❌ '+error.message,true); return; }

  closeModal();
  toast(`✅ ${amount.toLocaleString('tr-TR')} ₺ ödeme kaydedildi! (${kayitlar.length} kaleme dağıtıldı)`);
  await loadCreditors();
  if(S.activeCreditorId===creditorId) renderCreditorDetail(creditorId);
}

// Tek kalem ödemesi
async function saveCreditorTransPayment(){
  const amount=+fv('f-amount'), date=fv('f-date'), note=fv('f-note');
  if(!amount||amount<=0){ toast('⚠️ Geçerli bir tutar girin',true); return; }

  const kalan=window._creditorTransKalan||0;
  if(amount>kalan){ toast(`⚠️ Girilen tutar kalemden fazla (kalan: ${kalan.toLocaleString('tr-TR')} ₺)`,true); return; }

  // transaction_id = _mId, creditor_id'yi bul
  let creditorId=null;
  for(const c of S.creditors){
    if((c.creditor_transactions||[]).find(t=>t.id===_mId)){ creditorId=c.id; break; }
  }

  showLoad();
  const {error}=await db.from('creditor_payments').insert({
    creditor_id:creditorId, transaction_id:_mId, amount, date, note:note||null
  });
  hideLoad();
  if(error){ toast('❌ '+error.message,true); return; }

  closeModal();
  toast(`✅ ${amount.toLocaleString('tr-TR')} ₺ kalem ödemesi kaydedildi!`);
  await loadCreditors();
  if(S.activeCreditorId===creditorId) renderCreditorDetail(creditorId);
}

async function saveCreditor(){
  const name=fv('f-name');
  if(!name){toast('⚠️ İsim girin',true);return;}
  showLoad();
  const {error}=await db.from('creditors').insert({name});
  hideLoad();
  if(error){toast('❌ '+error.message,true);return;}
  closeModal(); toast('✅ Tedarikçi eklendi!'); loadCreditors();
}

async function updateCreditor(){
  const name=fv('f-name');
  if(!name){toast('⚠️ İsim girin',true);return;}
  showLoad();
  const {error}=await db.from('creditors').update({name}).eq('id',_mId);
  hideLoad();
  if(error){toast('❌ '+error.message,true);return;}
  closeModal();
  toast('✅ Tedarikçi adı güncellendi!');
  await loadCreditors();
  if(S.activeCreditorId===_mId) renderCreditorDetail(_mId);
}

async function deleteCreditor(id, name, txSayi){
  if(txSayi>0){
    if(!confirm(`"${name}" tedarikçisini ve ${txSayi} alım kaydını tamamen silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`)) return;
  } else {
    if(!confirm(`"${name}" tedarikçisini silmek istediğinize emin misiniz?`)) return;
  }
  showLoad();
  // Önce ödemeleri, sonra işlemleri, sonra tedarikçiyi sil
  const txIds=(S.creditors.find(x=>x.id===id)?.creditor_transactions||[]).map(t=>t.id);
  if(txIds.length){
    await db.from('creditor_payments').delete().in('transaction_id',txIds);
    await db.from('creditor_transactions').delete().eq('creditor_id',id);
  }
  const {error}=await db.from('creditors').delete().eq('id',id);
  hideLoad();
  if(error){toast('❌ '+error.message,true);return;}
  if(S.activeCreditorId===id){
    S.activeCreditorId=null;
    document.getElementById('creditorDetail').innerHTML=`<div class="empty-state" style="margin:auto"><div class="empty-icon">👈</div><p>Soldaki listeden tedarikçi seçin</p></div>`;
  }
  toast(`🗑️ "${name}" silindi`);
  await loadCreditors();
}

async function saveCreditorTrans(){
  const prod=fv('f-prod'),qty=+fv('f-qty'),unit=fv('f-unit'),price=+fv('f-price'),date=fv('f-date');
  const c=S.creditors.find(x=>x.id===_mId);
  if(!prod||!qty||!unit||!price){toast('⚠️ Tüm alanları doldurun',true);return;}
  showLoad();
  const {error}=await db.from('creditor_transactions').insert({creditor_id:_mId,date,product:prod,qty,unit,price,total:qty*price,source:c?.name||''});
  hideLoad();
  if(error){toast('❌ '+error.message,true);return;}
  closeModal(); toast('✅ Alım eklendi!'); loadCreditors();
}

async function saveEditCreditorTrans(){
  const prod=fv('f-prod'),qty=+fv('f-qty'),unit=fv('f-unit'),price=+fv('f-price'),date=fv('f-date');
  const iadeQty=+fv('f-iade-qty')||0;
  const iadeDate=fv('f-iade-date')||date;
  if(!prod||!qty||!unit||!price){toast('⚠️ Tüm alanları doldurun',true);return;}
  if(iadeQty>qty){toast('⚠️ İade miktarı alınan miktardan fazla olamaz',true);return;}

  let eskiTx=null, creditorId=null;
  for(const c of S.creditors){
    eskiTx=(c.creditor_transactions||[]).find(t=>t.id===_mId);
    if(eskiTx){creditorId=c.id;break;}
  }

  const eskiIade=Number(eskiTx?.iade_qty||0);
  // İade yeni girildiyse veya artmışsa → stoga_eklendi false yap
  // Çünkü iade olan ürünün stoğa tekrar eklenmesi gerekiyor
  const iadeArtiYeni = iadeQty > eskiIade;
  const stogaEklendiDeger = iadeArtiYeni ? false : (eskiTx?.stoga_eklendi||false);

  showLoad();

  const {error}=await db.from('creditor_transactions').update({
    product:prod, qty, unit, price, total:qty*price, date,
    iade_qty:iadeQty,
    iade_date:iadeQty>0?iadeDate:null,
    stoga_eklendi:stogaEklendiDeger  // iade artmışsa sıfırla
  }).eq('id',_mId);

  if(error){hideLoad();toast('❌ '+error.message,true);return;}

  // Toast mesajı
  let toastMsg='✅ Alım güncellendi';
  if(iadeArtiYeni){
    toastMsg=`⚠️ ${iadeQty} ${unit} iade girildi — "Stoğa eklendi" işareti kaldırıldı. İade ürünü stoğa ekledikten sonra tekrar işaretleyin.`;
  }

  hideLoad();
  closeModal();
  toast(toastMsg, iadeArtiYeni);
  await loadCreditors();
  if(S.activeCreditorId===creditorId) renderCreditorDetail(creditorId);
  await loadProducts();
}

async function deleteCreditorTrans(){
  if(!confirm('Bu alım kaydını silmek istediğinize emin misiniz?')) return;
  let creditorId=null;
  for(const c of S.creditors){
    if((c.creditor_transactions||[]).find(t=>t.id===_mId)){creditorId=c.id;break;}
  }
  showLoad();
  const {error}=await db.from('creditor_transactions').delete().eq('id',_mId);
  hideLoad();
  if(error){toast('❌ '+error.message,true);return;}
  closeModal();
  toast('🗑️ Alım kaydı silindi');
  await loadCreditors();
  if(S.activeCreditorId===creditorId) renderCreditorDetail(creditorId);
}

function setFullPayment(){
  const inp=document.getElementById('f-amount');
  if(inp && window._kalanBorc){ inp.value=window._kalanBorc; updateTotalPaymentPreview(); }
}

function updateTotalPaymentPreview(){
  const amount=+document.getElementById('f-amount')?.value||0;
  const kalan=window._kalanBorc||0;
  const prev=document.getElementById('tpi-preview');
  if(!prev) return;
  if(amount<=0){ prev.style.display='none'; return; }
  prev.style.display='block';
  if(amount>=kalan){
    prev.style.background='#f0faf0'; prev.style.borderColor='#c8e6c9'; prev.style.color='var(--green-dark)';
    prev.textContent=`✅ Tüm borç kapatılacak (${kalan.toLocaleString('tr-TR')} ₺)`;
  } else {
    const sonraKalan=kalan-amount;
    prev.style.background='#fff8e1'; prev.style.borderColor='#ffe082'; prev.style.color='var(--orange)';
    prev.textContent=`Ödeme sonrası kalan borç: ${sonraKalan.toLocaleString('tr-TR')} ₺`;
  }
}

async function saveTotalPayment(){
  const amount=+fv('f-amount'), date=fv('f-date'), note=fv('f-note');
  const debtorId=_mId;
  console.log('saveTotalPayment debtorId:', debtorId, 'found:', S.debtors.find(x=>x.id===debtorId));
  if(!amount||amount<=0){ toast('⚠️ Geçerli bir tutar girin',true); return; }

  const d=S.debtors.find(x=>x.id===debtorId);
  if(!d){ toast('⚠️ Müşteri bulunamadı',true); return; }

  // İşlemleri eskiden yeniye sırala (FIFO)
  const txs=[...(d.debtor_transactions||[])].sort((a,b)=>a.date.localeCompare(b.date));

  // Kalan borçlu işlemleri bul (kısmen veya hiç ödenmemiş)
  let kalanOdenecek=amount;
  const kayitlar=[]; // {transaction_id, debtor_id, amount, date, note}

  for(const t of txs){
    if(kalanOdenecek<=0) break;
    const odenenBu=(t.debt_payments||[]).reduce((a,p)=>a+Number(p.amount),0);
    const txKalan=Math.max(0,Number(t.total)-odenenBu);
    if(txKalan<=0) continue; // bu işlem zaten ödenmiş, geç

    const buIslemIcin=Math.min(kalanOdenecek, txKalan);
    kayitlar.push({
      debtor_id: debtorId,
      transaction_id: t.id,
      amount: buIslemIcin,
      date,
      note: note||null
    });
    kalanOdenecek-=buIslemIcin;
  }

  if(!kayitlar.length){ toast('⚠️ Ödeme yapılacak borç bulunamadı',true); return; }

  showLoad();
  const {error}=await db.from('debt_payments').insert(kayitlar);
  hideLoad();

  if(error){ toast('❌ '+error.message,true); return; }

  closeModal();
  const fazla=kalanOdenecek>0?` (${kalanOdenecek.toLocaleString('tr-TR')} ₺ fazla ödeme)`:'' ;
  toast(`✅ ${amount.toLocaleString('tr-TR')} ₺ ödeme kaydedildi!${fazla}`);
  await loadDebtors();
  if(S.activeDebtorId) renderDebtorDetail(S.activeDebtorId);
}


// ══════════════════════════════════════
//  SATIS SAYFASI
// ══════════════════════════════════════
let sepet = [];
let _faturaSepet = []; // Son tamamlanan satışın snapshot'ı
let satisAllProducts = [];
let satisActiveCat = 'Tümü';

async function loadSatisPage(){
  showLoad();
  try{
    const {data,error}=await db.from('products').select('*').order('name');
    if(error) throw error;
    satisAllProducts=data||[];
    renderSatisCatTabs();
    renderSatisProducts();
  }catch(e){toast('❌ '+e.message,true);}
  finally{hideLoad();}
}

function renderSatisCatTabs(){
  const cats=['Tümü',...new Set(satisAllProducts.map(p=>p.cat))];
  document.getElementById('satisCatTabs').innerHTML=cats.map(c=>`
    <button class="satis-cat-tab ${satisActiveCat===c?'active':''}" onclick="setSatisCat('${c}')">${c}</button>
  `).join('');
}

function setSatisCat(cat){
  satisActiveCat=cat;
  renderSatisCatTabs();
  renderSatisProducts();
}

function filterSatisProducts(q){
  renderSatisProducts(q);
}

function renderSatisProducts(search=''){
  let prods=satisAllProducts;
  if(satisActiveCat!=='Tümü') prods=prods.filter(p=>p.cat===satisActiveCat);
  if(search) prods=prods.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
  const el=document.getElementById('satisProductList');
  if(!prods.length){el.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📦</div><p>Ürün bulunamadı</p></div>`;return;}
  el.innerHTML=prods.map(p=>{
    const inSepet=sepet.find(s=>s.product.id===p.id);
    const low=p.stock<=p.min_stock;
    const out=p.stock<=0;
    return `<div class="satis-prod-card ${out?'out-of-stock':''}" onclick="addToSepet('${p.id}')">
      <div class="satis-prod-name">${p.name}</div>
      <div class="satis-prod-sub">${p.sub}</div>
      <div class="satis-prod-bottom">
        <div>
          <div class="satis-prod-price">${Number(p.price).toLocaleString('tr-TR')} ₺</div>
          <div class="satis-prod-stock ${low?'low':''}">${out?'Tükendi':p.stock+' '+p.unit}</div>
        </div>
        ${inSepet
          ? `<div style="background:var(--green);color:#fff;border-radius:50px;padding:4px 10px;font-size:12px;font-weight:800">${inSepet.qty} adet</div>`
          : `<button class="satis-prod-add" onclick="addToSepet('${p.id}');event.stopPropagation()">＋</button>`}
      </div>
    </div>`;
  }).join('');
}

function addToSepet(productId){
  const p=satisAllProducts.find(x=>x.id===productId);
  if(!p||p.stock<=0) return;
  const existing=sepet.find(s=>s.product.id===productId);
  if(existing){
    if(existing.qty>=p.stock){toast('⚠️ Stok yetersiz',true);return;}
    existing.qty++;
  } else {
    sepet.push({product:p, qty:1, birimFiyat:p.price});
  }
  renderSepet();
  renderSatisProducts(document.getElementById('satisSearch').value);
}

function removeFromSepet(productId){
  sepet=sepet.filter(s=>s.product.id!==productId);
  renderSepet();
  renderSatisProducts(document.getElementById('satisSearch').value);
}

function updateSepetQty(productId, delta){
  const item=sepet.find(s=>s.product.id===productId);
  if(!item) return;
  item.qty+=delta;
  if(item.qty<=0){ removeFromSepet(productId); return; }
  if(item.qty>item.product.stock){ item.qty=item.product.stock; toast('⚠️ Maks stok',true); }
  renderSepet();
  renderSatisProducts(document.getElementById('satisSearch').value);
}

function clearSepet(){
  sepet=[];
  renderSepet();
  renderSatisProducts(document.getElementById('satisSearch').value);
}

function renderSepet(){
  const el=document.getElementById('sepetItems');
  const btn=document.getElementById('odemeBtn');
  if(!sepet.length){
    el.innerHTML=`<div class="empty-state"><div class="empty-icon">🛒</div><p>Sepet boş</p></div>`;
    document.getElementById('sepetToplam').textContent='0 ₺';
    btn.disabled=true; return;
  }
  const toplam=sepet.reduce((a,s)=>a+s.qty*s.birimFiyat,0);
  el.innerHTML=sepet.map(s=>`
    <div class="sepet-item">
      <div class="sepet-item-info">
        <div class="sepet-item-name">${s.product.name}</div>
        <div class="sepet-item-price">${Number(s.birimFiyat).toLocaleString('tr-TR')} ₺ / ${s.product.unit}</div>
      </div>
      <div class="sepet-item-qty">
        <button class="qty-btn" onclick="updateSepetQty('${s.product.id}',-1)">−</button>
        <span class="qty-val">${s.qty}</span>
        <button class="qty-btn" onclick="updateSepetQty('${s.product.id}',1)">＋</button>
      </div>
      <div class="sepet-item-total">${(s.qty*s.birimFiyat).toLocaleString('tr-TR')} ₺</div>
      <button class="sepet-item-del" onclick="removeFromSepet('${s.product.id}')">✕</button>
    </div>`).join('');
  document.getElementById('sepetToplam').textContent=toplam.toLocaleString('tr-TR')+' ₺';
  btn.disabled=false;
}

// ── ÖDEME MODALI ──
let odemeYontem=null; // 'nakit' | 'kismi' | 'alacak'
let seciliBorcluId=null;

async function openOdemeModal(){
  if(!S.debtors || S.debtors.length === 0){
    const {data: dData} = await db.from('debtors').select('*').order('name');
    S.debtors = (dData||[]).filter(d => d && d.name && typeof d.name === 'string');
  }

  if(!sepet.length) return;
  odemeYontem=null; seciliBorcluId=null;
  const toplam=sepet.reduce((a,s)=>a+s.qty*s.birimFiyat,0);
  const ozet=sepet.map(s=>`
    <div class="odeme-ozet-item">
      <span>${s.product.name} × ${s.qty}</span>
      <span>${(s.qty*s.birimFiyat).toLocaleString('tr-TR')} ₺</span>
    </div>`).join('')+`
    <div class="odeme-ozet-item">
      <span>Toplam</span>
      <span>${toplam.toLocaleString('tr-TR')} ₺</span>
    </div>`;

  const borcluPanelHTML = (prefix) => `
    <div style="margin-bottom:8px">
      <input id="borcluArama-${prefix}" type="text"
        placeholder="👤 Kişi adı yaz veya ara..."
        oninput="filterBorcluList('${prefix}',this.value)"
        style="width:100%;padding:8px 12px;border:1.5px solid var(--green-border);border-radius:10px;font-family:'Nunito',sans-serif;font-size:13px;outline:none"/>
    </div>
    <div class="borclular-list" id="borcluListContainer-${prefix}">${buildBorcluListHTML('',prefix)}</div>
    <div id="yeniKisiWrap-${prefix}" style="display:none;margin-top:10px;background:#f0faf0;border:1.5px solid var(--green-border);border-radius:10px;padding:12px">
      <div style="font-size:12px;font-weight:800;color:var(--green-dark);margin-bottom:8px">➕ Yeni Kişi Olarak Ekle</div>
      <input id="yeniKisiAd-${prefix}" type="text" placeholder="Ad Soyad"
        style="width:100%;padding:8px 12px;border:1.5px solid #e0e0e0;border-radius:8px;font-family:'Nunito',sans-serif;font-size:13px;outline:none;margin-bottom:8px"/>
      <button class="btn btn-green btn-sm" style="width:100%;justify-content:center" onclick="yeniKisiOlusturVeSeç('${prefix}')">Oluştur ve Seç</button>
    </div>`;

  document.getElementById('modalBox').innerHTML=`
    <div style="max-height:85vh;overflow-y:auto;padding-right:4px">
      <h3>💳 Ödeme Yöntemi</h3>
      <div class="odeme-ozet">${ozet}</div>
      <div style="font-size:13px;font-weight:700;color:var(--text-2);margin-bottom:10px">Müşteri nasıl ödeyecek?</div>
      <div class="odeme-yontem-grid">
        <div class="odeme-yontem-btn" onclick="selectOdemeYontem('nakit',this)">
          <div class="odeme-yontem-icon">💵</div>
          <div class="odeme-yontem-label">Tam Ödeme</div>
          <div style="font-size:10px;color:inherit;opacity:.8;margin-top:3px">Hemen tümünü öder</div>
        </div>
        <div class="odeme-yontem-btn" onclick="selectOdemeYontem('kismi',this)">
          <div class="odeme-yontem-icon">💰</div>
          <div class="odeme-yontem-label">Kısmi Ödeme</div>
          <div style="font-size:10px;color:inherit;opacity:.8;margin-top:3px">Bir kısmını şimdi verir</div>
        </div>
        <div class="odeme-yontem-btn" onclick="selectOdemeYontem('alacak',this)">
          <div class="odeme-yontem-icon">📋</div>
          <div class="odeme-yontem-label">Alacağa At</div>
          <div style="font-size:10px;color:inherit;opacity:.8;margin-top:3px">Hiç ödemez, borca girer</div>
        </div>
      </div>

      <!-- Kısmi ödeme alanı -->
      <div id="kismiWrap" style="display:none">
        <div class="odeme-kismi-wrap">
          <div class="odeme-kismi-title">💰 Şimdi Ne Kadar Ödeyecek?</div>
          <div class="form-group">
            <label>Şimdi Ödenecek Tutar (₺)</label>
            <input id="kismiTutar" type="number" placeholder="0" min="0" max="${toplam}" oninput="updateKalanLabel(${toplam})"/>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-3);margin-top:4px">
            <span>Toplam: <b>${toplam.toLocaleString('tr-TR')} ₺</b></span>
            <span>Alacağa Atacak: <b id="kalanLabel">— ₺</b></span>
          </div>
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--text-2);margin-bottom:6px">Borçlu Kişi</div>
        ${borcluPanelHTML('kismi')}
      </div>

      <!-- Tüm alacak alanı -->
      <div id="alacakWrap" style="display:none">
        <div style="font-size:13px;font-weight:700;color:var(--text-2);margin-bottom:6px">Borçlu Kişi Seç</div>
        ${borcluPanelHTML('alacak')}
      </div>

      <!-- Tarih -->
      <div class="form-group" style="margin-top:14px">
        <label>Satış Tarihi</label>
        <input id="satisTarih" type="date" value="${new Date().toISOString().slice(0,10)}"/>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal()">İptal</button>
        <button class="btn btn-green" onclick="tamamlaSatis()">✅ Satışı Tamamla</button>
      </div>
    </div>`;

  document.getElementById('modalBox').classList.add('modal-wide');
  document.getElementById('modalBg').classList.add('open');
  // Debtors yüklü değilse çek
  if(!S.debtors.length) loadDebtors();
}

function buildBorcluListHTML(filter='', prefix='kismi'){
  const list = (S.debtors||[])
    .filter(d => d && typeof d === 'object' && d.name && typeof d.name === 'string')
    .filter(d => !filter || d.name.toLowerCase().includes(filter.toLowerCase()));
  
  if(!list.length && !filter) return `<div style="padding:12px;text-align:center;font-size:12px;color:var(--text-3)">Henüz kayıtlı kişi yok — aşağıdan ekleyin ↓</div>`;
  if(!list.length && filter) return `<div style="padding:12px;text-align:center;font-size:12px;color:var(--text-3)">Bulunamadı — aşağıdan yeni ekleyin ↓</div>`;
  
  return list.map(d=>`
    <div class="borclu-item ${seciliBorcluId===d.id?'selected':''}" onclick="selectBorclu('${d.id}',this,'${prefix}')">
      <span>👤 ${d.name}</span>
    </div>`).join('');
}

function filterBorcluList(prefix, val){
  const container=document.getElementById('borcluListContainer-'+prefix);
  if(container) container.innerHTML=buildBorcluListHTML(val, prefix);
  const found=S.debtors.some(d=>d.name.toLowerCase().includes(val.toLowerCase()));
  const yeniWrap=document.getElementById('yeniKisiWrap-'+prefix);
  const yeniAd=document.getElementById('yeniKisiAd-'+prefix);
  if(yeniWrap) yeniWrap.style.display = val && !found ? 'block' : 'none';
  if(yeniAd)   yeniAd.value = val;
}

async function yeniKisiOlusturVeSeç(prefix){
  const ad = document.getElementById('yeniKisiAd-'+prefix)?.value?.trim();
  if(!ad){toast('⚠️ İsim girin',true);return;}
  // Aynı isimde biri var mı?
  const mevcut=S.debtors.find(d=>d.name.toLowerCase()===ad.toLowerCase());
  if(mevcut){
    seciliBorcluId=mevcut.id;
    const container=document.getElementById('borcluListContainer-'+prefix);
    if(container) container.innerHTML=buildBorcluListHTML('',prefix);
    const yeniWrap=document.getElementById('yeniKisiWrap-'+prefix);
    if(yeniWrap) yeniWrap.style.display='none';
    toast(`✅ "${mevcut.name}" seçildi`);
    return;
  }
  // Yoksa oluştur
  showLoad();
  const {data,error}=await db.from('debtors').insert({name:ad});
  if(error){toast('❌ '+error.message,true);hideLoad();return;}
  const yeniKisi = {id: data.id, name: ad, debtor_transactions:[]};
  S.debtors.push(yeniKisi);
  seciliBorcluId = String(data.id);
  const container=document.getElementById('borcluListContainer-'+prefix);
  if(container) container.innerHTML=buildBorcluListHTML('',prefix);
  const yeniWrap=document.getElementById('yeniKisiWrap-'+prefix);
  if(yeniWrap) yeniWrap.style.display='none';
  hideLoad();
  toast(`✅ "${ad}" oluşturuldu ve seçildi`);
  return;
}

function selectOdemeYontem(yontem, el){
  odemeYontem=yontem;
  document.querySelectorAll('.odeme-yontem-btn').forEach(b=>b.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('kismiWrap').style.display = yontem==='kismi'?'block':'none';
  document.getElementById('alacakWrap').style.display = yontem==='alacak'?'block':'none';
}

function selectBorclu(id, el, prefix){
  seciliBorcluId = String(id);
  const container = document.getElementById('borcluListContainer-'+prefix);
  if(container) container.querySelectorAll('.borclu-item').forEach(b=>b.classList.remove('selected'));
  el.classList.add('selected');
}

function updateKalanLabel(toplam){
  const kismi = parseFloat(document.getElementById('kismiTutar')?.value) || 0;
  const kalan = toplam - kismi;
  document.getElementById('kalanLabel').textContent=(kalan>0?kalan:0).toLocaleString('tr-TR')+' ₺';
}

async function tamamlaSatis(){
  if(!odemeYontem){toast('⚠️ Ödeme yöntemi seçin',true);return;}
  const tarih=document.getElementById('satisTarih')?.value||new Date().toISOString().slice(0,10);
  const now=new Date();
  const time=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
  const toplam=sepet.reduce((a,s)=>a+s.qty*s.birimFiyat,0);

  if((odemeYontem==='kismi'||odemeYontem==='alacak')&&!seciliBorcluId){
    toast('⚠️ Lütfen borçlu kişiyi seçin',true);return;
  }

  let kismiOdenen=0;
  if(odemeYontem==='kismi'){
    kismiOdenen=+document.getElementById('kismiTutar').value||0;
    if(kismiOdenen<0||kismiOdenen>toplam){toast('⚠️ Geçerli tutar girin',true);return;}
  }

  // Fatura için sepet snapshot'ı al (modal kapanmadan önce)
  const faturaSepet = sepet.map(s=>({...s, product:{...s.product}}));
  _faturaSepet = faturaSepet; // global'e kaydet
  const faturaOdeme = odemeYontem;
  const faturaKismi = kismiOdenen;
  const faturaBorc  = odemeYontem==='alacak' ? toplam : (odemeYontem==='kismi' ? toplam-kismiOdenen : 0);
  const borcluAdi   = seciliBorcluId ? (S.debtors.find(d=>d.id===seciliBorcluId)?.name||'') : '';

  showLoad();
  try{
    // 1) Stok düş + satış kaydı
    for(const s of sepet){
      await db.from('products').update({
        stock: s.product.stock - s.qty,
        last_out: tarih
      }).eq('id', s.product.id);

      await db.from('sales').insert({
        product_id: s.product.id,
        product_name: s.product.name,
        qty: s.qty,
        unit: s.product.unit,
        price: s.birimFiyat,
        total: s.qty * s.birimFiyat,
        sale_time: time,
        sale_date: tarih,
        cat: s.product.cat,
        odeme_turu: odemeYontem
      });
    }

    // 2) Alacak kaydı
    if(odemeYontem==='alacak'||odemeYontem==='kismi'){
      const borcTutar = odemeYontem==='alacak' ? toplam : (toplam-kismiOdenen);
      console.log('toplam:', toplam, 'kismiOdenen:', kismiOdenen, 'borcTutar:', borcTutar);
      if(borcTutar>0){
        for(const s of sepet){
          const urunToplam = s.qty * s.birimFiyat;
          const urunBorc = urunToplam; // transaction total = tam ürün tutarı
          if(urunBorc<=0) continue;
          const {data:txData}=await db.from('debtor_transactions').insert({
            debtor_id: seciliBorcluId,
            date: tarih,
            product: s.product.name,
            qty: s.qty,
            unit: s.product.unit,
            price: s.birimFiyat,
            total: urunBorc,
            paid: false
          });

          if(odemeYontem==='kismi'&&kismiOdenen>0&&txData&&txData.id){
            const urunPesin = sepet.length === 1
              ? kismiOdenen
              : Math.round(kismiOdenen / toplam * urunToplam * 100) / 100;
            await db.from('debt_payments').insert({
              debtor_id: seciliBorcluId,
              transaction_id: txData.id,
              amount: urunPesin,
              date: tarih,
              note: 'Peşinat'
            });
          }
        }
      }
    }

    hideLoad();

    // ── Başarı + Fatura Modalı ──
    const faturaNo = 'FAT-' + Date.now().toString().slice(-8);
    document.getElementById('modalBox').innerHTML=`
      <div style="text-align:center;padding:8px 0 16px">
        <div style="font-size:52px;margin-bottom:8px">✅</div>
        <div style="font-size:18px;font-weight:900;color:var(--green-dark);margin-bottom:4px">Satış Tamamlandı!</div>
        <div style="font-size:13px;color:var(--text-3);margin-bottom:20px">${tarih} · ${time} · No: ${faturaNo}</div>

        <div style="background:var(--green-light);border:1px solid var(--green-border);border-radius:12px;padding:14px 18px;margin-bottom:20px;text-align:left">
          ${faturaSepet.map(s=>`
            <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid var(--green-border)">
              <span style="font-weight:700">${s.product.name} <span style="font-weight:400;color:var(--text-3)">× ${s.qty} ${s.product.unit}</span></span>
              <span style="font-weight:800;font-family:'JetBrains Mono',monospace">${(s.qty*s.birimFiyat).toLocaleString('tr-TR')} ₺</span>
            </div>`).join('')}
          <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:900;padding-top:10px;color:var(--green-dark)">
            <span>Toplam</span>
            <span style="font-family:'JetBrains Mono',monospace">${toplam.toLocaleString('tr-TR')} ₺</span>
          </div>
          ${faturaOdeme==='nakit'?`
          <div style="font-size:11px;color:var(--green);font-weight:700;text-align:center;margin-top:6px;background:#fff;border-radius:6px;padding:4px">💵 Tam Ödeme Alındı</div>`:''}
          ${faturaOdeme==='kismi'?`
          <div style="font-size:11px;font-weight:700;text-align:center;margin-top:6px;background:#fff;border-radius:6px;padding:4px">
            💰 Peşinat: <span style="color:var(--green)">${faturaKismi.toLocaleString('tr-TR')} ₺</span> &nbsp;|&nbsp;
            Kalan Borç: <span style="color:var(--red)">${faturaBorc.toLocaleString('tr-TR')} ₺</span> → ${borcluAdi}
          </div>`:''}
          ${faturaOdeme==='alacak'?`
          <div style="font-size:11px;color:var(--red);font-weight:700;text-align:center;margin-top:6px;background:#fff;border-radius:6px;padding:4px">📋 Tümü Alacağa Atıldı → ${borcluAdi}</div>`:''}
        </div>

        <div style="display:flex;gap:10px">
          <button class="btn btn-outline" style="flex:1;justify-content:center" onclick="closeModal()">✕ Kapat</button>
          <button class="btn btn-pdf" style="flex:1.5;justify-content:center;padding:10px 16px" onclick="faturaCikti('${faturaNo}','${tarih}','${time}','${faturaOdeme}','${faturaKismi}','${faturaBorc}','${borcluAdi.replace(/'/g,"\\'")}')">
            🧾 Faturayı Gör / Yazdır
          </button>
        </div>
      </div>`;

    // Sepeti temizle
    sepet=[];
    renderSepet();
    await loadSatisPage();

  }catch(e){
    hideLoad();
    toast('❌ Hata: '+e.message,true);
  }
}

// ══════════════════════════════════════
//  FATURA ÇIKTISI
// ══════════════════════════════════════
function faturaCikti(faturaNo, tarih, time, odemeYontem, kismiOdenen, borcTutar, borcluAdi){
  // Sepet kapandığı için faturaSepet global'den al
  const simdi = new Date().toLocaleString('tr-TR');
  const toplam = _faturaSepet.reduce((a,s)=>a+s.qty*s.birimFiyat, 0);

  const odemeLabel = odemeYontem==='nakit'
    ? '💵 Tam Ödeme — Nakit/Kart'
    : odemeYontem==='kismi'
    ? `💰 Kısmi Ödeme — Peşinat: ${kismiOdenen.toLocaleString('tr-TR')} ₺  |  Kalan: ${borcTutar.toLocaleString('tr-TR')} ₺`
    : `📋 Alacağa Atıldı — Tümü Borç: ${borcTutar.toLocaleString('tr-TR')} ₺`;

  const satirlar = _faturaSepet.map((s,i)=>`
    <tr class="${i%2===0?'cift':'tek'}">
      <td class="bold">${s.product.name}</td>
      <td class="center">${s.product.cat}</td>
      <td class="center">${s.qty} ${s.product.unit}</td>
      <td class="right">${s.birimFiyat.toLocaleString('tr-TR')} ₺</td>
      <td class="right bold green">${(s.qty*s.birimFiyat).toLocaleString('tr-TR')} ₺</td>
    </tr>`).join('');

  const html=`<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8"/>
<title>Fatura ${faturaNo}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Nunito',sans-serif;font-size:11px;color:#1a2e1a;background:#fff;padding:0 24px 24px}
  @page{size:A4;margin:14mm 18mm 16mm 18mm}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:0}.no-print{display:none}}

  /* BAŞLIK */
  .header{background:#0d7a00;color:#fff;padding:16px 22px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;margin:0 -24px}
  .logo-wrap{display:flex;align-items:center;gap:12px}
  .logo{width:40px;height:40px;background:#e8f5e9;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#0d7a00;font-size:15px;flex-shrink:0}
  .firma-adi{font-size:18px;font-weight:900}
  .firma-alt{font-size:10px;opacity:.8;margin-top:2px}
  .fatura-no-wrap{text-align:right}
  .fatura-no{font-size:20px;font-weight:900;font-family:'JetBrains Mono',monospace}
  .fatura-alt{font-size:10px;opacity:.8;margin-top:2px}

  /* BİLGİ BÖLÜMÜ */
  .bilgi-wrap{display:grid;grid-template-columns:1fr 1fr;gap:0;margin:0 -24px;border:1px solid #c8e6c9;border-top:none}
  .bilgi-kart{padding:12px 22px;background:#f0faf0}
  .bilgi-kart:first-child{border-right:1px solid #c8e6c9}
  .bilgi-label{font-size:9px;font-weight:700;color:#4a6a4a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
  .bilgi-deger{font-size:12px;font-weight:700;color:#0d7a00}

  /* TABLO */
  .tablo-wrap{margin-top:20px}
  .tablo-baslik{font-size:13px;font-weight:800;color:#0d7a00;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #0d7a00}
  table{width:100%;border-collapse:collapse}
  thead tr{background:#0d7a00;color:#fff}
  th{padding:9px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.04em}
  th.center{text-align:center}
  th.right{text-align:right}
  td{padding:8px 12px;font-size:11px;border-bottom:1px solid #f0f0f0}
  tr.cift td{background:#fff}
  tr.tek td{background:#f8fdf8}
  td.center{text-align:center}
  td.right{text-align:right}
  td.bold{font-weight:700}
  td.green{color:#0d7a00}

  /* TOPLAM */
  .toplam-wrap{margin-top:12px;display:flex;justify-content:flex-end}
  .toplam-kutu{background:#0d7a00;color:#fff;padding:14px 20px;border-radius:10px;text-align:right;min-width:220px}
  .toplam-label{font-size:10px;opacity:.8;margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em}
  .toplam-deger{font-size:24px;font-weight:900;font-family:'JetBrains Mono',monospace}

  /* ÖDEME DURUMU */
  .odeme-durum{margin-top:14px;padding:10px 16px;border-radius:8px;font-size:11px;font-weight:700;border:1.5px solid}
  .odeme-nakit{background:#f0faf0;border-color:#c8e6c9;color:#0d7a00}
  .odeme-kismi{background:#fff8e1;border-color:#ffe082;color:#f57c00}
  .odeme-alacak{background:#fff0f0;border-color:#ffcdd2;color:#e53935}

  /* ALT BİLGİ */
  .footer{margin-top:20px;padding-top:10px;border-top:1px solid #e0e0e0;display:flex;justify-content:space-between;font-size:9px;color:#aaa}

  /* BASKIYA HAZIRLA BUTONU */
  .print-btn{display:block;width:100%;margin:16px 0 0;padding:12px;background:#0d7a00;color:#fff;border:none;border-radius:8px;font-family:'Nunito',sans-serif;font-size:14px;font-weight:800;cursor:pointer;text-align:center}
  .print-btn:hover{background:#0a5c00}
</style>
</head>
<body>

  <!-- BAŞLIK -->
  <div class="header">
    <div class="logo-wrap">
      <div class="logo">TS</div>
      <div>
        <div class="firma-adi">Zinar Zirai İlaç Satışı</div>
        <div class="firma-alt">Ziraai İlaç ve Tarım Ürünleri</div>
      </div>
    </div>
    <div class="fatura-no-wrap">
      <div class="fatura-no">${faturaNo}</div>
      <div class="fatura-alt">Satış Faturası</div>
    </div>
  </div>

  <!-- BİLGİ -->
  <div class="bilgi-wrap">
    <div class="bilgi-kart">
      <div class="bilgi-label">Satış Tarihi</div>
      <div class="bilgi-deger">${tarih} — Saat ${time}</div>
    </div>
    <div class="bilgi-kart">
      <div class="bilgi-label">Oluşturulma</div>
      <div class="bilgi-deger">${simdi}</div>
    </div>
    ${borcluAdi ? `
    <div class="bilgi-kart" style="grid-column:1/-1;border-top:1px solid #c8e6c9">
      <div class="bilgi-label">Müşteri</div>
      <div class="bilgi-deger">${borcluAdi}</div>
    </div>` : ''}
  </div>

  <!-- ÜRÜN TABLOSU -->
  <div class="tablo-wrap">
    <div class="tablo-baslik">Satış Detayları</div>
    <table>
      <thead>
        <tr>
          <th style="width:38%">Ürün Adı</th>
          <th class="center" style="width:16%">Kategori</th>
          <th class="center" style="width:14%">Miktar</th>
          <th class="right"  style="width:16%">Birim Fiyat</th>
          <th class="right"  style="width:16%">Toplam</th>
        </tr>
      </thead>
      <tbody>
        ${satirlar}
      </tbody>
    </table>
  </div>

  <!-- TOPLAM -->
  <div class="toplam-wrap" style="gap:10px;flex-direction:column;align-items:flex-end">
    ${odemeYontem==='kismi'?`
    <div style="display:flex;gap:10px;justify-content:flex-end;width:100%">
      <div class="toplam-kutu" style="background:#f57c00;min-width:180px">
        <div class="toplam-label">Peşinat Alındı</div>
        <div class="toplam-deger">${kismiOdenen.toLocaleString('tr-TR')} ₺</div>
      </div>
      <div class="toplam-kutu" style="background:#e53935;min-width:180px">
        <div class="toplam-label">Kalan Borç</div>
        <div class="toplam-deger">${borcTutar.toLocaleString('tr-TR')} ₺</div>
      </div>
    </div>`:''}
    <div class="toplam-kutu" style="background:${odemeYontem==='nakit'?'#0d7a00':odemeYontem==='kismi'?'#1565c0':'#c62828'}">
      <div class="toplam-label">${odemeYontem==='nakit'?'Genel Toplam (Nakit)':odemeYontem==='kismi'?'Genel Toplam':'⚠️ Alacağa Atıldı'}</div>
      <div class="toplam-deger">${toplam.toLocaleString('tr-TR')} ₺</div>
      ${odemeYontem==='alacak'?`<div style="font-size:10px;opacity:.85;margin-top:4px">Tamamı borç — Nakit tahsilat yapılmadı</div>`:''}
    </div>
  </div>

  <!-- ÖDEME DURUMU -->
  <div class="odeme-durum ${odemeYontem==='nakit'?'odeme-nakit':odemeYontem==='kismi'?'odeme-kismi':'odeme-alacak'}">
    ${odemeLabel}${borcluAdi&&odemeYontem!=='nakit'?' — Müşteri: '+borcluAdi:''}
  </div>

  <!-- ALT BİLGİ -->
  <div class="footer">
    <span>Zinar Zirai İlaç Satışı — Resmi Satış Belgesi</span>
    <span>${faturaNo} · ${tarih}</span>
  </div>

  <button class="print-btn no-print" onclick="window.print()">🖨️ Yazdır / PDF Olarak Kaydet</button>

</body>
</html>`;

  const w = window.open('', '_blank', 'width=860,height=720');
  w.document.write(html);
  w.document.close();
  w.onload = () => setTimeout(()=>{ w.focus(); }, 400);
}

