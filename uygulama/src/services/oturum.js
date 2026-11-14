// =====================================================================
// Oturum deposu (Aşama 3: Redis).
// Anahtar : oturum:{token}
// Değer   : kullanıcı bilgisi (JSON)
// Süre    : 30 dakika; her istekte EXPIRE ile yeniden 30 dakikaya çekilir.
// Silinme : çıkış yapıldığında DEL.
// Oturumlar uygulamanın belleğinde değil Redis'te durduğu için uygulama
// container'ı yeniden başlasa da kullanıcının oturumu düşmez.
// =====================================================================
const crypto = require('crypto');
const redis = require('./redis');

const SURE_SN = 30 * 60;
const anahtar = (token) => `oturum:${token}`;

async function olustur(kullanici) {
  const token = crypto.randomBytes(32).toString('hex');
  await redis.set(anahtar(token), JSON.stringify(kullanici), { EX: SURE_SN });
  return token;
}

// Geçerliyse kullanıcıyı döner ve süreyi yeniler (kayan süre)
async function getir(token) {
  const deger = await redis.get(anahtar(token));
  if (!deger) return null;
  await redis.expire(anahtar(token), SURE_SN);
  return JSON.parse(deger);
}

async function sil(token) {
  await redis.del(anahtar(token));
}

module.exports = { olustur, getir, sil };
