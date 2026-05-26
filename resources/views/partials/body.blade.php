<!-- ══════════════════════════════════════
     GİRİŞ EKRANI
══════════════════════════════════════ -->
<div id="loginScreen" style="
  display:flex;position:fixed;inset:0;z-index:9999;
  background:linear-gradient(135deg,#e8f5e9 0%,#c8e6c9 50%,#a5d6a7 100%);
  align-items:center;justify-content:center;
  font-family:'Nunito',sans-serif;
">
  <div style="
    background:#fff;border-radius:24px;padding:40px 36px;
    width:min(400px,92vw);
    box-shadow:0 20px 60px rgba(13,122,0,.18);
    text-align:center;
  ">
    <div style="
      width:64px;height:64px;border-radius:18px;
      background:linear-gradient(135deg,#13a400,#0d7a00);
      display:flex;align-items:center;justify-content:center;
      font-size:32px;margin:0 auto 16px;
      box-shadow:0 8px 24px rgba(13,122,0,.25);
    ">🌿</div>
    <div style="font-size:22px;font-weight:900;color:#0d7a00;margin-bottom:4px">Zinar Zirai İlaç Satışı</div>
    <div style="font-size:13px;color:#8aaa8a;margin-bottom:28px">Devam etmek için giriş yapın</div>
    <div style="text-align:left;margin-bottom:14px">
      <label style="font-size:12px;font-weight:700;color:#4a6a4a;display:block;margin-bottom:5px">E-posta</label>
      <input id="loginEmail" type="email" placeholder="admin@ziraai.com"
        style="width:100%;padding:12px 14px;border:1.5px solid #e0e0e0;border-radius:12px;font-family:'Nunito',sans-serif;font-size:14px;outline:none;transition:border .2s"
        onfocus="this.style.borderColor='#13a400'" onblur="this.style.borderColor='#e0e0e0'"
        onkeydown="if(event.key==='Enter')document.getElementById('loginPassword').focus()"
      />
    </div>
    <div style="text-align:left;margin-bottom:22px">
      <label style="font-size:12px;font-weight:700;color:#4a6a4a;display:block;margin-bottom:5px">Şifre</label>
      <div style="position:relative">
        <input id="loginPassword" type="password" placeholder="••••••••"
          style="width:100%;padding:12px 44px 12px 14px;border:1.5px solid #e0e0e0;border-radius:12px;font-family:'Nunito',sans-serif;font-size:14px;outline:none;transition:border .2s"
          onfocus="this.style.borderColor='#13a400'" onblur="this.style.borderColor='#e0e0e0'"
          onkeydown="if(event.key==='Enter')doLogin()"
        />
        <span onclick="toggleLoginPass()" id="loginPassEye"
          style="position:absolute;right:14px;top:50%;transform:translateY(-50%);cursor:pointer;font-size:16px;color:#8aaa8a;user-select:none">👁</span>
      </div>
    </div>
    <div id="loginErr" style="display:none;background:#fff0f0;border:1px solid #ffcdd2;border-radius:10px;padding:10px 14px;margin-bottom:14px;font-size:13px;font-weight:700;color:#e53935;text-align:left"></div>
    <button id="loginBtn" onclick="doLogin()" style="
      width:100%;padding:13px;border:none;border-radius:12px;
      background:linear-gradient(135deg,#13a400,#0d7a00);color:#fff;
      font-family:'Nunito',sans-serif;font-size:15px;font-weight:800;
      cursor:pointer;transition:all .2s;box-shadow:0 6px 20px rgba(13,122,0,.3);
    ">Giriş Yap</button>
    <div id="loginSpinner" style="display:none;margin-top:14px;color:#8aaa8a;font-size:13px">⏳ Giriş yapılıyor...</div>
  </div>
</div>

<div class="app" id="mainApp" style="display:none">

  <!-- TOPBAR -->
  <div class="topbar">
    <div class="topbar-brand">
      <div class="topbar-logo">🌿</div>
      <div class="topbar-title">Zinar Zirai İlaç Satışı</div>
    </div>
    <div class="topbar-nav">
      <button class="nav-btn active" onclick="showPage('stock')">Anasayfa</button>
      <button class="nav-btn" onclick="showPage('satis')">🛒 Satış Yap</button>
      <button class="nav-btn" onclick="showPage('dashboard')">Dashboard</button>
      <button class="nav-btn" onclick="showPage('alacaklar')">Alacaklar</button>
      <button class="nav-btn" onclick="showPage('verecekler')">Verecekler</button>
      <button class="nav-btn" onclick="showPage('eskiborc')">📒 Eski Borçlar</button>
    </div>
    <div class="topbar-right">
      <!-- Hamburger: sadece mobilde görünür -->
      <div class="hamburger" onclick="toggleSidebar()">☰</div>
      <div class="db-status">
        <div class="db-dot loading" id="dbDot"></div>
        <span id="dbLabel">Bağlanıyor...</span>
      </div>
      <div class="topbar-date" id="topbarDate"></div>
      <button onclick="doLogout()" style="
        padding:6px 12px;border-radius:50px;border:1.5px solid var(--green-border);
        background:transparent;font-family:'Nunito',sans-serif;font-size:12px;
        font-weight:700;color:var(--text-3);cursor:pointer;transition:all .2s;
        white-space:nowrap;
      " onmouseover="this.style.background='var(--red-soft)';this.style.color='var(--red)';this.style.borderColor='var(--red)'"
         onmouseout="this.style.background='transparent';this.style.color='var(--text-3)';this.style.borderColor='var(--green-border)'"
      >Çıkış</button>
    </div>
  </div>

  <div class="body">
    <!-- SIDEBAR -->
    <div class="sidebar">

      <!-- Tümünü Göster -->
      <div id="btn-tumUrunler" class="sub-item active-sub" style="font-weight:800;margin-bottom:8px;padding:9px 12px;background:var(--green);color:#fff;border-radius:10px;border-left:none" onclick="clearFilter()">🏠 Tüm Ürünler</div>

      <!-- GÜBRE -->
      <div>
        <div class="cat-header" onclick="toggleCat('gubre')"><span><span class="cat-icon">🌱</span>Gübre</span><span class="cat-arrow" id="arrow-gubre">▼</span></div>
        <div class="sub-list" id="sub-gubre">
          <div class="sub-item" onclick="filterSub('Sıvı Gübre','gubre')">Sıvı Gübre</div>
          <div class="sub-item" onclick="filterSub('Katı Gübre','gubre')">Katı Gübre</div>
          <div class="sub-item" onclick="filterSub('Yaprak Gübre','gubre')">Yaprak Gübre</div>
          <div class="sub-item" onclick="filterSub('Organik Gübre','gubre')">Organik Gübre</div>
          <div class="sub-item" onclick="filterSub('Mikro Besin','gubre')">Mikro Besin</div>
        </div>
      </div>

      <!-- İLAÇ -->
      <div>
        <div class="cat-header" onclick="toggleCat('ilac')"><span><span class="cat-icon">💊</span>İlaç</span><span class="cat-arrow" id="arrow-ilac">▼</span></div>
        <div class="sub-list" id="sub-ilac">
          <div class="sub-item" onclick="filterSub('Herbisit','ilac')">Herbisit</div>
          <div class="sub-item" onclick="filterSub('İnsektisit','ilac')">İnsektisit</div>
          <div class="sub-item" onclick="filterSub('Fungisit','ilac')">Fungisit</div>
          <div class="sub-item" onclick="filterSub('Akarisit','ilac')">Akarisit</div>
          <div class="sub-item" onclick="filterSub('Nematisit','ilac')">Nematisit</div>
          <div class="sub-item" onclick="filterSub('Rodentisit','ilac')">Rodentisit</div>
        </div>
      </div>

      <!-- TOHUM -->
      <div>
        <div class="cat-header" onclick="toggleCat('tohum')"><span><span class="cat-icon">🌾</span>Tohum</span><span class="cat-arrow" id="arrow-tohum">▼</span></div>
        <div class="sub-list" id="sub-tohum">
          <div class="sub-item" onclick="filterSub('Sebze Tohumu','tohum')">Sebze Tohumu</div>
          <div class="sub-item" onclick="filterSub('Hibrit Tohum','tohum')">Hibrit Tohum</div>
          <div class="sub-item" onclick="filterSub('Tahıl Tohumu','tohum')">Tahıl Tohumu</div>
          <div class="sub-item" onclick="filterSub('Baklagil Tohumu','tohum')">Baklagil Tohumu</div>
          <div class="sub-item" onclick="filterSub('Çiçek Tohumu','tohum')">Çiçek Tohumu</div>
        </div>
      </div>

      <!-- HAŞERE -->
      <div>
        <div class="cat-header" onclick="toggleCat('hasere')"><span><span class="cat-icon">🐛</span>Haşere</span><span class="cat-arrow" id="arrow-hasere">▼</span></div>
        <div class="sub-list" id="sub-hasere">
          <div class="sub-item" onclick="filterSub('Böcek İlacı','hasere')">Böcek İlacı</div>
          <div class="sub-item" onclick="filterSub('Fare İlacı','hasere')">Fare İlacı</div>
          <div class="sub-item" onclick="filterSub('Karınca İlacı','hasere')">Karınca İlacı</div>
          <div class="sub-item" onclick="filterSub('Sivrisinek İlacı','hasere')">Sivrisinek İlacı</div>
        </div>
      </div>

      <!-- ZEHİR -->
      <div>
        <div class="cat-header" onclick="toggleCat('zehir')"><span><span class="cat-icon">☠️</span>Zehir</span><span class="cat-arrow" id="arrow-zehir">▼</span></div>
        <div class="sub-list" id="sub-zehir">
          <div class="sub-item" onclick="filterSub('Rodentisit','zehir')">Rodentisit</div>
          <div class="sub-item" onclick="filterSub('Mollüsisit','zehir')">Mollüsisit</div>
          <div class="sub-item" onclick="filterSub('Fumigant','zehir')">Fumigant</div>
        </div>
      </div>

      <!-- EKİPMAN -->
      <div>
        <div class="cat-header" onclick="toggleCat('ekipman')"><span><span class="cat-icon">🔧</span>Ekipman</span><span class="cat-arrow" id="arrow-ekipman">▼</span></div>
        <div class="sub-list" id="sub-ekipman">
          <div class="sub-item" onclick="filterSub('Pompa','ekipman')">Pompa</div>
          <div class="sub-item" onclick="filterSub('Aksesuar','ekipman')">Aksesuar</div>
          <div class="sub-item" onclick="filterSub('Sulama','ekipman')">Sulama</div>
        </div>
      </div>

    </div>

    <!-- MAIN -->
    <div class="main">

      <!-- SATIS PAGE -->
      <div class="page" id="page-satis">
        <div class="page-header">
          <div>
            <div class="page-title">🛒 Satış Yap</div>
            <div class="page-sub">Ürün seç, sepete ekle, ödeme yöntemini belirle</div>
          </div>
        </div>
        <div class="satis-layout">
          <!-- Sol: Ürün Listesi -->
          <div class="satis-urunler">
            <div class="satis-search-wrap">
              <input type="text" id="satisSearch" placeholder="🔍 Ürün ara..." oninput="filterSatisProducts(this.value)"/>
            </div>
            <div class="satis-cat-tabs" id="satisCatTabs"></div>
            <div class="satis-product-list" id="satisProductList"></div>
          </div>
          <!-- Sağ: Sepet -->
          <div class="satis-sepet">
            <div class="sepet-header">
              <div style="font-size:16px;font-weight:900;color:var(--green-dark)">🧺 Sepet</div>
              <button class="btn btn-outline btn-sm" onclick="clearSepet()">Temizle</button>
            </div>
            <div class="sepet-items" id="sepetItems">
              <div class="empty-state"><div class="empty-icon">🛒</div><p>Sepet boş</p></div>
            </div>
            <div class="sepet-footer">
              <div class="sepet-toplam">
                <span>Toplam:</span>
                <span class="sepet-toplam-tutar" id="sepetToplam">0 ₺</span>
              </div>
              <button class="btn btn-green" style="width:100%;justify-content:center;margin-top:12px;font-size:15px;padding:12px" onclick="openOdemeModal()" id="odemeBtn" disabled>
                Ödeme Adımına Geç →
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- STOCK PAGE -->
      <div class="page active" id="page-stock">
        <div class="page-header">
          <div>
            <div class="page-title" id="stockTitle">Tüm Ürünler</div>
            <div class="page-sub" id="stockSub">Stokta bulunan tüm ürünler</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div style="position:relative">
              <input type="text" id="stockSearchInput"
                placeholder="🔍 Ürün ara..."
                oninput="stockSearch(this.value)"
                style="padding:8px 14px 8px 14px;border:1.5px solid var(--green-border);border-radius:50px;font-family:'Nunito',sans-serif;font-size:13px;outline:none;width:200px;background:var(--white);transition:border .2s"
                onfocus="this.style.borderColor='var(--green)'"
                onblur="this.style.borderColor='var(--green-border)'"
              />
              <span id="stockSearchClear" onclick="clearStockSearch()" style="display:none;position:absolute;right:12px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--text-3);font-size:14px">✕</span>
            </div>
            <button class="btn btn-green" onclick="openModal('addProduct')">＋ Yeni Ürün Ekle</button>
          </div>
        </div>
        <div class="product-grid" id="productGrid">
          <div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⏳</div><p>Yükleniyor...</p></div>
        </div>
      </div>

      <!-- DASHBOARD PAGE -->
      <div class="page" id="page-dashboard">

        <!-- Filtre Çubuğu -->
        <div class="dash-filter-bar">
          <div class="dash-filter-left">
            <div class="page-title" style="margin:0">📊 Dashboard</div>
            <div class="dash-quick-btns">
              <button class="dash-qbtn active" onclick="setDashQuick('today',this)">Bugün</button>
              <button class="dash-qbtn" onclick="setDashQuick('yesterday',this)">Dün</button>
              <button class="dash-qbtn" onclick="setDashQuick('week',this)">Bu Hafta</button>
              <button class="dash-qbtn" onclick="setDashQuick('month',this)">Bu Ay</button>
              <button class="dash-qbtn" onclick="setDashQuick('year',this)">Bu Yıl</button>
              <button class="dash-qbtn" onclick="setDashQuick('all',this)">Tümü</button>
            </div>
          </div>
          <div class="dash-filter-right">
            <div class="dash-date-range">
              <input type="date" id="dashDateFrom" onchange="applyDashFilter()"/>
              <span style="color:var(--text-3);font-size:13px">—</span>
              <input type="date" id="dashDateTo" onchange="applyDashFilter()"/>
            </div>
            <select id="dashCatFilter" onchange="applyDashFilter()" class="dash-select">
              <option value="">Tüm Kategoriler</option>
              <option value="Gübre">🌱 Gübre</option>
              <option value="İlaç">💊 İlaç</option>
              <option value="Tohum">🌾 Tohum</option>
              <option value="Haşere">🐛 Haşere</option>
              <option value="Zehir">☠️ Zehir</option>
              <option value="Ekipman">🔧 Ekipman</option>
            </select>
            <input type="text" id="dashUrunFilter" placeholder="🔍 Ürün ara..." oninput="applyDashFilter()" class="dash-search"/>
          </div>
        </div>

        <!-- Özet Kartlar -->
        <div class="dash-grid" id="dashCards"></div>

        <!-- Satış Tablosu -->
        <div class="table-wrap">
          <div class="table-title" style="display:flex;align-items:center;justify-content:space-between">
            <span id="dashTableTitle">📋 Satışlar</span>
            <span id="dashTableMeta" style="font-size:12px;font-weight:600;color:var(--text-3)"></span>
          </div>
          <table>
            <thead><tr><th>Ürün</th><th>Kategori</th><th>Miktar</th><th>Birim Fiyat</th><th>Toplam</th><th>Tarih</th><th>Saat</th></tr></thead>
            <tbody id="salesTableBody"></tbody>
          </table>
        </div>

        <!-- Alt Butonlar -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;flex-wrap:wrap;gap:10px">
          <button class="btn-yedek" onclick="tamYedekAl()" id="yedekBtn">
            <span style="font-size:16px">🛡️</span> Tam Yedek Al
          </button>
          <button class="btn btn-pdf" onclick="exportPDF()" id="pdfBtn">
            <span style="font-size:16px">⬇</span> PDF Çıktısı Al
          </button>
        </div>

      </div>

      <!-- ALACAKLAR PAGE -->
      <div class="page" id="page-alacaklar">
        <div class="page-header">
          <div class="page-title">💳 Alacaklar</div>
          <button class="btn btn-green" onclick="openModal('addDebtor')">＋ Kişi Ekle</button>
        </div>

        <!-- Alacak Özet Kartları -->
        <div class="borc-ozet-bar" id="alacakOzetBar" style="display:none">
          <div class="borc-ozet-kart vurgu">
            <div class="borc-ozet-label">Toplam Alacak</div>
            <div class="borc-ozet-deger" id="alacak-toplam">— ₺</div>
          </div>
          <div class="borc-ozet-kart">
            <div class="borc-ozet-label">Tahsil Edilen</div>
            <div class="borc-ozet-deger yesil" id="alacak-odenen">— ₺</div>
          </div>
          <div class="borc-ozet-kart">
            <div class="borc-ozet-label">Kalan Alacak</div>
            <div class="borc-ozet-deger kirmizi" id="alacak-kalan">— ₺</div>
          </div>
          <div class="borc-ozet-kart">
            <div class="borc-ozet-label">Alacaklı Kişi</div>
            <div class="borc-ozet-deger" id="alacak-kisi">—</div>
          </div>
        </div>

        <div class="debt-layout">
          <div class="person-panel">
            <div class="person-search"><input type="text" placeholder="🔍 Kişi ara..." oninput="filterPersonList('debtor',this.value)"/></div>
            <div class="person-list" id="debtorList"></div>
          </div>
          <div class="detail-panel" id="debtorDetail">
            <div class="empty-state" style="margin:auto"><div class="empty-icon">👈</div><p>Soldaki listeden kişi seçin</p></div>
          </div>
        </div>
      </div>

      <!-- VERECEKLER PAGE -->
      <div class="page" id="page-verecekler">
        <div class="page-header">
          <div class="page-title">📦 Verecekler</div>
          <button class="btn btn-green" onclick="openModal('addCreditor')">＋ Tedarikçi Ekle</button>
        </div>

        <!-- Verecek Özet Kartları -->
        <div class="borc-ozet-bar" id="verecekOzetBar" style="display:none">
          <div class="borc-ozet-kart vurgu-turuncu">
            <div class="borc-ozet-label">Toplam Alım</div>
            <div class="borc-ozet-deger" id="verecek-toplam">— ₺</div>
          </div>
          <div class="borc-ozet-kart">
            <div class="borc-ozet-label">Ödenen</div>
            <div class="borc-ozet-deger yesil" id="verecek-odenen">— ₺</div>
          </div>
          <div class="borc-ozet-kart">
            <div class="borc-ozet-label">Kalan Borç</div>
            <div class="borc-ozet-deger kirmizi" id="verecek-kalan">— ₺</div>
          </div>
          <div class="borc-ozet-kart">
            <div class="borc-ozet-label">Tedarikçi</div>
            <div class="borc-ozet-deger" id="verecek-kisi">—</div>
          </div>
        </div>

        <div class="debt-layout">
          <div class="person-panel">
            <div class="person-search"><input type="text" placeholder="🔍 Tedarikçi ara..." oninput="filterPersonList('creditor',this.value)"/></div>
            <div class="person-list" id="creditorList"></div>
          </div>
          <div class="detail-panel" id="creditorDetail">
            <div class="empty-state" style="margin:auto"><div class="empty-icon">👈</div><p>Soldaki listeden tedarikçi seçin</p></div>
          </div>
        </div>
      </div>

      <!-- ESKİ BORÇLAR PAGE — Tamamen izole, localStorage -->
      <div class="page" id="page-eskiborc">
        <div class="page-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <div class="page-title">📒 Eski Borçlar</div>
            <div class="page-sub" style="font-size:12px;color:var(--text-3)">Uygulamadan önce birikmiş borçların takibi — diğer sayfalara etki etmez</div>
          </div>
          <button class="btn btn-green" style="flex-shrink:0" onclick="eskiBorcModal()">＋ Borçlu Ekle</button>
        </div>

        <!-- Özet bar -->
        <div class="borc-ozet-bar" id="eskiBorcOzetBar" style="display:none">
          <div class="borc-ozet-kart vurgu">
            <div class="borc-ozet-label">Toplam Borç</div>
            <div class="borc-ozet-deger" id="eb-toplam">— ₺</div>
          </div>
          <div class="borc-ozet-kart">
            <div class="borc-ozet-label">Tahsil Edilen</div>
            <div class="borc-ozet-deger yesil" id="eb-odenen">— ₺</div>
          </div>
          <div class="borc-ozet-kart">
            <div class="borc-ozet-label">Kalan</div>
            <div class="borc-ozet-deger kirmizi" id="eb-kalan">— ₺</div>
          </div>
          <div class="borc-ozet-kart">
            <div class="borc-ozet-label">Borçlu Kişi</div>
            <div class="borc-ozet-deger" id="eb-kisi">—</div>
          </div>
        </div>

        <!-- Liste -->
        <div id="eskiBorcListe" style="display:flex;flex-direction:column;gap:10px">
          <div class="empty-state"><div class="empty-icon">📒</div><p>Henüz kayıt yok</p></div>
        </div>

        <!-- Modal -->
        <div id="ebModalBg" onclick="if(event.target===this)kapatEbModal()" style="
          display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);
          z-index:500;align-items:center;justify-content:center;
          backdrop-filter:blur(2px)
        ">
          <div id="ebModalKutu" style="
            background:#fff;border-radius:18px;padding:24px;
            width:min(460px,94vw);max-height:90svh;overflow-y:auto;
            box-shadow:0 24px 60px rgba(0,0,0,.2);
          "></div>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- Sidebar overlay (mobile) -->
<div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>

<!-- LOADING -->
<div class="loading-overlay" id="loadingOverlay"><div class="spinner"></div></div>

<!-- MODAL -->
<div class="modal-bg" id="modalBg" onclick="if(event.target===this)closeModal()">
  <div class="modal" id="modalBox"></div>
</div>

<!-- TOAST -->
<div class="toast" id="toast"></div>

<!-- BOTTOM NAV (sadece mobilde görünür) -->
<nav class="mobile-nav">
  <button class="mobile-nav-btn active" id="mnav-stock" onclick="showPage('stock');closeSidebar()">
    <span class="mnav-icon">🏠</span>Stok
  </button>
  <button class="mobile-nav-btn" id="mnav-satis" onclick="showPage('satis');closeSidebar()">
    <span class="mnav-icon">🛒</span>Satış
  </button>
  <button class="mobile-nav-btn" id="mnav-dashboard" onclick="showPage('dashboard');closeSidebar()">
    <span class="mnav-icon">📊</span>Rapor
  </button>
  <button class="mobile-nav-btn" id="mnav-alacaklar" onclick="showPage('alacaklar');closeSidebar()">
    <span class="mnav-icon">💳</span>Alacak
  </button>
  <button class="mobile-nav-btn" id="mnav-verecekler" onclick="showPage('verecekler');closeSidebar()">
    <span class="mnav-icon">📦</span>Vercek
  </button>
  <button class="mobile-nav-btn" id="mnav-eskiborc" onclick="showPage('eskiborc');closeSidebar()">
    <span class="mnav-icon">📒</span>Eski
  </button>
</nav>