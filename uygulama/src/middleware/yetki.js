// =====================================================================
// Yetki ara katmanları (middleware)
//   girisGerekli : geçerli oturum yoksa 401 döner, varsa req.kullanici'yı doldurur
//   yoneticiGerekli: rolü yönetici olmayanı 403 ile reddeder
// =====================================================================
const oturum = require('../services/oturum');

function tokenAl(req) {
  const baslik = req.get('Authorization') || '';
  return baslik.startsWith('Bearer ') ? baslik.slice(7) : null;
}

async function girisGerekli(req, res, next) {
  try {
    const token = tokenAl(req);
    const kullanici = token ? await oturum.getir(token) : null;
    if (!kullanici) {
      return res.status(401).json({ hata: 'Oturumunuz yok ya da süresi doldu. Lütfen tekrar giriş yapın.' });
    }
    req.token = token;
    req.kullanici = kullanici; // { id, ad, soyad, rol }
    next();
  } catch (hata) {
    next(hata);
  }
}

function yoneticiGerekli(req, res, next) {
  if (req.kullanici.rol !== 'yonetici') {
    return res.status(403).json({ hata: 'Bu işlem için yönetici yetkisi gerekir.' });
  }
  next();
}

module.exports = { girisGerekli, yoneticiGerekli, tokenAl };
