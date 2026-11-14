// Gelen istek parametrelerini doğrulayan küçük yardımcılar.
// Hatalı girdi KullaniciHatasi fırlatır; hata ara katmanı bunu 400 olarak döner.
const { KullaniciHatasi } = require('../middleware/hata');

function tamSayi(deger, ad) {
  const sayi = Number(deger);
  if (!Number.isInteger(sayi) || sayi <= 0) {
    throw new KullaniciHatasi(`Geçersiz ${ad}.`);
  }
  return sayi;
}

function tarih(deger, ad = 'tarih') {
  if (typeof deger !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(deger)) {
    throw new KullaniciHatasi(`Geçersiz ${ad} (YYYY-AA-GG biçiminde olmalı).`);
  }
  return deger;
}

function tutar(deger, ad) {
  const sayi = Number(deger);
  if (!Number.isFinite(sayi) || sayi < 0) {
    throw new KullaniciHatasi(`Geçersiz ${ad}.`);
  }
  return Math.round(sayi * 100) / 100;
}

module.exports = { tamSayi, tarih, tutar };
