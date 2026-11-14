// Aşama 4 · Alerjenler ve kullanıcının profilinde seçtiği alerjenler
const { yazma, okuma } = require('./db');

async function tumu() {
  const [satirlar] = await okuma.query('SELECT id, ad FROM alerjenler ORDER BY ad');
  return satirlar;
}

// Kullanıcının alerjenleri [{ id, ad }] (okuma -> replika)
async function kullanicininAlerjenleri(kullaniciId) {
  const [satirlar] = await okuma.query(
    `SELECT a.id, a.ad
       FROM kullanici_alerjenleri ka JOIN alerjenler a ON a.id = ka.alerjen_id
      WHERE ka.kullanici_id = ?
      ORDER BY a.ad`,
    [kullaniciId]
  );
  return satirlar;
}

// Profil kaydı (kaynağa yazılır): eski seçimler silinir, yenileri eklenir, tek transaction
async function kaydet(kullaniciId, alerjenIdler) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    await baglanti.query('DELETE FROM kullanici_alerjenleri WHERE kullanici_id = ?', [kullaniciId]);
    if (alerjenIdler.length > 0) {
      await baglanti.query(
        'INSERT INTO kullanici_alerjenleri (kullanici_id, alerjen_id) VALUES ?',
        [alerjenIdler.map((id) => [kullaniciId, id])]
      );
    }
    await baglanti.commit();
  } catch (hata) {
    await baglanti.rollback();
    throw hata;
  } finally {
    baglanti.release();
  }
}

module.exports = { tumu, kullanicininAlerjenleri, kaydet };
