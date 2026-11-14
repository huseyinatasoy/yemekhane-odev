// Yönetici paneli: menü oluşturma/düzenleme, doluluk ve puan raporu
const menuRepo = require('../data/menuRepo');
const menuOnbellek = require('../services/menuOnbellek');
const dogrula = require('./dogrula');
const { KullaniciHatasi } = require('../middleware/hata');

// GET /api/yonetici/yemekler -> menüye eklenebilecek tüm yemekler
async function yemekler(req, res, next) {
  try {
    res.json(await menuRepo.yemekler());
  } catch (hata) {
    next(hata);
  }
}

// GET /api/yonetici/rapor?baslangic=...&bitis=...
async function rapor(req, res, next) {
  try {
    const baslangic = dogrula.tarih(req.query.baslangic, 'başlangıç tarihi');
    const bitis = dogrula.tarih(req.query.bitis, 'bitiş tarihi');
    res.json(await menuRepo.rapor(baslangic, bitis));
  } catch (hata) {
    next(hata);
  }
}

// GET /api/yonetici/menuler/:id -> düzenleme formu için
async function menuGetir(req, res, next) {
  try {
    const menu = await menuRepo.menuGetir(dogrula.tamSayi(req.params.id, 'menü'));
    if (!menu) throw new KullaniciHatasi('Menü bulunamadı.', 404);
    res.json(menu);
  } catch (hata) {
    next(hata);
  }
}

// Form alanlarını doğrular (oluşturma ve düzenleme ortak)
function menuGirdisi(govde = {}) {
  const yemekIdler = Array.isArray(govde.yemek_idler) ? govde.yemek_idler : [];
  if (yemekIdler.length === 0) {
    throw new KullaniciHatasi('Menüye en az bir yemek ekleyin.');
  }
  return {
    ogrenci_fiyati: dogrula.tutar(govde.ogrenci_fiyati, 'öğrenci fiyatı'),
    personel_fiyati: dogrula.tutar(govde.personel_fiyati, 'personel fiyatı'),
    yemek_idler: [...new Set(yemekIdler.map((id) => dogrula.tamSayi(id, 'yemek')))],
  };
}

// POST /api/yonetici/menuler
async function olustur(req, res, next) {
  try {
    const menu = {
      ...menuGirdisi(req.body),
      yemekhane_id: dogrula.tamSayi(req.body?.yemekhane_id, 'yemekhane'),
      tarih: dogrula.tarih(req.body?.tarih),
      ogun_id: dogrula.tamSayi(req.body?.ogun_id, 'öğün'),
    };
    let menuId;
    try {
      menuId = await menuRepo.menuOlustur(menu);
    } catch (hata) {
      if (hata.errno === 1062) throw new KullaniciHatasi('Bu yemekhane, tarih ve öğün için zaten bir menü var.');
      throw hata;
    }
    // Aynı anahtarda eski bir kayıt kalmasın
    await menuOnbellek.sil(menu.yemekhane_id, menu.tarih, menu.ogun_id);
    res.status(201).json({ mesaj: 'Menü oluşturuldu.', menu_id: menuId });
  } catch (hata) {
    next(hata);
  }
}

// PUT /api/yonetici/menuler/:id
async function guncelle(req, res, next) {
  try {
    const menuId = dogrula.tamSayi(req.params.id, 'menü');
    const sonuc = await menuRepo.menuGuncelle(menuId, menuGirdisi(req.body));
    if (!sonuc) throw new KullaniciHatasi('Menü bulunamadı.', 404);
    // Önbellek geçersizleştirme: veritabanı güncellendikten SONRA eski kayıt silinir,
    // bir sonraki istek yeni menüyü veritabanından okuyup Redis'e yazar.
    await menuOnbellek.sil(sonuc.yemekhane_id, sonuc.tarih, sonuc.ogun_id);
    res.json({ mesaj: 'Menü güncellendi.' });
  } catch (hata) {
    next(hata);
  }
}

module.exports = { yemekler, rapor, menuGetir, olustur, guncelle };
