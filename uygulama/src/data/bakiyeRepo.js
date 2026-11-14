// Bakiye işlemleri
const { okuma, yordamCagir } = require('./db');

// Dönen: { hareket_id, bakiye }
function yukle(kullaniciId, tutar) {
  return yordamCagir('sp_bakiye_yukle', [kullaniciId, tutar]);
}

// Hareket geçmişi bir listelemedir (okuma -> replika)
async function hareketler(kullaniciId) {
  const [satirlar] = await okuma.query(
    `SELECT id, tur, tutar, aciklama, olusturma
       FROM bakiye_hareketleri
      WHERE kullanici_id = ?
      ORDER BY olusturma DESC, id DESC
      LIMIT 100`,
    [kullaniciId]
  );
  return satirlar;
}

module.exports = { yukle, hareketler };
