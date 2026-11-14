// Değerlendirme: kullanılmış bir menüye 1–5 puan ve yorum
const degerlendirmeRepo = require('../data/degerlendirmeRepo');
const dogrula = require('./dogrula');
const { KullaniciHatasi } = require('../middleware/hata');

// POST /api/degerlendirmeler  { menu_id, puan, yorum }
async function ekle(req, res, next) {
  try {
    const menuId = dogrula.tamSayi(req.body?.menu_id, 'menü');
    const puan = Number(req.body?.puan);
    if (!Number.isInteger(puan) || puan < 1 || puan > 5) {
      throw new KullaniciHatasi('Puan 1 ile 5 arasında olmalıdır.');
    }
    const yorum = (req.body?.yorum || '').toString().trim().slice(0, 500) || null;

    // Şemada olmayan, uygulamaya ait kural: yalnızca kullanılmış menü değerlendirilir
    if (!(await degerlendirmeRepo.kullanilmisMi(req.kullanici.id, menuId))) {
      throw new KullaniciHatasi('Yalnızca kullandığınız menüleri değerlendirebilirsiniz.');
    }

    try {
      await degerlendirmeRepo.ekle(req.kullanici.id, menuId, puan, yorum);
    } catch (hata) {
      if (hata.errno === 1062) throw new KullaniciHatasi('Bu menüyü zaten değerlendirdiniz.');
      throw hata;
    }
    res.status(201).json({ mesaj: 'Değerlendirmeniz kaydedildi. Teşekkürler!' });
  } catch (hata) {
    next(hata);
  }
}

module.exports = { ekle };
