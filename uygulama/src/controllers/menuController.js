// Menü ekranları: günün menüsü ve haftalık menü
const menuRepo = require('../data/menuRepo');
const menuOnbellek = require('../services/menuOnbellek');
const dogrula = require('./dogrula');

// GET /api/yemekhaneler
async function yemekhaneler(req, res, next) {
  try {
    res.json(await menuRepo.yemekhaneler());
  } catch (hata) {
    next(hata);
  }
}

// GET /api/ogunler
async function ogunler(req, res, next) {
  try {
    res.json(await menuRepo.ogunler());
  } catch (hata) {
    next(hata);
  }
}

// v_menu_detay satırlarını (her yemek bir satır) tek menü nesnesine çevirir
// ve toplam kaloriyi hesaplar.
function menuNesnesi(satirlar) {
  if (satirlar.length === 0) return null;
  const ilk = satirlar[0];
  return {
    menu_id: ilk.menu_id,
    tarih: ilk.tarih,
    yemekhane: ilk.yemekhane,
    ogun: ilk.ogun,
    rezervasyon_son: ilk.rezervasyon_son,
    ogrenci_fiyati: ilk.ogrenci_fiyati,
    personel_fiyati: ilk.personel_fiyati,
    toplam_kalori: satirlar.reduce((toplam, s) => toplam + s.kalori, 0),
    yemekler: satirlar.map((s) => ({
      id: s.yemek_id,
      ad: s.yemek,
      kategori: s.kategori,
      kalori: s.kalori,
      vejetaryen: s.vejetaryen === 1,
      alerjenler: s.alerjenler ? s.alerjenler.split(', ') : [],
    })),
  };
}

// GET /api/menu?yemekhane_id=1&tarih=2026-11-14&ogun_id=2
async function gununMenusu(req, res, next) {
  try {
    const yemekhaneId = dogrula.tamSayi(req.query.yemekhane_id, 'yemekhane');
    const tarih = dogrula.tarih(req.query.tarih);
    const ogunId = dogrula.tamSayi(req.query.ogun_id, 'öğün');

    // Önce Redis'e bakılır; yoksa veritabanından okunup Redis'e yazılır
    const menu = await menuOnbellek.getir(yemekhaneId, tarih, ogunId, async () =>
      menuNesnesi(await menuRepo.menuDetay(yemekhaneId, tarih, ogunId))
    );
    res.json({ menu });
  } catch (hata) {
    next(hata);
  }
}

// GET /api/menu/haftalik?yemekhane_id=1&baslangic=2026-11-14
async function haftalik(req, res, next) {
  try {
    const yemekhaneId = dogrula.tamSayi(req.query.yemekhane_id, 'yemekhane');
    const baslangic = dogrula.tarih(req.query.baslangic, 'başlangıç tarihi');

    const satirlar = await menuRepo.haftalik(yemekhaneId, baslangic, req.kullanici.id, req.kullanici.rol);
    res.json(
      satirlar.map((s) => ({
        ...s,
        suresi_doldu: s.suresi_doldu === 1,
        // Rezervasyon düğmesi ne zaman açık: süre dolmamış, yer var, kullanıcının aktif/kullanılmış kaydı yok
        rezerve_edilebilir:
          s.suresi_doldu !== 1 && s.bos_yer > 0 && !['aktif', 'kullanildi'].includes(s.rezervasyon_durum),
      }))
    );
  } catch (hata) {
    next(hata);
  }
}

module.exports = { yemekhaneler, ogunler, gununMenusu, haftalik, menuNesnesi };
