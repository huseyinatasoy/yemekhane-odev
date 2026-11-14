// Rezervasyon yapma, iptal ve "Rezervasyonlarım" listesi
const rezervasyonRepo = require('../data/rezervasyonRepo');
const dogrula = require('./dogrula');
const { KullaniciHatasi } = require('../middleware/hata');

// GET /api/rezervasyonlar
async function listele(req, res, next) {
  try {
    const satirlar = await rezervasyonRepo.kullanicininRezervasyonlari(req.kullanici.id);
    res.json(
      satirlar.map((s) => ({
        ...s,
        iptal_edilebilir: s.iptal_edilebilir === 1,
        degerlendirilebilir: s.degerlendirilebilir === 1,
      }))
    );
  } catch (hata) {
    next(hata);
  }
}

// POST /api/rezervasyonlar  { menu_id, porsiyon: 'tam' | 'yarim' }
// Tüm kurallar (son saat, kapasite, bakiye, tekrar, kahvaltıda yarım porsiyon yok)
// sp_rezervasyon_yap içinde. Hata olursa yordamın Türkçe mesajı arayüze iletilir.
async function olustur(req, res, next) {
  try {
    const menuId = dogrula.tamSayi(req.body?.menu_id, 'menü');
    const porsiyon = req.body?.porsiyon || 'tam';
    if (!['tam', 'yarim'].includes(porsiyon)) {
      throw new KullaniciHatasi('Geçersiz porsiyon seçimi.');
    }
    const sonuc = await rezervasyonRepo.rezervasyonYap(req.kullanici.id, menuId, porsiyon);
    res.status(201).json({ mesaj: 'Rezervasyon yapıldı.', ...sonuc });
  } catch (hata) {
    next(hata);
  }
}

// POST /api/rezervasyonlar/:id/iptal
async function iptal(req, res, next) {
  try {
    const rezervasyonId = dogrula.tamSayi(req.params.id, 'rezervasyon');
    const sonuc = await rezervasyonRepo.rezervasyonIptal(req.kullanici.id, rezervasyonId);
    res.json({ mesaj: 'Rezervasyon iptal edildi, ücret iade edildi.', ...sonuc });
  } catch (hata) {
    next(hata);
  }
}

module.exports = { listele, olustur, iptal };
