// Ekran 7 · Yönetici paneli: menü oluşturma/düzenleme, menü bazında doluluk ve ortalama puan
(async function () {
  await Ortak.basla('yonetici');

  const $ = (id) => document.getElementById(id);
  const form = $('menu-formu');

  // Seçim kutularını ve yemek listesini doldur
  try {
    const [yemekhaneler, ogunler, yemekler] = await Promise.all([
      Api.get('/yemekhaneler'), Api.get('/ogunler'), Api.get('/yonetici/yemekler'),
    ]);
    $('f-yemekhane').innerHTML = yemekhaneler.map((y) => `<option value="${y.id}">${Ortak.kacis(y.ad)}</option>`).join('');
    $('f-ogun').innerHTML = ogunler.map((o) => `<option value="${o.id}">${Ortak.kacis(o.ad)}</option>`).join('');

    const kategoriler = {};
    yemekler.forEach((y) => (kategoriler[y.kategori] = kategoriler[y.kategori] || []).push(y));
    $('yemek-secim').innerHTML = Object.entries(kategoriler).map(([kategori, liste]) => `
      <fieldset>
        <legend>${Ortak.kacis(kategori)}</legend>
        ${liste.map((y) => `
          <label><input type="checkbox" name="yemek" value="${y.id}">
            ${Ortak.kacis(y.ad)} <span class="soluk">${y.kalori} kcal${y.vejetaryen ? ' · V' : ''}</span></label>`).join('')}
      </fieldset>`).join('');
  } catch (hata) {
    Ortak.bildir('bildirim', hata.message);
    return;
  }

  function formuSifirla() {
    form.reset();
    $('menu-id').value = '';
    $('f-tarih').value = Ortak.tarihEkle(Ortak.bugun(), 1);
    ['f-yemekhane', 'f-tarih', 'f-ogun'].forEach((id) => ($(id).disabled = false));
    $('form-baslik').textContent = 'Yeni menü';
    $('kaydet').textContent = 'Menüyü oluştur';
    $('vazgec').hidden = true;
  }

  // Düzenleme: menünün mevcut değerleri forma yüklenir.
  // Yemekhane/tarih/öğün değiştirilemez (menünün kimliği bunlardır).
  async function duzenle(menuId) {
    try {
      const m = await Api.get(`/yonetici/menuler/${menuId}`);
      $('menu-id').value = m.id;
      $('f-yemekhane').value = m.yemekhane_id;
      $('f-tarih').value = m.tarih;
      $('f-ogun').value = m.ogun_id;
      $('f-ogrenci').value = m.ogrenci_fiyati;
      $('f-personel').value = m.personel_fiyati;
      form.querySelectorAll('input[name=yemek]').forEach((k) => (k.checked = m.yemek_idler.includes(Number(k.value))));
      ['f-yemekhane', 'f-tarih', 'f-ogun'].forEach((id) => ($(id).disabled = true));
      $('form-baslik').textContent = `Menüyü düzenle (#${m.id})`;
      $('kaydet').textContent = 'Değişiklikleri kaydet';
      $('vazgec').hidden = false;
      Ortak.bildir('bildirim', '');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (hata) {
      Ortak.bildir('bildirim', hata.message);
    }
  }

  form.addEventListener('submit', async (olay) => {
    olay.preventDefault();
    const govde = {
      ogrenci_fiyati: $('f-ogrenci').value,
      personel_fiyati: $('f-personel').value,
      yemek_idler: [...form.querySelectorAll('input[name=yemek]:checked')].map((k) => Number(k.value)),
    };
    const menuId = $('menu-id').value;
    $('kaydet').disabled = true;
    try {
      let sonuc;
      if (menuId) {
        sonuc = await Api.put(`/yonetici/menuler/${menuId}`, govde);
      } else {
        sonuc = await Api.post('/yonetici/menuler', {
          ...govde,
          yemekhane_id: Number($('f-yemekhane').value),
          tarih: $('f-tarih').value,
          ogun_id: Number($('f-ogun').value),
        });
      }
      Ortak.bildir('bildirim', sonuc.mesaj, 'basari');
      formuSifirla();
      await raporYukle();
    } catch (hata) {
      Ortak.bildir('bildirim', hata.message);
    }
    $('kaydet').disabled = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('vazgec').addEventListener('click', formuSifirla);

  // ---- Rapor ----
  async function raporYukle() {
    try {
      const satirlar = await Api.get(`/yonetici/rapor?baslangic=${$('r-baslangic').value}&bitis=${$('r-bitis').value}`);
      $('rapor').innerHTML = satirlar.length
        ? satirlar.map((s) => `
          <tr>
            <td>${Ortak.zamanYaz(s.tarih)}</td>
            <td>${Ortak.kacis(s.yemekhane)}</td>
            <td>${Ortak.kacis(s.ogun)}</td>
            <td>${s.rezerve} / ${s.kapasite}</td>
            <td>%${s.doluluk_yuzde}</td>
            <td>${s.ortalama_puan === null ? '—' : `${s.ortalama_puan} (${s.oy_sayisi} oy)`}</td>
            <td>${Ortak.tl(s.ogrenci_fiyati)} / ${Ortak.tl(s.personel_fiyati)}</td>
            <td><button type="button" class="dugme dugme-kucuk dugme-ikincil" data-duzenle="${s.menu_id}">Düzenle</button></td>
          </tr>`).join('')
        : '<tr><td colspan="8" class="soluk">Bu aralıkta menü yok.</td></tr>';
    } catch (hata) {
      Ortak.bildir('bildirim', hata.message);
    }
  }

  $('rapor').addEventListener('click', (olay) => {
    const dugme = olay.target.closest('button[data-duzenle]');
    if (dugme) duzenle(dugme.dataset.duzenle);
  });

  $('r-baslangic').value = Ortak.tarihEkle(Ortak.bugun(), -3);
  $('r-bitis').value = Ortak.tarihEkle(Ortak.bugun(), 6);
  ['r-baslangic', 'r-bitis'].forEach((id) => $(id).addEventListener('change', raporYukle));

  formuSifirla();
  raporYukle();
})();
