-- =====================================================================
-- Yemekhane Otomasyonu · Migration 04 · Değişiklik talebi
-- Yemekhane Müdürlüğü'nün iki isteği:
--   1. Yarım porsiyon: öğle ve akşamda seçilebilir, ücret tam fiyatın %60'ı.
--      Kahvaltıda yarım porsiyon yoktur. Geçmiş rezervasyonlar tam sayılır.
--   2. Alerjen uyarısı: kullanıcı profilinde alerjenlerini seçer.
--
-- Çalıştırma:
--   * Sıfırdan kurulumda db/init içinde olduğu için 01 ve 02'den sonra kendiliğinden çalışır.
--   * Çalışan sistemde yalnızca KAYNAKTA bir kez çalıştırılır; replikaya replikasyonla geçer:
--     docker compose exec -T mysql-primary mysql -uroot -pyemekhane_kok yemekhane < db/init/04_degisiklik.sql
--
-- Mevcut veri bozulmaz: yeni sütunlar varsayılan değerle eklenir, hiçbir satır silinmez.
-- =====================================================================
SET NAMES utf8mb4;
USE yemekhane;

-- ---------------------------------------------------------------------
-- 1. Öğünler: hangi öğünde yarım porsiyon seçilebilir?
--    Kural koda gömülmez, veride durur. Öğle ve Akşam: 1, Kahvaltı: 0.
-- ---------------------------------------------------------------------
ALTER TABLE ogunler
    ADD COLUMN yarim_porsiyon TINYINT(1) NOT NULL DEFAULT 0
        COMMENT 'Bu öğünde yarım porsiyon seçilebilir mi'
        AFTER servis_bitis;

UPDATE ogunler SET yarim_porsiyon = 1 WHERE ad IN ('Öğle', 'Akşam');

-- ---------------------------------------------------------------------
-- 2. Rezervasyonlar: porsiyon sütunu.
--    DEFAULT 'tam' sayesinde mevcut tüm rezervasyonlar tam porsiyon olur.
-- ---------------------------------------------------------------------
ALTER TABLE rezervasyonlar
    ADD COLUMN porsiyon ENUM('tam', 'yarim') NOT NULL DEFAULT 'tam'
        AFTER durum;

-- ---------------------------------------------------------------------
-- 3. Kullanıcı alerjenleri (çoka çok): kullanıcı profilinde seçilir.
-- ---------------------------------------------------------------------
CREATE TABLE kullanici_alerjenleri (
    kullanici_id  INT UNSIGNED     NOT NULL,
    alerjen_id    TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (kullanici_id, alerjen_id),
    CONSTRAINT fk_ka_kullanici FOREIGN KEY (kullanici_id) REFERENCES kullanicilar (id) ON DELETE CASCADE,
    CONSTRAINT fk_ka_alerjen   FOREIGN KEY (alerjen_id)   REFERENCES alerjenler (id)
) ENGINE=InnoDB;

DELIMITER $$

-- ---------------------------------------------------------------------
-- 4. Porsiyon ücreti tek bir yerde hesaplanır.
--    Hem sp_rezervasyon_yap hem de uygulamanın fiyat listesi bunu kullanır,
--    böylece "%60" kuralı iki yerde ayrı ayrı yazılmaz.
-- ---------------------------------------------------------------------
CREATE FUNCTION fn_porsiyon_ucret(p_tam_fiyat DECIMAL(8,2), p_porsiyon VARCHAR(5))
RETURNS DECIMAL(8,2)
DETERMINISTIC NO SQL
BEGIN
    RETURN IF(p_porsiyon = 'yarim', ROUND(p_tam_fiyat * 0.60, 2), p_tam_fiyat);
END$$

-- ---------------------------------------------------------------------
-- 5. Güncellenmiş sp_rezervasyon_yap(kullanici_id, menu_id, porsiyon)
--    Değişenler (diğer tüm kurallar aynen korunur):
--      * yeni parametre p_porsiyon: 'tam' | 'yarim' (NULL ise 'tam')
--      * öğünde yarım porsiyon yoksa hata
--      * ücret fn_porsiyon_ucret ile hesaplanır, porsiyon kayda yazılır
-- Dönen satır: rezervasyon_id, ucret, bakiye, porsiyon
-- ---------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_rezervasyon_yap$$

CREATE PROCEDURE sp_rezervasyon_yap(
    IN p_kullanici_id INT UNSIGNED,
    IN p_menu_id      INT UNSIGNED,
    IN p_porsiyon     VARCHAR(5)
)
BEGIN
    DECLARE v_rol          VARCHAR(10)  DEFAULT NULL;
    DECLARE v_aktif        TINYINT      DEFAULT NULL;
    DECLARE v_bakiye       DECIMAL(10,2) DEFAULT NULL;
    DECLARE v_son          DATETIME     DEFAULT NULL;
    DECLARE v_kapasite     INT          DEFAULT NULL;
    DECLARE v_ogr_fiyat    DECIMAL(8,2) DEFAULT NULL;
    DECLARE v_per_fiyat    DECIMAL(8,2) DEFAULT NULL;
    DECLARE v_yarim_var    TINYINT      DEFAULT 0;
    DECLARE v_porsiyon     VARCHAR(5)   DEFAULT 'tam';
    DECLARE v_ucret        DECIMAL(8,2) DEFAULT NULL;
    DECLARE v_dolu         INT          DEFAULT 0;
    DECLARE v_mevcut_id    INT UNSIGNED DEFAULT NULL;
    DECLARE v_mevcut_durum VARCHAR(12)  DEFAULT NULL;
    DECLARE v_rez_id       INT UNSIGNED DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    DECLARE CONTINUE HANDLER FOR NOT FOUND BEGIN END;

    SET v_porsiyon = COALESCE(p_porsiyon, 'tam');
    IF v_porsiyon NOT IN ('tam', 'yarim') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Geçersiz porsiyon seçimi.';
    END IF;

    START TRANSACTION;

    -- Kullanıcı satırını kilitle (eşzamanlı bakiye işlemlerine karşı)
    SELECT rol, aktif, bakiye INTO v_rol, v_aktif, v_bakiye
      FROM kullanicilar WHERE id = p_kullanici_id FOR UPDATE;
    IF v_rol IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Kullanıcı bulunamadı.';
    END IF;
    IF v_aktif = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Hesabınız pasif durumda.';
    END IF;

    -- Menü satırını kilitle (eşzamanlı kapasite kontrolüne karşı)
    SELECT TIMESTAMP(m.tarih, o.son_saat), yh.kapasite, m.ogrenci_fiyati, m.personel_fiyati, o.yarim_porsiyon
      INTO v_son, v_kapasite, v_ogr_fiyat, v_per_fiyat, v_yarim_var
      FROM menuler m
      JOIN ogunler o       ON o.id  = m.ogun_id
      JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
     WHERE m.id = p_menu_id
       FOR UPDATE;
    IF v_son IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Menü bulunamadı.';
    END IF;
    IF NOW() >= v_son THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bu menü için rezervasyon süresi doldu.';
    END IF;
    IF v_porsiyon = 'yarim' AND v_yarim_var = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bu öğünde yarım porsiyon seçilemez.';
    END IF;

    SELECT id, durum INTO v_mevcut_id, v_mevcut_durum
      FROM rezervasyonlar
     WHERE kullanici_id = p_kullanici_id AND menu_id = p_menu_id
       FOR UPDATE;
    IF v_mevcut_durum IN ('aktif', 'kullanildi') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bu menü için zaten rezervasyonunuz var.';
    END IF;

    SELECT COUNT(*) INTO v_dolu
      FROM rezervasyonlar
     WHERE menu_id = p_menu_id AND durum IN ('aktif', 'kullanildi');
    IF v_dolu >= v_kapasite THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Yemekhane kapasitesi dolu.';
    END IF;

    SET v_ucret = fn_porsiyon_ucret(IF(v_rol = 'ogrenci', v_ogr_fiyat, v_per_fiyat), v_porsiyon);
    IF v_bakiye < v_ucret THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bakiye yetersiz.';
    END IF;

    IF v_mevcut_id IS NULL THEN
        INSERT INTO rezervasyonlar (kullanici_id, menu_id, durum, porsiyon, ucret)
        VALUES (p_kullanici_id, p_menu_id, 'aktif', v_porsiyon, v_ucret);
        SET v_rez_id = LAST_INSERT_ID();
    ELSE
        -- Daha önce iptal edilmiş kayıt yeniden etkinleşir (porsiyon da güncellenir)
        UPDATE rezervasyonlar
           SET durum = 'aktif', porsiyon = v_porsiyon, ucret = v_ucret, olusturma = NOW(),
               iptal_zamani = NULL, kullanma_zamani = NULL
         WHERE id = v_mevcut_id;
        SET v_rez_id = v_mevcut_id;
    END IF;

    UPDATE kullanicilar SET bakiye = bakiye - v_ucret WHERE id = p_kullanici_id;

    INSERT INTO bakiye_hareketleri (kullanici_id, tur, tutar, rezervasyon_id, aciklama)
    VALUES (p_kullanici_id, 'rezervasyon', -v_ucret, v_rez_id,
            IF(v_porsiyon = 'yarim', 'Rezervasyon (yarım porsiyon)', 'Rezervasyon'));

    COMMIT;

    SELECT v_rez_id AS rezervasyon_id, v_ucret AS ucret, v_bakiye - v_ucret AS bakiye, v_porsiyon AS porsiyon;
END$$

DELIMITER ;
