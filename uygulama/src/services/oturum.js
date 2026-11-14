// =====================================================================
// Oturum deposu (Aşama 2: bellek içi).
// Giriş yapan kullanıcıya rastgele bir token verilir; tarayıcı bu token'ı
// her istekte "Authorization: Bearer <token>" başlığıyla gönderir.
// Süre: 30 dakika, her istekte yenilenir.
// Not: Bellek içi olduğu için uygulama yeniden başlayınca oturumlar düşer.
// Aşama 3'te Redis'e taşınacak.
// =====================================================================
const crypto = require('crypto');

const SURE_MS = 30 * 60 * 1000;
const oturumlar = new Map(); // token -> { kullanici, bitis }

async function olustur(kullanici) {
  const token = crypto.randomBytes(32).toString('hex');
  oturumlar.set(token, { kullanici, bitis: Date.now() + SURE_MS });
  return token;
}

// Geçerliyse kullanıcıyı döner ve süreyi yeniler
async function getir(token) {
  const kayit = oturumlar.get(token);
  if (!kayit) return null;
  if (kayit.bitis < Date.now()) {
    oturumlar.delete(token);
    return null;
  }
  kayit.bitis = Date.now() + SURE_MS;
  return kayit.kullanici;
}

async function sil(token) {
  oturumlar.delete(token);
}

module.exports = { olustur, getir, sil };
