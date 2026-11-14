// =====================================================================
// Merkezi hata yakalayıcı. Controller'lar hatayı next(hata) ile buraya iletir.
// =====================================================================

// Uygulamanın kendi ürettiği, kullanıcıya gösterilecek hatalar (ör. "Puan 1 ile 5 arasında olmalıdır.")
class KullaniciHatasi extends Error {
  constructor(mesaj, durumKodu = 400) {
    super(mesaj);
    this.durumKodu = durumKodu;
  }
}

function hataYakalayici(hata, req, res, next) {
  // 1) Stored procedure'lerin SIGNAL SQLSTATE '45000' hataları (MySQL hata kodu 1644).
  //    Türkçe mesaj değiştirilmeden arayüze iletilir (ör. "Bakiye yetersiz.").
  if (hata.errno === 1644) {
    return res.status(400).json({ hata: hata.sqlMessage });
  }

  // 2) Uygulamanın kendi doğrulama hataları
  if (hata instanceof KullaniciHatasi) {
    return res.status(hata.durumKodu).json({ hata: hata.message });
  }

  // 3) Bozuk JSON gövdesi
  if (hata.type === 'entity.parse.failed') {
    return res.status(400).json({ hata: 'İstek gövdesi geçerli JSON değil.' });
  }

  // 4) Diğer her şey (CHECK ihlali 3819 dahil) programlama hatasıdır:
  //    ayrıntı günlüğe yazılır, kullanıcıya ham mesaj gösterilmez.
  console.error(`[HATA] ${req.method} ${req.originalUrl}`, hata);
  return res.status(500).json({ hata: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' });
}

module.exports = { hataYakalayici, KullaniciHatasi };
