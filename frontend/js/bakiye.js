// Ekran 5 · Bakiye: güncel bakiye, hareket geçmişi, bakiye yükleme
(async function () {
  await Ortak.basla('bakiye');

  const turAdi = { yukleme: 'Yükleme', rezervasyon: 'Rezervasyon', iade: 'İade' };
  const form = document.getElementById('yukle-formu');

  async function yukle() {
    try {
      const veri = await Api.get('/bakiye');
      document.getElementById('bakiye').textContent = Ortak.tl(veri.bakiye);
      Ortak.bakiyeGuncelle(veri.bakiye);
      document.getElementById('hareketler').innerHTML = veri.hareketler.length
        ? veri.hareketler.map((h) => `
          <li class="liste-oge">
            <div>
              <strong>${turAdi[h.tur]}</strong><br>
              <span class="soluk">${Ortak.zamanYaz(h.olusturma)}</span>
            </div>
            <span class="${h.tutar > 0 ? 'tutar-arti' : 'tutar-eksi'}">${h.tutar > 0 ? '+' : ''}${Ortak.tl(h.tutar)}</span>
          </li>`).join('')
        : '<li class="soluk">Henüz hareket yok.</li>';
    } catch (hata) {
      Ortak.bildir('bildirim', hata.message);
    }
  }

  form.addEventListener('click', (olay) => {
    const hizli = olay.target.closest('button[data-tutar]');
    if (hizli) form.tutar.value = hizli.dataset.tutar;
  });

  form.addEventListener('submit', async (olay) => {
    olay.preventDefault();
    const dugme = form.querySelector('button[type=submit]');
    dugme.disabled = true;
    try {
      // 10–1000 TL kuralı sp_bakiye_yukle'de; hatası olduğu gibi gösterilir
      const sonuc = await Api.post('/bakiye/yukle', { tutar: form.tutar.value });
      Ortak.bildir('bildirim', `${sonuc.mesaj} Yeni bakiye: ${Ortak.tl(sonuc.bakiye)}`, 'basari');
      form.reset();
      await yukle();
    } catch (hata) {
      Ortak.bildir('bildirim', hata.message);
    }
    dugme.disabled = false;
  });

  yukle();
})();
