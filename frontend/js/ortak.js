// =====================================================================
// Tüm iç sayfalarda ortak: oturum kontrolü, üst menü, bildirim ve biçimlendirme.
// Kullanım: const ben = await Ortak.basla('menu');
// =====================================================================
const Ortak = {
  sayfalar: [
    { id: 'menu', ad: 'Günün Menüsü', adres: '/menu.html' },
    { id: 'haftalik', ad: 'Haftalık Menü', adres: '/haftalik.html' },
    { id: 'rezervasyonlarim', ad: 'Rezervasyonlarım', adres: '/rezervasyonlarim.html' },
    { id: 'bakiye', ad: 'Bakiye', adres: '/bakiye.html' },
    { id: 'degerlendirme', ad: 'Değerlendirme', adres: '/degerlendirme.html' },
    { id: 'yonetici', ad: 'Yönetici', adres: '/yonetici.html', rol: 'yonetici' },
  ],

  // Oturum yoksa giriş sayfasına yönlendirir; varsa üst menüyü çizer
  async basla(aktifSayfa) {
    if (!Api.tokenAl()) {
      location.href = '/index.html';
      return new Promise(() => {}); // yönlendirme sırasında sayfa kodu çalışmasın
    }
    const ben = await Api.get('/ben');
    if (aktifSayfa === 'yonetici' && ben.rol !== 'yonetici') {
      location.href = '/menu.html';
      return new Promise(() => {});
    }
    Ortak.ustMenuCiz(ben, aktifSayfa);
    return ben;
  },

  ustMenuCiz(ben, aktifSayfa) {
    const baglantilar = Ortak.sayfalar
      .filter((s) => !s.rol || s.rol === ben.rol)
      .map((s) => `<a href="${s.adres}"${s.id === aktifSayfa ? ' aria-current="page"' : ''}>${s.ad}</a>`)
      .join('');

    const ust = document.createElement('header');
    ust.className = 'ust';
    ust.innerHTML = `
      <div class="kapsayici ust-ic">
        <a class="logo" href="/menu.html">Yemekhane</a>
        <div class="kullanici">
          <span>${Ortak.kacis(ben.ad)} ${Ortak.kacis(ben.soyad)}</span>
          <span class="rozet" id="ust-bakiye">${Ortak.tl(ben.bakiye)}</span>
          <button type="button" class="dugme-ince" id="cikis">Çıkış</button>
        </div>
      </div>
      <nav class="kapsayici menu-cubugu" aria-label="Ana menü">${baglantilar}</nav>`;
    document.body.prepend(ust);

    // Telefonda menü yana kayar: aktif sekmeyi görünür alana getir
    const aktif = ust.querySelector('[aria-current="page"]');
    if (aktif) ust.querySelector('.menu-cubugu').scrollLeft = aktif.offsetLeft - 16;

    document.getElementById('cikis').addEventListener('click', async () => {
      try { await Api.post('/cikis'); } catch { /* oturum zaten düşmüş olabilir */ }
      Api.tokenSil();
      location.href = '/index.html';
    });
  },

  // Rezervasyon/yükleme sonrası sunucunun döndürdüğü güncel bakiyeyi üstte göster
  bakiyeGuncelle(bakiye) {
    const alan = document.getElementById('ust-bakiye');
    if (alan) alan.textContent = Ortak.tl(bakiye);
  },

  // Bildirim kutusu: tur = 'hata' | 'basari'
  bildir(alanId, mesaj, tur = 'hata') {
    const alan = document.getElementById(alanId);
    if (!alan) return;
    alan.hidden = !mesaj;
    alan.className = 'bildirim bildirim-' + tur;
    alan.setAttribute('role', tur === 'hata' ? 'alert' : 'status');
    alan.textContent = mesaj || '';
  },

  tl(sayi) {
    return Number(sayi).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
  },

  // "2026-11-15" -> "15 Kasım 2026 Pazar"
  tarihYaz(metin) {
    const [y, a, g] = metin.slice(0, 10).split('-').map(Number);
    return new Date(y, a - 1, g).toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric', weekday: 'long',
    });
  },

  // "2026-11-15 10:00:00" -> "15.11.2026 10:00"
  zamanYaz(metin) {
    const [tarih, saat = ''] = metin.split(' ');
    const [y, a, g] = tarih.split('-');
    return `${g}.${a}.${y} ${saat.slice(0, 5)}`.trim();
  },

  // Bugünün tarihi (yerel saat) YYYY-AA-GG
  bugun() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  },

  tarihEkle(metin, gun) {
    const [y, a, g] = metin.split('-').map(Number);
    const d = new Date(y, a - 1, g + gun);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  },

  // Kullanıcıdan/veritabanından gelen metni HTML'e güvenle yazmak için
  kacis(metin) {
    return String(metin ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  durumAdi: { aktif: 'Aktif', kullanildi: 'Kullanıldı', iptal: 'İptal' },
};
