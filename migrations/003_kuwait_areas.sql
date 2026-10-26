-- Kuwait residential areas (EN/AR) under each Kuwait governorate.
-- Only fills a governorate that has NO areas yet, so admin edits/deletions are never overwritten.
-- Areas inherit the governorate's country and delivery fee. Safe to re-run.
DO $$
DECLARE gov RECORD; kw INTEGER;
BEGIN
  SELECT id INTO kw FROM countries
   WHERE upper(coalesce(country_code,'')) IN ('KW','+965','965') OR upper(coalesce(currency_code,'')) = 'KWD'
   ORDER BY id LIMIT 1;
  IF kw IS NULL THEN RETURN; END IF;

  -- capital
  FOR gov IN SELECT * FROM cities WHERE country_id = kw AND parent_id IS NULL AND (name ILIKE '%capital%' OR name ILIKE '%asima%' OR name_ar LIKE '%العاصمة%') ORDER BY id LIMIT 1 LOOP
    IF NOT EXISTS (SELECT 1 FROM cities WHERE parent_id = gov.id) THEN
      INSERT INTO cities (name, name_en, name_ar, country_id, parent_id, status, delivery_cost, created_at, updated_at)
      SELECT v.en, v.en, v.ar, kw, gov.id, 'active', gov.delivery_cost, now(), now()
      FROM (VALUES
        ('Kuwait City', 'مدينة الكويت'),
        ('Dasman', 'دسمان'),
        ('Sharq', 'شرق'),
        ('Mirqab', 'المرقاب'),
        ('Qibla', 'القبلة'),
        ('Salhiya', 'الصالحية'),
        ('Bneid Al-Qar', 'بنيد القار'),
        ('Dasma', 'الدسمة'),
        ('Daiya', 'الدعية'),
        ('Abdullah Al-Salem', 'ضاحية عبدالله السالم'),
        ('Mansouriya', 'المنصورية'),
        ('Nuzha', 'النزهة'),
        ('Faiha', 'الفيحاء'),
        ('Shamiya', 'الشامية'),
        ('Rawda', 'الروضة'),
        ('Adailiya', 'العديلية'),
        ('Khaldiya', 'الخالدية'),
        ('Qadsiya', 'القادسية'),
        ('Qortuba', 'قرطبة'),
        ('Surra', 'السرة'),
        ('Yarmouk', 'اليرموك'),
        ('Kaifan', 'كيفان'),
        ('Shuwaikh', 'الشويخ'),
        ('Sulaibikhat', 'الصليبخات'),
        ('Doha', 'الدوحة'),
        ('Granada', 'غرناطة'),
        ('Nahdha', 'النهضة'),
        ('Jaber Al-Ahmad', 'مدينة جابر الأحمد'),
        ('North West Sulaibikhat', 'شمال غرب الصليبخات')
      ) AS v(en, ar);
    END IF;
  END LOOP;

  -- hawalli
  FOR gov IN SELECT * FROM cities WHERE country_id = kw AND parent_id IS NULL AND (name ILIKE '%hawall%' OR name_ar LIKE '%حولي%') ORDER BY id LIMIT 1 LOOP
    IF NOT EXISTS (SELECT 1 FROM cities WHERE parent_id = gov.id) THEN
      INSERT INTO cities (name, name_en, name_ar, country_id, parent_id, status, delivery_cost, created_at, updated_at)
      SELECT v.en, v.en, v.ar, kw, gov.id, 'active', gov.delivery_cost, now(), now()
      FROM (VALUES
        ('Hawalli', 'حولي'),
        ('Salmiya', 'السالمية'),
        ('Rumaithiya', 'الرميثية'),
        ('Jabriya', 'الجابرية'),
        ('Mishref', 'مشرف'),
        ('Bayan', 'بيان'),
        ('Salwa', 'سلوى'),
        ('Shaab', 'الشعب'),
        ('Shuhada', 'الشهداء'),
        ('Hitteen', 'حطين'),
        ('Salam', 'السلام'),
        ('Zahra', 'الزهراء'),
        ('Siddiq', 'الصديق'),
        ('Mubarak Al-Abdullah', 'ضاحية مبارك العبدالله'),
        ('Bidaa', 'البدع'),
        ('Maidan Hawalli', 'ميدان حولي')
      ) AS v(en, ar);
    END IF;
  END LOOP;

  -- farwaniya
  FOR gov IN SELECT * FROM cities WHERE country_id = kw AND parent_id IS NULL AND (name ILIKE '%farwan%' OR name_ar LIKE '%الفروانية%') ORDER BY id LIMIT 1 LOOP
    IF NOT EXISTS (SELECT 1 FROM cities WHERE parent_id = gov.id) THEN
      INSERT INTO cities (name, name_en, name_ar, country_id, parent_id, status, delivery_cost, created_at, updated_at)
      SELECT v.en, v.en, v.ar, kw, gov.id, 'active', gov.delivery_cost, now(), now()
      FROM (VALUES
        ('Farwaniya', 'الفروانية'),
        ('Khaitan', 'خيطان'),
        ('Jleeb Al-Shuyoukh', 'جليب الشيوخ'),
        ('Ardiya', 'العارضية'),
        ('Andalous', 'الأندلس'),
        ('Rabiya', 'الرابية'),
        ('Riggae', 'الرقعي'),
        ('Omariya', 'العمرية'),
        ('Rehab', 'الرحاب'),
        ('Ishbiliya', 'إشبيلية'),
        ('Firdous', 'الفردوس'),
        ('Abdullah Al-Mubarak', 'عبدالله المبارك'),
        ('West Abdullah Al-Mubarak', 'غرب عبدالله المبارك'),
        ('Sabah Al-Nasser', 'صباح الناصر'),
        ('Dajeej', 'الضجيج'),
        ('Abraq Khaitan', 'أبرق خيطان')
      ) AS v(en, ar);
    END IF;
  END LOOP;

  -- ahmadi
  FOR gov IN SELECT * FROM cities WHERE country_id = kw AND parent_id IS NULL AND (name ILIKE '%ahmadi%' OR name_ar LIKE '%الاحمدي%' OR name_ar LIKE '%الأحمدي%') ORDER BY id LIMIT 1 LOOP
    IF NOT EXISTS (SELECT 1 FROM cities WHERE parent_id = gov.id) THEN
      INSERT INTO cities (name, name_en, name_ar, country_id, parent_id, status, delivery_cost, created_at, updated_at)
      SELECT v.en, v.en, v.ar, kw, gov.id, 'active', gov.delivery_cost, now(), now()
      FROM (VALUES
        ('Ahmadi', 'الأحمدي'),
        ('Fahaheel', 'الفحيحيل'),
        ('Mangaf', 'المنقف'),
        ('Abu Halifa', 'أبو حليفة'),
        ('Fintas', 'الفنطاس'),
        ('Mahboula', 'المهبولة'),
        ('Riqqa', 'الرقة'),
        ('Hadiya', 'هدية'),
        ('Sabahiya', 'الصباحية'),
        ('Egaila', 'العقيلة'),
        ('Dhaher', 'الظهر'),
        ('Fahad Al-Ahmad', 'فهد الأحمد'),
        ('Jaber Al-Ali', 'جابر العلي'),
        ('Ali Sabah Al-Salem', 'علي صباح السالم'),
        ('Sabah Al-Ahmad City', 'مدينة صباح الأحمد'),
        ('Wafra', 'الوفرة'),
        ('Khairan', 'الخيران'),
        ('Bnaider', 'بنيدر'),
        ('Julaia', 'الجليعة'),
        ('Zour', 'الزور'),
        ('Mina Abdullah', 'ميناء عبدالله')
      ) AS v(en, ar);
    END IF;
  END LOOP;

  -- jahra
  FOR gov IN SELECT * FROM cities WHERE country_id = kw AND parent_id IS NULL AND (name ILIKE '%jahra%' OR name_ar LIKE '%الجهراء%') ORDER BY id LIMIT 1 LOOP
    IF NOT EXISTS (SELECT 1 FROM cities WHERE parent_id = gov.id) THEN
      INSERT INTO cities (name, name_en, name_ar, country_id, parent_id, status, delivery_cost, created_at, updated_at)
      SELECT v.en, v.en, v.ar, kw, gov.id, 'active', gov.delivery_cost, now(), now()
      FROM (VALUES
        ('Jahra', 'الجهراء'),
        ('Saad Al-Abdullah', 'سعد العبدالله'),
        ('Oyoun', 'العيون'),
        ('Naeem', 'النعيم'),
        ('Qasr', 'القصر'),
        ('Waha', 'الواحة'),
        ('Taima', 'تيماء'),
        ('Naseem', 'النسيم'),
        ('Sulaibiya', 'الصليبية'),
        ('Amghara', 'أمغرة'),
        ('Kabd', 'كبد'),
        ('Abdali', 'العبدلي')
      ) AS v(en, ar);
    END IF;
  END LOOP;

  -- mubarak
  FOR gov IN SELECT * FROM cities WHERE country_id = kw AND parent_id IS NULL AND (name ILIKE '%mubarak%' OR name_ar LIKE '%مبارك الكبير%') ORDER BY id LIMIT 1 LOOP
    IF NOT EXISTS (SELECT 1 FROM cities WHERE parent_id = gov.id) THEN
      INSERT INTO cities (name, name_en, name_ar, country_id, parent_id, status, delivery_cost, created_at, updated_at)
      SELECT v.en, v.en, v.ar, kw, gov.id, 'active', gov.delivery_cost, now(), now()
      FROM (VALUES
        ('Mubarak Al-Kabeer', 'مبارك الكبير'),
        ('Adan', 'العدان'),
        ('Qurain', 'القرين'),
        ('Qusour', 'القصور'),
        ('Sabah Al-Salem', 'صباح السالم'),
        ('Messila', 'المسيلة'),
        ('Abu Al-Hasaniya', 'أبو الحصانية'),
        ('Abu Fatira', 'أبو فطيرة'),
        ('Fnaitees', 'الفنيطيس'),
        ('Masayel', 'المسايل'),
        ('Wista', 'الوسطى')
      ) AS v(en, ar);
    END IF;
  END LOOP;
END $$;
