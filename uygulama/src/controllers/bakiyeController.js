// Bakiye ekranı
const bakiyeRepo = require('../data/bakiyeRepo');
const kullaniciRepo = require('../data/kullaniciRepo');
const dogrula = require('./dogrula');

// GET /api/bakiye -> güncel bakiye (kaynaktan) + hareket geçmişi (replikadan)
async function getir(req, res, next) {
  try {
    const [profil, hareketler] = await Promise.all([
      kullaniciRepo.profilGetir(req.kullanici.id),
      bakiyeRepo.hareketler(req.kullanici.id),
    ]);
    res.json({ bakiye: profil.bakiye, hareketler });
  } catch (hata) {
    next(hata);
  }
}

// POST /api/bakiye/yukle  { tutar }
// 10–1000 TL sınırı sp_bakiye_yukle içinde kontrol edilir.
async function yukle(req, res, next) {
  try {
    const tutar = dogrula.tutar(req.body?.tutar, 'tutar');
    const sonuc = await bakiyeRepo.yukle(req.kullanici.id, tutar);
    res.status(201).json({ mesaj: 'Bakiye yüklendi.', ...sonuc });
  } catch (hata) {
    next(hata);
  }
}

module.exports = { getir, yukle };
