// Rezervasyon işlemleri. Para hareketi olduğu için yazma işlemleri stored procedure ile yapılır.
const { okuma, yordamCagir } = require('./db');

// Aşama 4: porsiyon parametresi eklendi ('tam' | 'yarim').
// Dönen: { rezervasyon_id, ucret, bakiye, porsiyon }  (bakiye kaynaktaki güncel değerdir)
function rezervasyonYap(kullaniciId, menuId, porsiyon) {
  return yordamCagir('sp_rezervasyon_yap', [kullaniciId, menuId, porsiyon]);
}

// Dönen: { rezervasyon_id, iade, bakiye }
function rezervasyonIptal(kullaniciId, rezervasyonId) {
  return yordamCagir('sp_rezervasyon_iptal', [kullaniciId, rezervasyonId]);
}

// Kullanıcının rezervasyonları (okuma -> replika).
// iptal_edilebilir: aktif ve son saat geçmemiş
// degerlendirilebilir: kullanılmış ve henüz puan verilmemiş
async function kullanicininRezervasyonlari(kullaniciId) {
  const [satirlar] = await okuma.query(
    `SELECT r.id, r.menu_id, r.durum, r.porsiyon, r.ucret, r.olusturma,
            m.tarih, o.ad AS ogun, yh.ad AS yemekhane,
            TIMESTAMP(m.tarih, o.son_saat) AS rezervasyon_son,
            (r.durum = 'aktif' AND NOW() < TIMESTAMP(m.tarih, o.son_saat)) AS iptal_edilebilir,
            (r.durum = 'kullanildi' AND d.id IS NULL)                      AS degerlendirilebilir,
            d.puan, d.yorum
       FROM rezervasyonlar r
       JOIN menuler m       ON m.id = r.menu_id
       JOIN ogunler o       ON o.id = m.ogun_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
       LEFT JOIN degerlendirmeler d ON d.menu_id = r.menu_id AND d.kullanici_id = r.kullanici_id
      WHERE r.kullanici_id = ?
      ORDER BY m.tarih DESC, o.sira DESC`,
    [kullaniciId]
  );
  return satirlar;
}

module.exports = { rezervasyonYap, rezervasyonIptal, kullanicininRezervasyonlari };
