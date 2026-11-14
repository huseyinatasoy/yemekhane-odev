// =====================================================================
// Yönlendirme (route) tablosu: hangi URL hangi controller fonksiyonuna gider.
// Tüm yollar /api/ ile başlar (Apache yalnızca /api/ isteklerini uygulamaya iletir).
// =====================================================================
const express = require('express');
const { girisGerekli, yoneticiGerekli } = require('../middleware/yetki');
const auth = require('../controllers/authController');
const menu = require('../controllers/menuController');
const rezervasyon = require('../controllers/rezervasyonController');
const bakiye = require('../controllers/bakiyeController');
const degerlendirme = require('../controllers/degerlendirmeController');
const yonetici = require('../controllers/yoneticiController');

const router = express.Router();

// Sağlık kontrolü (Docker healthcheck ve başlangıç sayfası kullanır)
router.get('/', (req, res) => res.json({ durum: 'calisiyor' }));

// Giriş / çıkış
router.post('/giris', auth.giris);
router.post('/cikis', girisGerekli, auth.cikis);
router.get('/ben', girisGerekli, auth.ben);

// Menü
router.get('/yemekhaneler', girisGerekli, menu.yemekhaneler);
router.get('/ogunler', girisGerekli, menu.ogunler);
router.get('/menu', girisGerekli, menu.gununMenusu);
router.get('/menu/haftalik', girisGerekli, menu.haftalik);

// Rezervasyon
router.get('/rezervasyonlar', girisGerekli, rezervasyon.listele);
router.post('/rezervasyonlar', girisGerekli, rezervasyon.olustur);
router.post('/rezervasyonlar/:id/iptal', girisGerekli, rezervasyon.iptal);

// Bakiye
router.get('/bakiye', girisGerekli, bakiye.getir);
router.post('/bakiye/yukle', girisGerekli, bakiye.yukle);

// Değerlendirme
router.post('/degerlendirmeler', girisGerekli, degerlendirme.ekle);

// Yönetici paneli
router.get('/yonetici/yemekler', girisGerekli, yoneticiGerekli, yonetici.yemekler);
router.get('/yonetici/rapor', girisGerekli, yoneticiGerekli, yonetici.rapor);
router.get('/yonetici/menuler/:id', girisGerekli, yoneticiGerekli, yonetici.menuGetir);
router.post('/yonetici/menuler', girisGerekli, yoneticiGerekli, yonetici.olustur);
router.put('/yonetici/menuler/:id', girisGerekli, yoneticiGerekli, yonetici.guncelle);

module.exports = router;
