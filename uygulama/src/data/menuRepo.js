// Menü, yemekhane, öğün ve yemek sorguları
const { yazma, okuma } = require('./db');

async function yemekhaneler() {
  const [satirlar] = await okuma.query('SELECT id, ad, konum, kapasite FROM yemekhaneler ORDER BY id');
  return satirlar;
}

async function ogunler() {
  const [satirlar] = await okuma.query(
    `SELECT id, ad, sira, TIME_FORMAT(son_saat, '%H:%i') AS son_saat FROM ogunler ORDER BY sira`
  );
  return satirlar;
}

async function yemekler() {
  const [satirlar] = await okuma.query(
    `SELECT y.id, y.ad, y.kalori, y.vejetaryen, k.ad AS kategori
       FROM yemekler y JOIN yemek_kategorileri k ON k.id = y.kategori_id
      ORDER BY k.sira, y.ad`
  );
  return satirlar;
}

// Bir menünün yemekleri (v_menu_detay view'ı, kategori sırasıyla)
async function menuDetay(yemekhaneId, tarih, ogunId) {
  const [satirlar] = await okuma.query(
    `SELECT * FROM v_menu_detay
      WHERE yemekhane_id = ? AND tarih = ? AND ogun_id = ?
      ORDER BY kategori_sira, yemek`,
    [yemekhaneId, tarih, ogunId]
  );
  return satirlar;
}

// Bir yemekhanenin bir haftalık menüleri: boş yer, role göre fiyat,
// son saat geçti mi, kullanıcının bu menüde rezervasyonu var mı.
// Son saat karşılaştırması veritabanında yapılır (NOW() >= rezervasyon_son).
async function haftalik(yemekhaneId, baslangic, kullaniciId, rol) {
  const [satirlar] = await okuma.query(
    `SELECT d.menu_id, d.tarih, d.ogun_id, d.ogun, d.kapasite, d.bos_yer,
            d.rezervasyon_son,
            (NOW() >= d.rezervasyon_son)                              AS suresi_doldu,
            IF(? = 'ogrenci', m.ogrenci_fiyati, m.personel_fiyati)    AS fiyat,
            (SELECT GROUP_CONCAT(y.ad ORDER BY k.sira SEPARATOR ', ')
               FROM menu_yemekleri my
               JOIN yemekler y ON y.id = my.yemek_id
               JOIN yemek_kategorileri k ON k.id = y.kategori_id
              WHERE my.menu_id = d.menu_id)                           AS yemekler,
            r.id AS rezervasyon_id, r.durum AS rezervasyon_durum
       FROM v_menu_doluluk d
       JOIN menuler m ON m.id = d.menu_id
       JOIN ogunler o ON o.id = d.ogun_id
       LEFT JOIN rezervasyonlar r ON r.menu_id = d.menu_id AND r.kullanici_id = ?
      WHERE d.yemekhane_id = ?
        AND d.tarih BETWEEN ? AND DATE_ADD(?, INTERVAL 6 DAY)
      ORDER BY d.tarih, o.sira`,
    [rol, kullaniciId, yemekhaneId, baslangic, baslangic]
  );
  return satirlar;
}

// Yönetici raporu: menü bazında doluluk ve ortalama puan
async function rapor(baslangic, bitis) {
  const [satirlar] = await okuma.query(
    `SELECT d.menu_id, d.tarih, d.yemekhane_id, d.yemekhane, d.ogun_id, d.ogun,
            m.ogrenci_fiyati, m.personel_fiyati,
            d.kapasite, d.rezerve, d.bos_yer, d.doluluk_yuzde,
            p.oy_sayisi, p.ortalama_puan
       FROM v_menu_doluluk d
       JOIN menuler m    ON m.id = d.menu_id
       JOIN ogunler o    ON o.id = d.ogun_id
       JOIN v_menu_puan p ON p.menu_id = d.menu_id
      WHERE d.tarih BETWEEN ? AND ?
      ORDER BY d.tarih, d.yemekhane_id, o.sira`,
    [baslangic, bitis]
  );
  return satirlar;
}

// Düzenleme formunu doldurmak için tek menü (yemek id'leriyle)
async function menuGetir(menuId) {
  const [menuler] = await okuma.query(
    `SELECT id, yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati
       FROM menuler WHERE id = ?`,
    [menuId]
  );
  if (!menuler[0]) return null;
  const [yemekler] = await okuma.query('SELECT yemek_id FROM menu_yemekleri WHERE menu_id = ?', [menuId]);
  return { ...menuler[0], yemek_idler: yemekler.map((y) => y.yemek_id) };
}

// Yeni menü (kaynağa yazılır). Menü ve yemekleri tek transaction içinde eklenir.
async function menuOlustur(m) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    const [sonuc] = await baglanti.query(
      `INSERT INTO menuler (yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati)
       VALUES (?, ?, ?, ?, ?)`,
      [m.yemekhane_id, m.tarih, m.ogun_id, m.ogrenci_fiyati, m.personel_fiyati]
    );
    const menuId = sonuc.insertId;
    await yemekleriYaz(baglanti, menuId, m.yemek_idler);
    await baglanti.commit();
    return menuId;
  } catch (hata) {
    await baglanti.rollback();
    throw hata;
  } finally {
    baglanti.release();
  }
}

// Menü düzenleme: fiyatlar güncellenir, yemek listesi baştan yazılır.
// Dönen değer: menünün yemekhane/tarih/öğün bilgisi (önbellek anahtarı için gerekir).
async function menuGuncelle(menuId, m) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    const [mevcut] = await baglanti.query(
      'SELECT yemekhane_id, tarih, ogun_id FROM menuler WHERE id = ? FOR UPDATE',
      [menuId]
    );
    if (!mevcut[0]) {
      await baglanti.rollback();
      return null;
    }
    await baglanti.query(
      'UPDATE menuler SET ogrenci_fiyati = ?, personel_fiyati = ? WHERE id = ?',
      [m.ogrenci_fiyati, m.personel_fiyati, menuId]
    );
    await baglanti.query('DELETE FROM menu_yemekleri WHERE menu_id = ?', [menuId]);
    await yemekleriYaz(baglanti, menuId, m.yemek_idler);
    await baglanti.commit();
    return mevcut[0];
  } catch (hata) {
    await baglanti.rollback();
    throw hata;
  } finally {
    baglanti.release();
  }
}

async function yemekleriYaz(baglanti, menuId, yemekIdler) {
  const degerler = yemekIdler.map((yemekId) => [menuId, yemekId]);
  await baglanti.query('INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?', [degerler]);
}

module.exports = {
  yemekhaneler, ogunler, yemekler, menuDetay, haftalik, rapor, menuGetir, menuOlustur, menuGuncelle,
};
