// =====================================================================
// Menü önbelleği (Redis)
// Anahtar : menu:{yemekhane_id}:{tarih}:{ogun_id}
// Değer   : günün menüsü (JSON) — yemekler, kaloriler, alerjenler, fiyatlar
// Süre    : menünün gününün sonuna kadar (EXPIREAT gün sonu 23:59:59)
// Silinme : yönetici o menüyü oluşturduğunda/değiştirdiğinde (DEL)
//
// Not: Boş yer sayısı önbelleğe alınmaz; her rezervasyonda değiştiği için
// haftalık ekran onu her seferinde veritabanından okur.
// =====================================================================
const redis = require('./redis');

const anahtar = (yemekhaneId, tarih, ogunId) => `menu:${yemekhaneId}:${tarih}:${ogunId}`;

// Menünün gününün sonu (İstanbul saati). Geçmiş bir günse bugünün sonu kullanılır.
function gunSonu(tarih) {
  const menuGunSonu = new Date(`${tarih}T23:59:59+03:00`);
  if (menuGunSonu > new Date()) return menuGunSonu;
  const bugun = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' }); // YYYY-AA-GG
  return new Date(`${bugun}T23:59:59+03:00`);
}

// Önce Redis'e bakar; yoksa veritabanından getirir ve Redis'e yazar.
// Hangisinden geldiği uygulama günlüğüne yazılır (Aşama 3 kanıtı).
async function getir(yemekhaneId, tarih, ogunId, veritabanindanGetir) {
  const a = anahtar(yemekhaneId, tarih, ogunId);

  const onbellekte = await redis.get(a);
  if (onbellekte !== null) {
    console.log(`[ÖNBELLEK] ${a} -> Redis'ten geldi`);
    return JSON.parse(onbellekte);
  }

  const menu = await veritabanindanGetir();
  console.log(`[ÖNBELLEK] ${a} -> veritabanından geldi`);
  if (menu) {
    await redis.set(a, JSON.stringify(menu), {
      EXAT: Math.floor(gunSonu(tarih).getTime() / 1000),
    });
  }
  return menu;
}

async function sil(yemekhaneId, tarih, ogunId) {
  const a = anahtar(yemekhaneId, tarih, ogunId);
  const silinen = await redis.del(a);
  console.log(`[ÖNBELLEK] ${a} silindi (${silinen} kayıt)`);
}

module.exports = { getir, sil, anahtar };
