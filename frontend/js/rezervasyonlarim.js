// Ekran 4 · Rezervasyonlarım: aktif / kullanıldı / iptal; süresi dolmamışsa iptal
(async function () {
  await Ortak.basla('rezervasyonlarim');

  const liste = document.getElementById('liste');
  const durumSec = document.getElementById('durum');
  let rezervasyonlar = [];

  async function yukle() {
    try {
      rezervasyonlar = await Api.get('/rezervasyonlar');
      ciz();
    } catch (hata) {
      Ortak.bildir('bildirim', hata.message);
    }
  }

  function ciz() {
    const secili = rezervasyonlar.filter((r) => !durumSec.value || r.durum === durumSec.value);
    if (secili.length === 0) {
      liste.innerHTML = '<li class="soluk">Kayıt yok.</li>';
      return;
    }
    liste.innerHTML = secili.map((r) => `
      <li class="liste-oge">
        <div>
          <strong>${Ortak.tarihYaz(r.tarih)} · ${Ortak.kacis(r.ogun)}</strong><br>
          <span class="soluk">${Ortak.kacis(r.yemekhane)} · ${Ortak.porsiyonAdi[r.porsiyon]} · ${Ortak.tl(r.ucret)}</span>
        </div>
        <div>
          <span class="durum durum-${r.durum}">${Ortak.durumAdi[r.durum]}</span>
          ${r.iptal_edilebilir ? `<button type="button" class="dugme dugme-kucuk dugme-tehlike" data-iptal="${r.id}">İptal et</button>` : ''}
          ${r.degerlendirilebilir ? '<a class="dugme dugme-kucuk dugme-ikincil" href="/degerlendirme.html">Puan ver</a>' : ''}
          ${r.puan ? `<span class="soluk">${'★'.repeat(r.puan)}</span>` : ''}
        </div>
      </li>`).join('');
  }

  liste.addEventListener('click', async (olay) => {
    const dugme = olay.target.closest('button[data-iptal]');
    if (!dugme) return;
    if (!confirm('Rezervasyon iptal edilsin mi? Ücret bakiyenize iade edilir.')) return;
    dugme.disabled = true;
    try {
      const sonuc = await Api.post(`/rezervasyonlar/${dugme.dataset.iptal}/iptal`);
      Ortak.bakiyeGuncelle(sonuc.bakiye);
      Ortak.bildir('bildirim', `${sonuc.mesaj} İade: ${Ortak.tl(sonuc.iade)}`, 'basari');
      await yukle();
    } catch (hata) {
      Ortak.bildir('bildirim', hata.message);
      dugme.disabled = false;
    }
  });

  durumSec.addEventListener('change', ciz);
  yukle();
})();
