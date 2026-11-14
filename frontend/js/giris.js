// Ekran 1 · Giriş
(function () {
  // Zaten giriş yapılmışsa doğrudan menüye geç
  if (Api.tokenAl()) {
    location.href = '/menu.html';
    return;
  }
  if (new URLSearchParams(location.search).get('oturum') === 'bitti') {
    Ortak.bildir('bildirim', 'Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.');
  }

  const form = document.getElementById('giris-formu');
  form.addEventListener('submit', async (olay) => {
    olay.preventDefault();
    const dugme = form.querySelector('button');
    dugme.disabled = true;
    Ortak.bildir('bildirim', '');
    try {
      // Şifre doğrulaması (bcrypt) sunucuda yapılır
      const sonuc = await Api.post('/giris', {
        eposta: form.eposta.value,
        sifre: form.sifre.value,
      });
      Api.tokenKaydet(sonuc.token);
      location.href = sonuc.kullanici.rol === 'yonetici' ? '/yonetici.html' : '/menu.html';
    } catch (hata) {
      Ortak.bildir('bildirim', hata.message);
      dugme.disabled = false;
    }
  });
})();
