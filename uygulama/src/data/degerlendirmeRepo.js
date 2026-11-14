// Değerlendirme (puan + yorum) işlemleri
const { yazma } = require('./db');

// Kural kontrolü kaynakta yapılır: kullanıcı menüyü az önce kullandıysa
// replika bunu henüz görmemiş olabilir.
async function kullanilmisMi(kullaniciId, menuId) {
  const [satirlar] = await yazma.query(
    `SELECT 1 FROM rezervasyonlar
      WHERE kullanici_id = ? AND menu_id = ? AND durum = 'kullanildi'`,
    [kullaniciId, menuId]
  );
  return satirlar.length > 0;
}

async function ekle(kullaniciId, menuId, puan, yorum) {
  const [sonuc] = await yazma.query(
    'INSERT INTO degerlendirmeler (kullanici_id, menu_id, puan, yorum) VALUES (?, ?, ?, ?)',
    [kullaniciId, menuId, puan, yorum]
  );
  return sonuc.insertId;
}

module.exports = { kullanilmisMi, ekle };
