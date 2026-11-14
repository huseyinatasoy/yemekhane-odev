// Ekran 3 · Haftalık menü ve rezervasyon
// Boş yer, role göre fiyat ve "düğme açık mı" bilgisi sunucudan gelir;
// arayüz yalnızca gösterir (son saat kontrolünü veritabanı yapar).
(async function () {
  await Ortak.basla('haftalik');

  const yemekhaneSec = document.getElementById('yemekhane');
  const baslangicSec = document.getElementById('baslangic');
  const alan = document.getElementById('hafta');
  const parametreler = new URLSearchParams(location.search);

  try {
    const yemekhaneler = await Api.get('/yemekhaneler');
    yemekhaneSec.innerHTML = yemekhaneler.map((y) => `<option value="${y.id}">${Ortak.kacis(y.ad)}</option>`).join('');
  } catch (hata) {
    Ortak.bildir('bildirim', hata.message);
    return;
  }
  if (parametreler.get('yemekhane_id')) yemekhaneSec.value = parametreler.get('yemekhane_id');
  baslangicSec.value = parametreler.get('baslangic') || Ortak.bugun();

  async function yukle() {
    alan.innerHTML = '<p class="soluk">Yükleniyor…</p>';
    try {
      const menuler = await Api.get(`/menu/haftalik?yemekhane_id=${yemekhaneSec.value}&baslangic=${baslangicSec.value}`);
      alan.innerHTML = menuler.length ? haftaHtml(menuler) : '<p class="kart soluk">Bu hafta için menü yayımlanmamış.</p>';
    } catch (hata) {
      alan.innerHTML = '';
      Ortak.bildir('bildirim', hata.message);
    }
  }

  // Menüleri günlere göre grupla
  function haftaHtml(menuler) {
    const gunler = {};
    menuler.forEach((m) => (gunler[m.tarih] = gunler[m.tarih] || []).push(m));
    return Object.entries(gunler).map(([tarih, liste]) => `
      <section class="gun">
        <h3>${Ortak.tarihYaz(tarih)}</h3>
        <div class="ogun-kartlari">${liste.map(kartHtml).join('')}</div>
      </section>`).join('');
  }

  function kartHtml(m) {
    let dugmeYazisi = 'Rezervasyon yap';
    if (m.rezervasyon_durum === 'aktif') dugmeYazisi = 'Rezervasyonunuz var';
    else if (m.rezervasyon_durum === 'kullanildi') dugmeYazisi = 'Kullanıldı';
    else if (m.suresi_doldu) dugmeYazisi = 'Süre doldu';
    else if (m.bos_yer <= 0) dugmeYazisi = 'Kapasite dolu';

    return `
      <article class="ogun-karti">
        <div class="baslik"><span>${Ortak.kacis(m.ogun)}</span><span class="fiyat">${Ortak.tl(m.fiyat)}</span></div>
        <div class="yemekler">${Ortak.kacis(m.yemekler || '')}</div>
        <div class="bilgi">
          <span>Boş yer: <span class="bos-yer">${m.bos_yer}</span> / ${m.kapasite}</span>
          <span class="soluk">Son: ${Ortak.zamanYaz(m.rezervasyon_son).slice(-5)}</span>
        </div>
        <button type="button" class="dugme" data-menu="${m.menu_id}" ${m.rezerve_edilebilir ? '' : 'disabled'}>${dugmeYazisi}</button>
      </article>`;
  }

  // Rezervasyon düğmesi: kurallar sp_rezervasyon_yap'ta; hata mesajı olduğu gibi gösterilir
  alan.addEventListener('click', async (olay) => {
    const dugme = olay.target.closest('button[data-menu]');
    if (!dugme || dugme.disabled) return;
    dugme.disabled = true;
    try {
      const sonuc = await Api.post('/rezervasyonlar', { menu_id: Number(dugme.dataset.menu) });
      // Yordamın döndürdüğü bakiye kaynaktan gelir: replikasyon gecikmesinden etkilenmez
      Ortak.bakiyeGuncelle(sonuc.bakiye);
      Ortak.bildir('bildirim', `${sonuc.mesaj} Ücret: ${Ortak.tl(sonuc.ucret)} · Kalan bakiye: ${Ortak.tl(sonuc.bakiye)}`, 'basari');
      await yukle();
    } catch (hata) {
      Ortak.bildir('bildirim', hata.message);
      dugme.disabled = false;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  function haftaKaydir(gun) {
    baslangicSec.value = Ortak.tarihEkle(baslangicSec.value, gun);
    yukle();
  }
  document.getElementById('onceki').addEventListener('click', () => haftaKaydir(-7));
  document.getElementById('sonraki').addEventListener('click', () => haftaKaydir(7));
  [yemekhaneSec, baslangicSec].forEach((s) => s.addEventListener('change', () => {
    Ortak.bildir('bildirim', '');
    yukle();
  }));
  yukle();
})();
