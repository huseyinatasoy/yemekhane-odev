// Aşama 4 · Profil: kullanıcı bilgileri ve alerjen seçimi
(async function () {
  const ben = await Ortak.basla('profil');

  const rolAdi = { ogrenci: 'Öğrenci', personel: 'Personel', yonetici: 'Yönetici' };
  document.getElementById('bilgiler').innerHTML = `
    <dt>Ad soyad</dt><dd>${Ortak.kacis(ben.ad)} ${Ortak.kacis(ben.soyad)}</dd>
    <dt>E-posta</dt><dd>${Ortak.kacis(ben.eposta)}</dd>
    <dt>Rol</dt><dd>${rolAdi[ben.rol]}</dd>
    ${ben.ogrenci_no ? `<dt>Öğrenci no</dt><dd>${Ortak.kacis(ben.ogrenci_no)}</dd>` : ''}`;

  const form = document.getElementById('alerjen-formu');
  try {
    const [alerjenler, benim] = await Promise.all([Api.get('/alerjenler'), Api.get('/profil/alerjenler')]);
    document.getElementById('alerjenler').innerHTML = alerjenler.map((a) => `
      <label><input type="checkbox" name="alerjen" value="${a.id}" ${benim.alerjen_idler.includes(a.id) ? 'checked' : ''}>
        ${Ortak.kacis(a.ad)}</label>`).join('');
  } catch (hata) {
    Ortak.bildir('bildirim', hata.message);
  }

  form.addEventListener('submit', async (olay) => {
    olay.preventDefault();
    const dugme = form.querySelector('button');
    dugme.disabled = true;
    try {
      const secili = [...form.querySelectorAll('input[name=alerjen]:checked')].map((k) => Number(k.value));
      const sonuc = await Api.put('/profil/alerjenler', { alerjen_idler: secili });
      Ortak.bildir('bildirim', sonuc.mesaj, 'basari');
    } catch (hata) {
      Ortak.bildir('bildirim', hata.message);
    }
    dugme.disabled = false;
  });
})();
