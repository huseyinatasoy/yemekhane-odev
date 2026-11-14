// Ekran 6 · Değerlendirme: kullanılmış bir menüye 1–5 puan ve yorum
// Hangi menünün değerlendirilebileceğini sunucu söyler (degerlendirilebilir alanı);
// "yalnızca kullanılmış menü" kuralı sunucuda tekrar kontrol edilir.
(async function () {
  await Ortak.basla('degerlendirme');

  const form = document.getElementById('form');
  const menuSec = document.getElementById('menu');

  async function yukle() {
    try {
      const rezervasyonlar = await Api.get('/rezervasyonlar');
      const bekleyen = rezervasyonlar.filter((r) => r.degerlendirilebilir);
      const verilen = rezervasyonlar.filter((r) => r.puan);

      menuSec.innerHTML = bekleyen.length
        ? bekleyen.map((r) => `<option value="${r.menu_id}">${Ortak.zamanYaz(r.tarih)} · ${Ortak.kacis(r.ogun)} · ${Ortak.kacis(r.yemekhane)}</option>`).join('')
        : '<option value="">Değerlendirilecek menü yok</option>';
      form.querySelector('button').disabled = bekleyen.length === 0;

      document.getElementById('gecmis').innerHTML = verilen.length
        ? verilen.map((r) => `
          <li class="liste-oge">
            <div>
              <strong>${Ortak.tarihYaz(r.tarih)} · ${Ortak.kacis(r.ogun)}</strong><br>
              <span class="soluk">${Ortak.kacis(r.yorum || 'Yorum yok')}</span>
            </div>
            <span aria-label="${r.puan} puan">${'★'.repeat(r.puan)}${'☆'.repeat(5 - r.puan)}</span>
          </li>`).join('')
        : '<li class="soluk">Henüz puan vermediniz.</li>';
    } catch (hata) {
      Ortak.bildir('bildirim', hata.message);
    }
  }

  form.addEventListener('submit', async (olay) => {
    olay.preventDefault();
    const secili = form.querySelector('input[name=puan]:checked');
    const dugme = form.querySelector('button');
    dugme.disabled = true;
    try {
      const sonuc = await Api.post('/degerlendirmeler', {
        menu_id: Number(menuSec.value),
        puan: secili ? Number(secili.value) : null,
        yorum: form.yorum.value,
      });
      Ortak.bildir('bildirim', sonuc.mesaj, 'basari');
      form.reset();
      await yukle();
    } catch (hata) {
      Ortak.bildir('bildirim', hata.message);
      dugme.disabled = false;
    }
  });

  yukle();
})();
