// Aşama 4 · Profil: kullanıcı alerjenlerini seçer
const alerjenRepo = require('../data/alerjenRepo');
const dogrula = require('./dogrula');
const { KullaniciHatasi } = require('../middleware/hata');

// GET /api/alerjenler -> tüm alerjenler (14 adet)
async function alerjenler(req, res, next) {
  try {
    res.json(await alerjenRepo.tumu());
  } catch (hata) {
    next(hata);
  }
}

// GET /api/profil/alerjenler -> kullanıcının seçtiği alerjen id'leri
async function alerjenlerimGetir(req, res, next) {
  try {
    const alerjenler = await alerjenRepo.kullanicininAlerjenleri(req.kullanici.id);
    res.json({ alerjen_idler: alerjenler.map((a) => a.id) });
  } catch (hata) {
    next(hata);
  }
}

// PUT /api/profil/alerjenler  { alerjen_idler: [1, 4] }
async function alerjenlerimKaydet(req, res, next) {
  try {
    const liste = req.body?.alerjen_idler;
    if (!Array.isArray(liste)) throw new KullaniciHatasi('Alerjen listesi gönderilmedi.');
    const idler = [...new Set(liste.map((id) => dogrula.tamSayi(id, 'alerjen')))];

    try {
      await alerjenRepo.kaydet(req.kullanici.id, idler);
    } catch (hata) {
      if (hata.errno === 1452) throw new KullaniciHatasi('Geçersiz alerjen seçimi.'); // FK ihlali
      throw hata;
    }
    res.json({ mesaj: 'Alerjen tercihleriniz kaydedildi.', alerjen_idler: idler });
  } catch (hata) {
    next(hata);
  }
}

module.exports = { alerjenler, alerjenlerimGetir, alerjenlerimKaydet };
