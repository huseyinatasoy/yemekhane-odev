// Ekran 2 · Günün menüsü: yemekhane + tarih + öğün seçilir, yemekler listelenir
(async function () {
  await Ortak.basla('menu');

  const yemekhaneSec = document.getElementById('yemekhane');
  const tarihSec = document.getElementById('tarih');
  const ogunSec = document.getElementById('ogun');
  const alan = document.getElementById('menu');

  try {
    const [yemekhaneler, ogunler] = await Promise.all([Api.get('/yemekhaneler'), Api.get('/ogunler')]);
    yemekhaneSec.innerHTML = yemekhaneler.map((y) => `<option value="${y.id}">${Ortak.kacis(y.ad)}</option>`).join('');
    ogunSec.innerHTML = ogunler.map((o) => `<option value="${o.id}">${Ortak.kacis(o.ad)}</option>`).join('');
  } catch (hata) {
    Ortak.bildir('bildirim', hata.message);
    return;
  }

  tarihSec.value = Ortak.bugun();
  // Varsayılan öğün: saate göre (gösterim kolaylığı, iş kuralı değil)
  const saat = new Date().getHours();
  ogunSec.value = saat < 10 ? 1 : saat < 15 ? 2 : 3;

  async function yukle() {
    Ortak.bildir('bildirim', '');
    alan.innerHTML = '<p class="soluk">Yükleniyor…</p>';
    try {
      const { menu } = await Api.get(
        `/menu?yemekhane_id=${yemekhaneSec.value}&tarih=${tarihSec.value}&ogun_id=${ogunSec.value}`
      );
      alan.innerHTML = menu ? menuHtml(menu) : '<p class="soluk">Bu seçim için menü yayımlanmamış.</p>';
    } catch (hata) {
      alan.innerHTML = '';
      Ortak.bildir('bildirim', hata.message);
    }
  }

  function menuHtml(menu) {
    // Aşama 4: kullanıcının alerjenini içeren yemekleri sunucu "uyari" ile işaretler
    const uyariSayisi = menu.yemekler.filter((y) => y.uyari).length;
    const yemekler = menu.yemekler.map((y) => `
      <li class="yemek${y.uyari ? ' yemek-uyari' : ''}">
        <div>
          <div class="yemek-ad">${y.uyari ? '⚠ ' : ''}${Ortak.kacis(y.ad)}</div>
          <div class="yemek-kategori">${Ortak.kacis(y.kategori)}</div>
        </div>
        <div class="yemek-kalori">${y.kalori} kcal</div>
        ${y.uyari ? `<div class="uyari-metni" role="note">Alerjeniniz: ${y.uyari_alerjenler.map(Ortak.kacis).join(', ')}</div>` : ''}
        <div class="yemek-etiketler">
          ${y.vejetaryen ? '<span class="etiket etiket-vejetaryen">Vejetaryen</span>' : ''}
          ${y.alerjenler.map((a) => `<span class="etiket etiket-alerjen">${Ortak.kacis(a)}</span>`).join('')}
        </div>
      </li>`).join('');
    const uyariKutusu = uyariSayisi
      ? `<p class="bildirim bildirim-hata" role="alert">Bu menüde alerjenlerinizi içeren ${uyariSayisi} yemek var.</p>`
      : '';

    return `
      <div class="menu-ust">
        <h2>${Ortak.kacis(menu.yemekhane)} · ${Ortak.kacis(menu.ogun)}</h2>
        <span class="soluk">${Ortak.tarihYaz(menu.tarih)}</span>
      </div>
      <div class="fiyatlar">
        <span class="etiket">Öğrenci: ${Ortak.tl(menu.ogrenci_fiyati)}</span>
        <span class="etiket">Personel: ${Ortak.tl(menu.personel_fiyati)}</span>
        <span class="etiket">Son rezervasyon: ${Ortak.zamanYaz(menu.rezervasyon_son)}</span>
      </div>
      ${uyariKutusu}
      <ul class="yemek-listesi">${yemekler}</ul>
      <p class="soluk">Alerjenlerinizi <a href="/profil.html">Profil</a> sayfasından seçebilirsiniz.</p>
      <p class="toplam">Toplam: ${menu.toplam_kalori} kcal</p>
      <a class="dugme" href="/haftalik.html?yemekhane_id=${yemekhaneSec.value}&baslangic=${menu.tarih}">Rezervasyon yap</a>`;
  }

  [yemekhaneSec, tarihSec, ogunSec].forEach((s) => s.addEventListener('change', yukle));
  yukle();
})();
