// Giriş, çıkış ve oturumdaki kullanıcının bilgisi
const bcrypt = require('bcryptjs');
const kullaniciRepo = require('../data/kullaniciRepo');
const oturum = require('../services/oturum');
const { KullaniciHatasi } = require('../middleware/hata');

// POST /api/giris  { eposta, sifre }
async function giris(req, res, next) {
  try {
    const { eposta, sifre } = req.body || {};
    if (!eposta || !sifre) {
      throw new KullaniciHatasi('E-posta ve şifre gereklidir.');
    }

    const kullanici = await kullaniciRepo.epostaIleBul(String(eposta).trim().toLowerCase());
    // bcrypt.compare: girilen şifreyi veritabanındaki hash ile karşılaştırır.
    // Kullanıcı yoksa da aynı mesaj verilir (hangi e-postaların kayıtlı olduğu sızmasın).
    const dogru = kullanici && (await bcrypt.compare(String(sifre), kullanici.sifre_hash));
    if (!dogru) {
      throw new KullaniciHatasi('E-posta ya da şifre hatalı.', 401);
    }
    if (!kullanici.aktif) {
      throw new KullaniciHatasi('Hesabınız pasif durumda.', 403);
    }

    const oturumBilgisi = { id: kullanici.id, ad: kullanici.ad, soyad: kullanici.soyad, rol: kullanici.rol };
    const token = await oturum.olustur(oturumBilgisi);
    res.json({ token, kullanici: oturumBilgisi });
  } catch (hata) {
    next(hata);
  }
}

// POST /api/cikis
async function cikis(req, res, next) {
  try {
    await oturum.sil(req.token);
    res.json({ mesaj: 'Çıkış yapıldı.' });
  } catch (hata) {
    next(hata);
  }
}

// GET /api/ben  -> profil + güncel bakiye (kaynaktan)
async function ben(req, res, next) {
  try {
    const profil = await kullaniciRepo.profilGetir(req.kullanici.id);
    res.json(profil);
  } catch (hata) {
    next(hata);
  }
}

module.exports = { giris, cikis, ben };
