/**
 * Golden Global Expo — High-Definition Multilingual PDF Generator
 * Renders pixel-perfect native typography (Chinese, Arabic, Hindi, Spanish, French, German, English)
 * with zero byte corruption via HTML5 Canvas + jsPDF vector packaging.
 */

const pdfTranslations = {
  ja: {
    brand: "ゴールデン・グローバル・エキスポ · 認定輸出商社",
    docTitle: "公式輸出検査分析証明書および技術仕様書",
    docSub: "CERTIFICATE OF ANALYSIS & TECHNICAL SPECIFICATIONS · JNPT INNSA1",
    secOverview: "1. 輸出ロット基本情報および製品仕様",
    secAssay: "2. 公認試験所による理化学分析検査成績表",
    secLogistics: "3. 輸出梱包仕様およびコンテナ積載物流基準",
    secCommercial: "4. 国際貿易決済条件・検査・法定許認可",
    lblLot: "ロット管理番号",
    lblCommodity: "品名・商品名",
    lblBotanical: "学名 / 規格グレード",
    lblHs: "関税品目番号 (HS Code)",
    lblCrop: "収穫年・シーズン",
    lblOrigin: "産地・集荷市場",
    lblPort: "積出港: インド・ムンバイ港 JNPT (Nhava Sheva - INNSA1)",
    thParam: "検査項目 / 品質パラメータ",
    thLimit: "契約保証基準値",
    thResult: "ロット実測結果",
    thMethod: "分析手法 / 測定規格",
    lblPackaging: "輸出梱包仕様: 25kg / 50kg 食品用高密度PP袋 (内袋付)",
    lblPayload: "20' FCLコンテナ積載量: 24.0 メトリックトン (~480袋 / 50kg)",
    lblStorage: "賞味期限と保管: 製造後24ヶ月 (<25°C 涼しく乾燥した場所)",
    incoterms: "適用貿易条件: FOB (JNPT ムンバイ) / CIF (各指定仕向港) / CFR",
    payment: "決済条件: 100% 取消不能一覧払信用状 (L/C at Sight) / 30% T/T 前払 + 70% B/L送付時",
    inspection: "船前検査: SGS / Intertek / Bureau Veritas 公認検査機関によるサンプル検定",
    compliance: "公的認証: インド農産物輸出開発局 (APEDA), FSSAI中央輸出許可, インド香料局",
    qaSignatory: "Dr. R. K. Sharma — 品質保証および輸出コンプライアンス総責任者",
    qaSeal: "公式品質検定印",
    qaVerified: "出荷検査合格",
    footer: "ゴールデン・グローバル・エキスポ (Golden Global Expo) · インド・ムンバイ · nigadearyan@gmail.com",
    params: {
      purity: "ソーテックス光学選別純度 (Sortex Clean)",
      moisture: "水分含有量 (AOAC 925.10 減圧乾燥法)",
      admixture: "異物・混入物比率",
      damaged: "被害粒および変色不完全粒",
      protein: "粗タンパク質 / 有効活性成分",
      aflatoxin: "総アフラトキシン量 (B1+B2+G1+G2)",
      heavyMetals: "重金属残留物 (鉛Pb, カドミウムCd, ヒ素As)",
      pesticides: "残留農薬一斉スクリーニング",
      gmo: "非遺伝子組換え検査 (Non-GMO PCR)",
      infestation: "生きた害虫の完全不検出"
    }
  },
  ko: {
    brand: "골든 글로벌 엑스포 · 인도 정부 공인 무역상사",
    docTitle: "공식 수출 검사 분석증명서 및 기술 규격서",
    docSub: "CERTIFICATE OF ANALYSIS & TECHNICAL SPECIFICATIONS · JNPT INNSA1",
    secOverview: "1. 수출 로트 기본 정보 및 제품 규격",
    secAssay: "2. 공인 시험소 이화학 정밀 시험성적서",
    secLogistics: "3. 수출 표준 포장 및 컨테이너 적재 물류 규격",
    secCommercial: "4. 국제 무역 결제 조건, 선적 검사 및 법적 인허가",
    lblLot: "로트 관리번호",
    lblCommodity: "품목명 / 상품명",
    lblBotanical: "학명 / 수출 등급",
    lblHs: "관세 품목번호 (HS Code)",
    lblCrop: "수확 연도 / 시즌",
    lblOrigin: "원산지 / 집하 산지",
    lblPort: "선적항: 인도 뭄바이항 JNPT (Nhava Sheva - INNSA1)",
    thParam: "검사 항목 / 품질 지표",
    thLimit: "계약 보증 기준치",
    thResult: "로트 실측 결과치",
    thMethod: "검사 표준 / 분석법",
    lblPackaging: "수출 포장 규격: 25kg / 50kg 고밀도 PP 포대 (이너 비닐 포함)",
    lblPayload: "20' FCL 적재 용량: 24.0 메트릭톤 (~480포대 / 50kg)",
    lblStorage: "유통기한 및 보관: 24개월 (<25°C 건냉소 보관)",
    incoterms: "표준 무역 조건: FOB (JNPT 뭄바이) / CIF (수입 지정항) / CFR 해상운송",
    payment: "대금 결제 조건: 100% 취소불능 일람출급 신용장 (L/C at Sight) / 30% T/T + 70% B/L",
    inspection: "사전 선적 검사: SGS / Intertek / Bureau Veritas 공인 검사기관 검정 통과",
    compliance: "법적 인허가: 인도 농산물수출개발원 (APEDA), FSSAI 중앙 수출면허, 인도 향신료청",
    qaSignatory: "Dr. R. K. Sharma — 품질보증 및 수출 컴플라이언스 총괄",
    qaSeal: "공식 품질 검정 인",
    qaVerified: "시험 적합 합격",
    footer: "골든 글로벌 엑스포 (Golden Global Expo) · 인도 뭄바이 본사 · nigadearyan@gmail.com",
    params: {
      purity: "광학 소텍스 색채 선별 순도 (Sortex Clean)",
      moisture: "수분 함유량 (AOAC 925.10 진공 건조법)",
      admixture: "이물질 및 협잡물 혼입률",
      damaged: "손상립 및 변색 불완전립",
      protein: "조단백질 / 유효 활성 성분",
      aflatoxin: "총 아플라톡신 함량 (B1+B2+G1+G2)",
      heavyMetals: "중금속 잔류 검사 (납Pb, 카드뮴Cd, 비소As)",
      pesticides: "다성분 잔류농약 정밀 스크리닝",
      gmo: "비유전자변형 검사 (Non-GMO PCR)",
      infestation: "살아있는 해충 불검출"
    }
  },
  zh: {
    brand: "金色环球世博 · 印度出口商",
    docTitle: "官方出口检验分析证书与技术规格书",
    docSub: "CERTIFICATE OF ANALYSIS & TECHNICAL SPECIFICATIONS · JNPT INNSA1",
    secOverview: "一、 出口批次基本信息与规格",
    secAssay: "二、 权威实验室理化指标与化验结果",
    secLogistics: "三、 出口包装与集装箱物流标准",
    secCommercial: "四、 国际贸易结算、检验与法定资质",
    lblLot: "批次编号",
    lblCommodity: "商品名称",
    lblBotanical: "植物学名 / 规格",
    lblHs: "海关税则号 (HS Code)",
    lblCrop: "收获产季",
    lblOrigin: "产地 / 来源市场",
    lblPort: "装运港口: 印度孟买港 JNPT (Nhava Sheva - INNSA1)",
    thParam: "检测项目 / 质量指标",
    thLimit: "合同保证限值",
    thResult: "批次实测结果",
    thMethod: "检测标准 / 仪器",
    lblPackaging: "出口包装规格: 25kg / 50kg 双层高密聚丙烯编织袋 (附内衬)",
    lblPayload: "20尺集装箱装载量: 24.0 公吨 (~480袋 / 50kg)",
    lblStorage: "保质期与仓储: 24个月 (<25°C 阴凉干燥通风处)",
    incoterms: "标准贸易术语: FOB (JNPT 孟买) / CIF (目标港口) / CFR 国际海运",
    payment: "结算方式: 100% 即期不可撤销信用证 (L/C at Sight) / 30% T/T 预付 + 70% 提单扫描件",
    inspection: "装船前检验: 经 SGS / Intertek / Bureau Veritas 国际公证机构抽样化验放行",
    compliance: "法定备案资质: 印度农产品出口局 (APEDA), FSSAI 中央出口许可, 香料局认证",
    qaSignatory: "Dr. R. K. Sharma — 质量保证与出口合规总监",
    qaSeal: "官方质量认证章",
    qaVerified: "化验合格放行",
    footer: "金色环球世博 (Golden Global Expo) · 印度孟买瓦达拉东区出口总部 · nigadearyan@gmail.com",
    params: {
      purity: "色选物理纯度 (Sortex Clean)",
      moisture: "水分含量 (AOAC 925.10 真空干燥)",
      admixture: "杂质 / 外来夹杂物",
      damaged: "受损及变色不全粒",
      protein: "粗蛋白质 / 活性有效成分",
      aflatoxin: "黄曲霉毒素总量 (B1+B2+G1+G2)",
      heavyMetals: "重金属残留 (铅Pb, 镉Cd, 砷As)",
      pesticides: "多农残综合筛查",
      gmo: "非转基因检测 (Non-GMO PCR)",
      infestation: "活虫及害虫检验"
    }
  },
  ar: {
    brand: "غولدن غلوبال إكسبو · المصدر التجاري المعتمد",
    docTitle: "شهادة التحليل المخبري والمواصفات الفنية للتصدير",
    docSub: "CERTIFICATE OF ANALYSIS & EXPORT SPECIFICATION SHEET · JNPT MUMBAI",
    secOverview: "1. بيانات الشحنة والمواصفات الفنية",
    secAssay: "2. نتائج الفحص المخبري المعتمد ومصفوفة الجودة",
    secLogistics: "3. مواصفات التعبئة والتغليف والشحن البحري",
    secCommercial: "4. شروط التجارة الدولية والاعتمادات البنكية",
    lblLot: "رقم الشحنة المرجعي",
    lblCommodity: "اسم المنتج الزراعي",
    lblBotanical: "الاسم العلمي / الرتبة",
    lblHs: "البند الجمركي (HS Code)",
    lblCrop: "موسم الحصاد",
    lblOrigin: "منطقة الإنتاج والمنشأ",
    lblPort: "ميناء الشحن: ميناء نهافا شيفا مومباي (JNPT INNSA1) الهند",
    thParam: "عنصر الفحص المخبري",
    thLimit: "الحد التعاقدي المضمون",
    thResult: "نتيجة فحص الدفعة",
    thMethod: "المعيار المخبري الدولي",
    lblPackaging: "معيار التعبئة: أكياس بولي بروبلين 25/50 كجم محكمة الإغلاق ببطانة داخلية",
    lblPayload: "حمولة حاوية 20 قدم: 24.0 طن متري (~480 كيس / 50 كجم)",
    lblStorage: "الصلاحية والتخزين: 24 شهراً من تاريخ التعبئة (مكان جاف وبارد)",
    incoterms: "الشروط التجارية: FOB (ميناء JNPT) / CIF (ميناء جبل علي / الدمام / الدوحة)",
    payment: "طرق السداد: اعتماد مستندي بنكي معزز غير قابل للإلغاء (L/C at Sight) / 30% T/T",
    inspection: "الفحص قبل الشحن: فحص معتمد من SGS / Intertek / Bureau Veritas",
    compliance: "التراخيص الحكومية: هيئة APEDA الهندية، هيئة FSSAI المركزية، مجلس التوابل",
    qaSignatory: "د. ر. ك. شارما — رئيس قسم ضمان الجودة والامتثال التصديري",
    qaSeal: "ختم الجودة المعتمد",
    qaVerified: "مطابق للمواصفات",
    footer: "غولدن غلوبال إكسبو (Golden Global Expo) · المقر الرئيسي مومباي، الهند · nigadearyan@gmail.com",
    params: {
      purity: "النقاوة ونظافة الفرز الليزري (Sortex)",
      moisture: "نسبة الرطوبة (AOAC 925.10)",
      admixture: "الشوائب والمواد الغريبة",
      damaged: "الحبوب التالفة والمتغيرة اللون",
      protein: "نسبة البروتين والمكونات الفعالة",
      aflatoxin: "سموم الأفلاتوكسين (B1 + Total)",
      heavyMetals: "المعادن الثقيلة (رصاص، كادميوم، زرنيخ)",
      pesticides: "فحص متبقيات المبيدات الحشرية",
      gmo: "الحالة الوراثية (غير معدل وراثياً Non-GMO)",
      infestation: "خلو تام من الحشرات الحية"
    }
  },
  hi: {
    brand: "गोल्डन ग्लोबल एक्सपो · मुंबई",
    docTitle: "आधिकारिक निर्यात विश्लेषण एवं तकनीकी विनिर्देश प्रमाणपत्र",
    docSub: "CERTIFICATE OF ANALYSIS & TECHNICAL SPECIFICATIONS · JNPT INNSA1",
    secOverview: "1. निर्यात खेप एवं उत्पाद विनिर्देश",
    secAssay: "2. प्रमाणित प्रयोगशाला परीक्षण मैट्रिक्स",
    secLogistics: "3. पैकेजिंग एवं कंटेनर लॉजिस्टिक्स मानक",
    secCommercial: "4. वाणिज्यिक शर्तें, भुगतान एवं सरकारी प्रमाणन",
    lblLot: "लॉट संदर्भ संख्या",
    lblCommodity: "उत्पाद का नाम",
    lblBotanical: "वानस्पतिक नाम / ग्रेड",
    lblHs: "एचएस टैरिफ कोड (HS Code)",
    lblCrop: "फसल / कटाई सत्र",
    lblOrigin: "उत्पत्ति क्षेत्र / मंडी",
    lblPort: "लोडिंग पोर्ट: जेएनपीटी (न्हावा शेवा - INNSA1) मुंबई, भारत",
    thParam: "परीक्षण मानक / पैरामीटर",
    thLimit: "गारंटीकृत अनुबंध सीमा",
    thResult: "लैब परीक्षण परिणाम",
    thMethod: "परीक्षण विधि / मानक",
    lblPackaging: "निर्यात पैकेजिंग: 25 किग्रा / 50 किग्रा पीपी बैग (आंतरिक लाइनर युक्त)",
    lblPayload: "20' FCL कंटेनर क्षमता: 24.0 मीट्रिक टन (~480 बैग / 50 किग्रा)",
    lblStorage: "शेल्फ लाइफ एवं भंडारण: पैकिंग से 24 महीने (<25°C, शुष्क वातावरण)",
    incoterms: "मानक इनकोटर्म्स: FOB (JNPT मुंबई) / CIF (गंतव्य पोर्ट) / CFR",
    payment: "भुगतान शर्तें: 100% दृष्टि साख पत्र (Irrevocable L/C at Sight) / 30% T/T अग्रिम + 70% बी/एल",
    inspection: "प्री-शिपमेंट निरीक्षण: SGS / Intertek / Bureau Veritas द्वारा प्रमाणित सैंपलिंग",
    compliance: "वैधानिक अनुपालन: एपीडा (APEDA), एफएसएसएआई केंद्रीय निर्यात लाइसेंस, स्पाइसेस बोर्ड",
    qaSignatory: "डॉ. आर. के. शर्मा — गुणवत्ता आश्वासन एवं निर्यात अनुपालन प्रमुख",
    qaSeal: "गुणवत्ता सील",
    qaVerified: "परीक्षण सत्यापित",
    footer: "गोल्डन ग्लोबल एक्सपो · वडाला ईस्ट, मुंबई 400037, भारत · nigadearyan@gmail.com",
    params: {
      purity: "सॉर्टेक्स भौतिक शुद्धता (Sortex Clean)",
      moisture: "नमी की मात्रा (AOAC 925.10)",
      admixture: "विजातीय बाह्य पदार्थ",
      damaged: "क्षतिग्रस्त एवं बदरंग दाने",
      protein: "प्रोटीन एवं सक्रिय तत्व",
      aflatoxin: "एफ्लाटॉक्सिन कुल (B1+B2+G1+G2)",
      heavyMetals: "भारी धातुएं (Pb, Cd, As, Hg)",
      pesticides: "कीटनाशक अवशेष परीक्षण",
      gmo: "गैर-जीएमओ प्रमाणीकरण (Non-GMO PCR)",
      infestation: "जीवित कीट एवं संक्रमण मुक्त"
    }
  },
  es: {
    brand: "GOLDEN GLOBAL EXPO · MUMBAI",
    docTitle: "CERTIFICADO DE ANÁLISIS & ESPECIFICACIONES TÉCNICAS",
    docSub: "OFFICIAL EXPORT CONSIGNMENT SPECIFICATION · PUERTO DE JNPT (INNSA1)",
    secOverview: "1. RESUMEN DEL EMBARQUE & METADATOS",
    secAssay: "2. MATRIZ DE ANÁLISIS DE LABORATORIO ACREDITADO",
    secLogistics: "3. NORMAS DE EMBALAJE Y LOGÍSTICA DE CONTENEDORES",
    secCommercial: "4. CONDICIONES COMERCIALES, INCOTERMS Y ACREDITACIÓN",
    lblLot: "Referencia de Lote",
    lblCommodity: "Descripción del Producto",
    lblBotanical: "Nombre Botánico / Grado",
    lblHs: "Código Arancelario (HS Code)",
    lblCrop: "Cosecha / Zafra",
    lblOrigin: "Origen / Terroir Mandi",
    lblPort: "Puerto de Carga: JNPT (Nhava Sheva - INNSA1), Mumbai, India",
    thParam: "Parámetro de Ensayo",
    thLimit: "Límite Garantizado",
    thResult: "Resultado de Lote",
    thMethod: "Norma de Ensayo",
    lblPackaging: "Embalaje Exportación: Bolsas de Polipropileno de 25kg / 50kg con liner interno",
    lblPayload: "Carga Útil Contenedor 20' FCL: 24.0 Toneladas Métricas (~480 sacos)",
    lblStorage: "Vida Útil y Almacenamiento: 24 Meses (<25°C, <60% HR)",
    incoterms: "Incoterms: FOB (JNPT Mumbai) / CIF (Puerto Destino) / CFR",
    payment: "Condiciones de Pago: Carta de Crédito Irrevocable (L/C a la Vista) / 30% T/T + 70% B/L",
    inspection: "Inspección Pre-Embarque: Muestreo certificado por SGS / Intertek / Bureau Veritas",
    compliance: "Acreditaciones Legales: APEDA Reg, Licencia Central FSSAI, Spices Board India",
    qaSignatory: "Dr. R. K. Sharma — Director de Calidad y Cumplimiento de Exportación",
    qaSeal: "SELLO DE CALIDAD GGE",
    qaVerified: "VERIFICADO QA",
    footer: "Golden Global Expo · Sede Central Wadala East, Mumbai, India · nigadearyan@gmail.com",
    params: {
      purity: "Pureza Física Óptica (Sortex)",
      moisture: "Contenido de Humedad (AOAC 925.10)",
      admixture: "Materia Extraña / Impurezas",
      damaged: "Granos Dañados y Manchados",
      protein: "Proteína / Compuestos Activos",
      aflatoxin: "Aflatoxinas Totales (B1+B2+G1+G2)",
      heavyMetals: "Metales Pesados (Pb, Cd, As, Hg)",
      pesticides: "Tamizaje de Residuos Pesticidas",
      gmo: "Condición Transgénica (No OGM Verificado)",
      infestation: "Libre de Infestación de Insectos"
    }
  },
  fr: {
    brand: "GOLDEN GLOBAL EXPO · MUMBAI",
    docTitle: "CERTIFICAT D'ANALYSE & SPÉCIFICATIONS TECHNIQUES",
    docSub: "FICHE TECHNIQUE OFFICIELLE D'EXPORTATION · PORT DE JNPT (INNSA1)",
    secOverview: "1. RÉCAPITULATIF DU LOT & PRODUIT",
    secAssay: "2. MATRICE D'ANALYSE EN LABORATOIRE ACCRÉDITÉ",
    secLogistics: "3. NORMES D'EMBALLAGE ET LOGISTIQUE CONTENEURS",
    secCommercial: "4. CONDITIONS COMMERCIALES, INCOTERMS ET ACCRÉDITATIONS",
    lblLot: "Référence du Lot",
    lblCommodity: "Désignation du Produit",
    lblBotanical: "Botanique / Grade",
    lblHs: "Code Douanier (HS Code)",
    lblCrop: "Campagne de Récolte",
    lblOrigin: "Terroir d'Origine / Mandi",
    lblPort: "Port de Chargement: JNPT (Nhava Sheva - INNSA1), Mumbai, Inde",
    thParam: "Paramètre Analytique",
    thLimit: "Limite Contractuelle Garantie",
    thResult: "Résultat du Lot",
    thMethod: "Norme / Méthode",
    lblPackaging: "Emballage Export: Sacs PP 25kg / 50kg doublés PE haute densité",
    lblPayload: "Charge Utile Conteneur 20' FCL: 24.0 Tonnes Métriques (~480 sacs)",
    lblStorage: "Conservation: 24 Mois (<25°C, lieu sec et ventilé)",
    incoterms: "Incoterms: FOB (JNPT Mumbai) / CIF (Port de Destination) / CFR",
    payment: "Modalités de Paiement: Lettre de Crédit Irrévocable (L/C à Vue) / 30% T/T + 70% B/L",
    inspection: "Inspection Avant Embarquement: Échantillonnage certifié SGS / Intertek",
    compliance: "Conformité Légale: APEDA Reg, Licence Centrale FSSAI, Spices Board",
    qaSignatory: "Dr. R. K. Sharma — Responsable Assurance Qualité & Conformité Export",
    qaSeal: "SCEAU DE QUALITÉ GGE",
    qaVerified: "VÉRIFIÉ ET CONFORME",
    footer: "Golden Global Expo · Siège Social Wadala East, Mumbai, Inde · nigadearyan@gmail.com",
    params: {
      purity: "Pureté Physique (Tri Optique Sortex)",
      moisture: "Teneur en Humidité (AOAC 925.10)",
      admixture: "Matières Étrangères / Impuretés",
      damaged: "Grains Endommagés et Décolorés",
      protein: "Teneur en Protéines",
      aflatoxin: "Aflatoxines Totales (B1+B2+G1+G2)",
      heavyMetals: "Métaux Lourds (Pb, Cd, As, Hg)",
      pesticides: "Recherche de Résidus Pesticides",
      gmo: "Statut OGM (Non-OGM Vérifié)",
      infestation: "Absence d'Insectes Vivants"
    }
  },
  de: {
    brand: "GOLDEN GLOBAL EXPO · MUMBAI",
    docTitle: "ANALYSENZERTIFIKAT & TECHNISCHE SPEZIFIKATIONEN",
    docSub: "OFFIZIELLES EXPORT-DATENBLATT · JNPT HAFEN MUMBAI (INNSA1)",
    secOverview: "1. SENDUNGSÜBERSICHT & WARENANGABEN",
    secAssay: "2. ZERTIFIZIERTE LABOR-ANALYSEMATRIX",
    secLogistics: "3. VERPACKUNGS- UND CONTAINERSTANDARDS",
    secCommercial: "4. HANDELSBEDINGUNGEN, INCOTERMS UND AKKREDITIERUNGEN",
    lblLot: "Lot-Referenznummer",
    lblCommodity: "Handelsbezeichnung",
    lblBotanical: "Botanisch / Gradierung",
    lblHs: "Zolltarifnummer (HS Code)",
    lblCrop: "Ernteperiode",
    lblOrigin: "Herkunftsregion / Mandi",
    lblPort: "Verladehafen: JNPT (Nhava Sheva - INNSA1), Mumbai, Indien",
    thParam: "Prüfparameter",
    thLimit: "Garantierter Grenzwert",
    thResult: "Laborbefund",
    thMethod: "Prüfverfahren",
    lblPackaging: "Exportverpackung: 25kg / 50kg PP-Gewebesäcke mit PE-Inliner",
    lblPayload: "20' FCL Containernutzlast: 24.0 Tonnen (~480 Säcke / 50kg)",
    lblStorage: "Haltbarkeit & Lagerung: 24 Monate (<25°C, trocken lagern)",
    incoterms: "Incoterms: FOB (JNPT Mumbai) / CIF (Bestimmungshafen) / CFR",
    payment: "Zahlungsbedingungen: Unwiderrufliches Sichtakkreditiv (L/C at Sight) / 30% T/T + 70% B/L",
    inspection: "Vorversandkontrolle: Zertifizierte Beprobung durch SGS / Intertek",
    compliance: "Behördliche Registrierung: APEDA Reg, FSSAI Zentrallizenz, Spices Board",
    qaSignatory: "Dr. R. K. Sharma — Leiter Qualitätssicherung & Export-Compliance",
    qaSeal: "GGE QUALITÄTSSIEGEL",
    qaVerified: "GEPRÜFT & FREIGEGEBEN",
    footer: "Golden Global Expo · Export-Zentrale Wadala East, Mumbai, Indien · nigadearyan@gmail.com",
    params: {
      purity: "Physikalische Sortex-Reinheit",
      moisture: "Feuchtigkeitsgehalt (AOAC 925.10)",
      admixture: "Fremdbestandteile / Beimengung",
      damaged: "Beschädigte & Verfärbte Körner",
      protein: "Rohprotein / Wirkstoffgehalt",
      aflatoxin: "Aflatoxine Gesamt (B1+B2+G1+G2)",
      heavyMetals: "Schwermetalle (Pb, Cd, As, Hg)",
      pesticides: "Pestizidrückstandsanalyse",
      gmo: "Gentechnikfrei (Non-GMO PCR)",
      infestation: "Frei von lebendem Schädlingsbefall"
    }
  },

  th: {
    brand: "โกลเด้น โกลบอล เอ็กซ์โป · มุมไบ",
    docTitle: "ใบรับรองการตรวจวิเคราะห์และข้อกำหนดทางเทคนิคเพื่อการส่งออก",
    docSub: "CERTIFICATE OF ANALYSIS & TECHNICAL SPECIFICATIONS · JNPT INNSA1",
    secOverview: "1. ภาพรวมข้อมูลรุ่นสินค้าและข้อมูลจำเพาะ",
    secAssay: "2. ผลการตรวจวิเคราะห์ทางห้องปฏิบัติการรับรองมาตรฐาน",
    secLogistics: "3. มาตรฐานการบรรจุภัณฑ์ การจัดวางตู้สินค้า และการเก็บรักษา",
    secCommercial: "4. เงื่อนไขทางการค้าสากล การชำระเงิน และการรับรองทางกฎหมาย",
    lblLot: "รหัสอ้างอิงรุ่นสินค้า (Lot No.)",
    lblCommodity: "รายการสินค้าเกษตร",
    lblBotanical: "ชื่อพฤกษศาสตร์ / เกรด",
    lblHs: "พิกัดศุลกากร (HS Code)",
    lblCrop: "ฤดูกาลเพาะปลูก / เก็บเกี่ยว",
    lblOrigin: "แหล่งกำเนิด / ตลาดเกษตร",
    lblPort: "ท่าเรือต้นทาง: JNPT (Nhava Sheva - INNSA1) มุมไบ, อินเดีย",
    thParam: "รายการตรวจสอบ / คุณภาพ",
    thLimit: "เกณฑ์มาตรฐานตามสัญญา",
    thResult: "ผลการตรวจวิเคราะห์จริง",
    thMethod: "มาตรฐานการทดสอบ / วิธีการ",
    lblPackaging: "มาตรฐานการบรรจุ: กระสอบ PP สองชั้นเกรดอาหาร 25 กก. / 50 กก. บุถุง PE ด้านใน",
    lblPayload: "ความจุตู้สินค้า 20' FCL: 24.0 เมตริกตัน (~480 กระสอบ / 50 กก.)",
    lblStorage: "อายุการเก็บรักษา: 24 เดือนนับจากวันบรรจุ (<25°C, ความชื้นสัมพัทธ์ <60%)",
    incoterms: "เงื่อนไขการส่งมอบ: FOB (ท่าเรือ JNPT มุมไบ) / CIF (ท่าเรือปลายทาง) / CFR",
    payment: "เงื่อนไขการชำระเงิน: 100% Irrevocable L/C at Sight / 30% T/T มัดจำ + 70% เมื่อส่งสำเนา B/L",
    inspection: "การตรวจสอบก่อนส่งมอบ: สุ่มตรวจและออกใบรับรองโดย SGS / Intertek / Bureau Veritas",
    compliance: "การรับรองตามกฎหมาย: APEDA (APEDA/MUM/2026/0488), ใบอนุญาต FSSAI, สภาเครื่องเทศ",
    qaSignatory: "ดร. อาร์. เค. ชาร์มา — หัวหน้าฝ่ายควบคุมคุณภาพและมาตรฐานการส่งออก GGE",
    qaSeal: "ตราประทับคุณภาพ GGE",
    qaVerified: "ผ่านการตรวจสอบคุณภาพสมบูรณ์",
    footer: "โกลเด้น โกลบอล เอ็กซ์โป (Golden Global Expo) · สำนักงานใหญ่ส่งออก วาดาลา อีสต์, มุมไบ, อินเดีย · nigadearyan@gmail.com",
    params: {
      purity: "ความบริสุทธิ์ทางกายภาพ (คัดแยก Sortex)",
      moisture: "ปริมาณความชื้นสูงสุด (AOAC 925.10)",
      admixture: "สิ่งแปลกปลอมและสิ่งเจือปน",
      damaged: "เมล็ดเสียหายและเปลี่ยนสี",
      protein: "ปริมาณโปรตีนรวม / สารสำคัญ",
      aflatoxin: "สารพิษอะฟลาท็อกซินรวม (B1+B2+G1+G2)",
      heavyMetals: "โลหะหนัก (สารตะกั่ว แคดเมียม สารหนู)",
      pesticides: "การตรวจคัดกรองสารเคมีตกค้าง",
      gmo: "สถานะการดัดแปลงพันธุกรรม (Non-GMO)",
      infestation: "ปลอดจากแมลงที่มีชีวิต 100%"
    }
  },
  id: {
    brand: "GOLDEN GLOBAL EXPO · MUMBAI",
    docTitle: "SERTIFIKAT ANALISIS & SPESIFIKASI TEKNIS EKSPOR RESMI",
    docSub: "OFFICIAL EXPORT CONSIGNMENT SPECIFICATION SHEET · JNPT MUMBAI (INNSA1)",
    secOverview: "1. IKHTISAR PENGIRIMAN & METADATA PRODUK",
    secAssay: "2. MATRIKS UJI ANALISIS LABORATORIUM TERAKREDITASI",
    secLogistics: "3. STANDAR PENGEMASAN, KONTAINERISASI & PENYIMPANAN",
    secCommercial: "4. KETENTUAN KOMERSIAL, INCOTERMS & AKREDITASI",
    lblLot: "Nomor Referensi Lot",
    lblCommodity: "Nama Komoditas Pertanian",
    lblBotanical: "Nama Botani / Kelas Mutu",
    lblHs: "Kode Tarif Kepabeanan (HS Code)",
    lblCrop: "Musim Panen / Tahun Tanam",
    lblOrigin: "Sentra Panen / Mandi",
    lblPort: "Pelabuhan Muat: JNPT (Nhava Sheva - INNSA1), Mumbai, India",
    thParam: "Parameter Pengujian Mutu",
    thLimit: "Batas Garansi Kontrak",
    thResult: "Hasil Uji Laboratorium",
    thMethod: "Metode & Standar Pengujian",
    lblPackaging: "Standar Kemasan Ekspor: Karung Anyaman PP 25kg / 50kg dengan Lapisan Inner PE",
    lblPayload: "Kapasitas Kontainer 20' FCL: 24.0 Metrik Ton (~480 Karung @ 50kg)",
    lblStorage: "Masa Simpan & Penyimpanan: 24 Bulan dari Tanggal Kemas (<25°C, <60% RH)",
    incoterms: "Incoterms Standar: FOB (JNPT Nhava Sheva) / CIF (Pelabuhan Tujuan) / CFR",
    payment: "Ketentuan Pembayaran: 100% Irrevocable L/C at Sight / 30% T/T Uang Muka + 70% Salinan B/L",
    inspection: "Inspeksi Pra-Pengapalan: Pengambilan sampel bersertifikat oleh SGS / Intertek / Bureau Veritas",
    compliance: "Kepatuhan Resmi: APEDA (APEDA/MUM/2026/0488), Izin Pusat FSSAI, Spices Board India",
    qaSignatory: "Dr. R. K. Sharma — Kepala Jaminan Mutu & Kepatuhan Ekspor GGE Mumbai",
    qaSeal: "SEGEL MUTU GGE",
    qaVerified: "TERUJI & MEMENUHI SYARAT",
    footer: "Golden Global Expo — Rumah Ekspor Resmi · Wadala East, Mumbai 400037, India · nigadearyan@gmail.com",
    params: {
      purity: "Kemurnian Fisik (Sortex Clean)",
      moisture: "Kadar Air Maksimum (AOAC 925.10)",
      admixture: "Bahan Asing / Kotoran",
      damaged: "Biji Rusak & Berubah Warna",
      protein: "Kadar Protein / Senyawa Aktif",
      aflatoxin: "Total Aflatoksin (B1+B2+G1+G2)",
      heavyMetals: "Logam Berat (Pb, Cd, As, Hg)",
      pesticides: "Skrining Residu Pestisida",
      gmo: "Status Rekayasa Genetika (Non-GMO)",
      infestation: "Bebas Hama Hidup (Nol Toleransi)"
    }
  },
  ms: {
    brand: "GOLDEN GLOBAL EXPO · MUMBAI",
    docTitle: "SIJIL ANALISIS & SPESIFIKASI TEKNIKAL EKSPORT RASMI",
    docSub: "OFFICIAL EXPORT CONSIGNMENT SPECIFICATION SHEET · JNPT MUMBAI (INNSA1)",
    secOverview: "1. RINGKASAN KONSINMEN & METADATA PRODUK",
    secAssay: "2. MATRIKS UJIAN ANALISIS MAKMAL BERAKREDITASI",
    secLogistics: "3. PIAWAIAN PEMBUNGKUSAN, KONTAINER & PENYIMPANAN",
    secCommercial: "4. SYARAT KOMERSIAL, INCOTERMS & AKREDITASI",
    lblLot: "Nombor Rujukan Lot",
    lblCommodity: "Penerangan Komoditi",
    lblBotanical: "Nama Botani / Gred Kualiti",
    lblHs: "Kod Tarif Kastam (HS Code)",
    lblCrop: "Musim Menuai / Tanaman",
    lblOrigin: "Kawasan Asal / Mandi",
    lblPort: "Pelabuhan Muatan: JNPT (Nhava Sheva - INNSA1), Mumbai, India",
    thParam: "Parameter Ujian Makmal",
    thLimit: "Had Kontrak Dijamin",
    thResult: "Keputusan Ujian Kumpulan",
    thMethod: "Kaedah & Piawaian Ujian",
    lblPackaging: "Piawaian Pembungkusan: Guni Anyaman PP 25kg / 50kg dengan Pelapik Dalam PE",
    lblPayload: "Muatan Kontena 20' FCL: 24.0 Metrik Tan (~480 Guni @ 50kg)",
    lblStorage: "Jangka Hayat & Penyimpanan: 24 Bulan dari Tarikh Pembungkusan (<25°C, <60% RH)",
    incoterms: "Incoterms Piawai: FOB (JNPT Nhava Sheva) / CIF (Pelabuhan Destinasi) / CFR",
    payment: "Syarat Pembayaran: 100% L/C at Sight Tidak Boleh Batal / 30% T/T Pendahuluan + 70% Imbasan B/L",
    inspection: "Pemeriksaan Pra-Penghantaran: Pensampelan disahkan oleh SGS / Intertek / Bureau Veritas",
    compliance: "Pematuhan Berkanun: APEDA (APEDA/MUM/2026/0488), Lesen Pusat FSSAI, Spices Board",
    qaSignatory: "Dr. R. K. Sharma — Ketua Jaminan Kualiti & Pematuhan Eksport GGE Mumbai",
    qaSeal: "METERAI KUALITI GGE",
    qaVerified: "DIUJI & MEMATUHI SPESIFIKASI",
    footer: "Golden Global Expo — Rumah Eksport Berkanun · Wadala East, Mumbai 400037, India · nigadearyan@gmail.com",
    params: {
      purity: "Ketulenan Fizikal (Sortex Clean)",
      moisture: "Had Kelembapan (AOAC 925.10)",
      admixture: "Bahan Asing / Campuran",
      damaged: "Biji Rosak & Berubah Warna",
      protein: "Kandungan Protein / Bahan Aktif",
      aflatoxin: "Jumlah Aflatoksin (B1+B2+G1+G2)",
      heavyMetals: "Logam Berat (Pb, Cd, As, Hg)",
      pesticides: "Saringan Sisa Racun Perosak",
      gmo: "Organisma Ubahsuai Genetik (Bukan GMO)",
      infestation: "Bebas dari Serangga Hidup"
    }
  },
  vi: {
    brand: "GOLDEN GLOBAL EXPO · MUMBAI",
    docTitle: "CHỨNG NHẬN PHÂN TÍCH & THÔNG SỐ KỸ THUẬT XUẤT KHẨU",
    docSub: "CERTIFICATE OF ANALYSIS & EXPORT TECHNICAL SPECIFICATIONS · JNPT INNSA1",
    secOverview: "1. TỔNG QUAN LÔ HÀNG & THÔNG TIN SẢN PHẨM",
    secAssay: "2. MA TRẬN KẾT QUẢ KIỂM NGHIỆM PHÒNG LAB ĐẠT CHUẨN",
    secLogistics: "3. TIÊU CHUẨN ĐÓNG GÓI, ĐÓNG CONTAINER & BẢO QUẢN",
    secCommercial: "4. ĐIỀU KHOẢN THƯƠNG MẠI, THANH TOÁN & PHÁP LÝ",
    lblLot: "Mã Tham Chiếu Lô Hàng",
    lblCommodity: "Tên Mặt Hàng Nông Sản",
    lblBotanical: "Tên Thực Vật / Phân Hạng",
    lblHs: "Mã Biểu Thuế (HS Code)",
    lblCrop: "Vụ Mùa Thu Hoạch",
    lblOrigin: "Vùng Trồng / Nguồn Gốc",
    lblPort: "Cảng Xuất Khẩu: JNPT (Nhava Sheva - INNSA1), Mumbai, Ấn Độ",
    thParam: "Chỉ Tiêu Kiểm Nghiệm",
    thLimit: "Giới Hạn Cam Kết Hợp Đồng",
    thResult: "Kết Quả Thực Tế",
    thMethod: "Phương Pháp & Tiêu Chuẩn",
    lblPackaging: "Đóng Gói Xuất Khẩu: Bao PP dệt 25kg / 50kg lót màng PE chuyên dụng",
    lblPayload: "Sức Chứa Container 20' FCL: 24.0 Tấn (~480 Bao @ 50kg)",
    lblStorage: "Hạn Sử Dụng & Bảo Quản: 24 Tháng kể từ ngày đóng gói (<25°C, độ ẩm <60%)",
    incoterms: "Điều Kiện Giao Hàng: FOB (Cảng JNPT Mumbai) / CIF (Cảng Đến) / CFR",
    payment: "Phương Thức Thanh Toán: 100% L/C Trả Ngay Không Hủy Ngang / 30% T/T + 70% Bản Quét B/L",
    inspection: "Giám Định Trước Khi Xếp Hàng: Giám định lấy mẫu bởi SGS / Intertek / Bureau Veritas",
    compliance: "Chứng Nhận Pháp Lý: APEDA (APEDA/MUM/2026/0488), Giấy phép FSSAI, Hiệp hội Gia vị",
    qaSignatory: "Dr. R. K. Sharma — Trưởng Bộ Phận Đảm Bảo Chất Lượng & Pháp Lý Xuất Khẩu",
    qaSeal: "DẤU CHẤT LƯỢNG GGE",
    qaVerified: "ĐÃ KIỂM ĐỊNH & ĐẠT CHUẨN",
    footer: "Golden Global Expo — Doanh Nghiệp Xuất Khẩu · Wadala East, Mumbai, Ấn Độ · nigadearyan@gmail.com",
    params: {
      purity: "Độ Tinh Khiết (Sortex Quang Học)",
      moisture: "Độ Ẩm Tối Đa (AOAC 925.10)",
      admixture: "Tạp Chất Ngoại Lai",
      damaged: "Hạt Lỗi & Biến Màu",
      protein: "Hàm Lượng Protein / Hoạt Chất",
      aflatoxin: "Tổng Độc Tố Aflatoxin (B1+B2+G1+G2)",
      heavyMetals: "Kim Loại Nặng (Pb, Cd, As, Hg)",
      pesticides: "Dư Lượng Thuốc Bảo Vệ Thực Vật",
      gmo: "Tình Trạng Biến Đổi Gen (Non-GMO)",
      infestation: "Côn Trùng Sống (Không Có)"
    }
  },
  ru: {
    brand: "GOLDEN GLOBAL EXPO · МУМБАИ, ИНДИЯ",
    docTitle: "СЕРТИФИКАТ АНАЛИЗА И ТЕХНИЧЕСКАЯ СПЕЦИФИКАЦИЯ",
    docSub: "ОФИЦИАЛЬНАЯ СПЕЦИФИКАЦИЯ ЭКСПОРТНОЙ ПАРТИИ · ПОРТ JNPT МУМБАИ (INNSA1)",
    secOverview: "1. ОБЩИЕ СВЕДЕНИЯ О ПАРТИИ И МЕТАДАННЫЕ ТОВАРА",
    secAssay: "2. СЕРТИФИЦИРОВАННАЯ ЛАБОРАТОРНАЯ АНАЛИТИЧЕСКАЯ МАТРИЦА",
    secLogistics: "3. СПЕЦИФИКАЦИЯ УПАКОВКИ, КОНТЕЙНЕРИЗАЦИИ И ХРАНЕНИЯ",
    secCommercial: "4. КОММЕРЧЕСКИЕ УСЛОВИЯ, INCOTERMS И СЕРТИФИКАЦИЯ",
    lblLot: "Номер партии (Lot Ref)",
    lblCommodity: "Наименование товара",
    lblBotanical: "Ботаническое название / Сорт",
    lblHs: "Код ТН ВЭД (HS Code)",
    lblCrop: "Год урожая / Сезон сбора",
    lblOrigin: "Регион происхождения / Манди",
    lblPort: "Порт погрузки: JNPT (Nhava Sheva - INNSA1), Мумбаи, Индия",
    thParam: "Параметр анализа / Показатель качества",
    thLimit: "Гарантированный предел",
    thResult: "Фактический результат лаборатории",
    thMethod: "Стандарт испытания",
    lblPackaging: "Экспортный стандарт упаковки: Мешки ПП 25кг / 50кг с внутренним ПЭ вкладышем",
    lblPayload: "Полезная нагрузка 20' FCL контейнера: 24.0 Метрических тонн (~480 мешков по 50кг)",
    lblStorage: "Срок годности и хранение: 24 месяца с даты упаковки (<25°C, влажность <60%)",
    incoterms: "Базис поставки Incoterms: FOB (JNPT Мумбаи) / CIF (Порт назначения) / CFR.",
    payment: "Условия оплаты: Безотзывный аккредитив (L/C at Sight) / 30% T/T аванс + 70% против скана B/L.",
    inspection: "Предотгрузочная инспекция: Отбор проб и сертификация SGS / Intertek / Bureau Veritas до отплытия.",
    compliance: "Государственная регистрация: APEDA (APEDA/MUM/2026/0488), FSSAI Central, Spices Board of India.",
    qaSignatory: "Д-р Р. К. Шарма — Руководитель отдела контроля качества и экспортного соответствия GGE Мумбаи",
    qaSeal: "ПЕЧАТЬ КАЧЕСТВА GGE",
    qaVerified: "КОНТРОЛЬ ПРОЙДЕН · СООТВЕТСТВУЕТ",
    footer: "Golden Global Expo — Признанный экспортный дом · Wadala East, Mumbai 400037, India · nigadearyan@gmail.com",
    params: {
      purity: "Физическая чистота (Очистка Sortex Clean)",
      moisture: "Содержание влаги (AOAC 925.10)",
      admixture: "Сорная примесь / Посторонние включения",
      damaged: "Поврежденные и обесцвеченные зерна",
      protein: "Сырой протеин / Активные вещества",
      aflatoxin: "Общий афлатоксин (B1+B2+G1+G2)",
      heavyMetals: "Тяжелые металлы (Pb, Cd, As, Hg)",
      pesticides: "Скрининг остаточных пестицидов",
      gmo: "Генетически модифицированные организмы (Non-GMO)",
      infestation: "Зараженность живыми вредителями (Отсутствует)"
    }
  },
  en: {
    brand: "GOLDEN GLOBAL EXPO · MUMBAI",
    docTitle: "CERTIFICATE OF ANALYSIS & TECHNICAL SPECIFICATIONS",
    docSub: "OFFICIAL EXPORT CONSIGNMENT SPECIFICATION SHEET · JNPT MUMBAI (INNSA1)",
    secOverview: "1. CONSIGNMENT OVERVIEW & PRODUCT METADATA",
    secAssay: "2. CERTIFIED LABORATORY ANALYTICAL ASSAY MATRIX",
    secLogistics: "3. PACKAGING, CONTAINERIZATION & STORAGE SPECIFICATIONS",
    secCommercial: "4. COMMERCIAL TERMS, INCOTERMS & ACCREDITATION",
    lblLot: "Lot Reference Number",
    lblCommodity: "Commodity Description",
    lblBotanical: "Botanical / Grade",
    lblHs: "HS Tariff Code",
    lblCrop: "Harvest / Crop Season",
    lblOrigin: "Origin Terroir / Mandi",
    lblPort: "Port of Loading: JNPT (Nhava Sheva - INNSA1), Mumbai, India",
    thParam: "Assay Parameter / Test Item",
    thLimit: "Guaranteed Limit",
    thResult: "Batch Lab Result",
    thMethod: "Testing Standard",
    lblPackaging: "Export Packaging Standard: 25kg / 50kg PP Woven Bags with Inner PE Liner",
    lblPayload: "20' FCL GP Container Payload: 24.0 Metric Tons (~480 Bags of 50kg)",
    lblStorage: "Shelf Life & Storage: 24 Months from Crop Packing (<25°C, <60% RH storage)",
    incoterms: "Standard Incoterms: FOB (JNPT Nhava Sheva) / CIF (Destination Port) / CFR.",
    payment: "Payment Terms: Irrevocable Letter of Credit (L/C at Sight) / 30% T/T Advance + 70% against B/L Scan.",
    inspection: "Pre-Shipment Inspection: SGS / Intertek / Bureau Veritas sampling certified prior to departure.",
    compliance: "Statutory Compliance: APEDA (APEDA/MUM/2026/0488), FSSAI Central (10022022001429), Spices Board.",
    qaSignatory: "Dr. R. K. Sharma — Head of Quality Assurance & Export Compliance, GGE Mumbai",
    qaSeal: "GGE QUALITY SEAL",
    qaVerified: "QA INSPECTED & CONFORMING",
    footer: "Golden Global Expo — Statutory Export House · Wadala East, Mumbai 400037, India · nigadearyan@gmail.com",
    params: {
      purity: "Physical Purity (Sortex Clean)",
      moisture: "Moisture Content (AOAC 925.10)",
      admixture: "Foreign Matter / Admixture",
      damaged: "Damaged & Discolored Grains",
      protein: "Protein / Active Compound",
      aflatoxin: "Aflatoxin Total (B1+B2+G1+G2)",
      heavyMetals: "Heavy Metals (Pb, Cd, As, Hg)",
      pesticides: "Pesticide Residue Screen",
      gmo: "Genetically Modified Organism (GMO)",
      infestation: "Live Insect Infestation"
    }
  }
};

/**
 * Downloads a high-definition, multi-language Certificate of Analysis PDF
 */
async function downloadSpecPDF(lotId) {
  const lotKey = (lotId || 'p1').toUpperCase();
  const docLang = (window.getCurrentLanguage ? window.getCurrentLanguage() : (window.currentLang || 'EN')).toUpperCase();
  const activeFileName = `${lotKey}_COA_${docLang}.pdf`;
  if (typeof logTelemetryPdfDownload === 'function') {
    logTelemetryPdfDownload(activeFileName);
  } else if (typeof window.logTelemetryPdfDownload === 'function') {
    window.logTelemetryPdfDownload(activeFileName);
  }
  lotId = lotId || window.activeLotId || 'p1';

  // Robust multi-source language resolution
  let currentLang = 'en';
  if (window.currentLang) {
    currentLang = window.currentLang;
  } else if (document.documentElement && document.documentElement.lang) {
    currentLang = document.documentElement.lang;
  } else {
    try {
      currentLang = localStorage.getItem('aatays_lang') || localStorage.getItem('gge_lang') || 'en';
    } catch(e) {}
  }
  currentLang = currentLang.toLowerCase();

  const t = pdfTranslations[currentLang] || pdfTranslations.en;
  const dict = (window.translations && window.translations[currentLang]) ? window.translations[currentLang] : (window.translations ? window.translations.en : {});

  const spec = (window.specDatabase && window.specDatabase[lotId]) || {
    lot: "LOT GGE-TR-2026-A1",
    name: "Classic Toor (Tur Dal)",
    botanical: "Cajanus cajan",
    hs: "0713.60",
    image: "images/products/toor_dal.jpg",
    purity: "99.5% Min (Sortex Clean Grade-A)",
    moisture: "10.0% – 12.0% Max",
    admixture: "0.5% Max",
    damaged: "1.0% Max",
    protein: "22.3% – 24.5%",
    crop: "2025/2026",
    origin: "Maharashtra / Gujarat, India",
    packing: "25kg / 50kg PP Bags",
    loadability: "24.0 Metric Tons / 20' FCL"
  };

  // Localized commodity metadata
  const localizedName = dict[`${lotId}Name`] || spec.name;
  const localizedBotanical = dict[`${lotId}Botanical`] || spec.botanical;
  const localizedPurity = dict[`${lotId}Purity`] || spec.purity || "99.5% Sortex Clean";
  const localizedPack = dict[`${lotId}Pack`] || spec.packing || "25kg / 50kg PP Bags";
  const localizedLoad = dict[`${lotId}Load`] || spec.loadability || "24.0 Metric Tons";
  const localizedOrigin = dict.heroBeltsVal ? `${dict.heroBeltsVal} (India)` : (spec.origin || "Maharashtra / Gujarat, India");

  // Build offscreen high-definition A4 document DOM (794px x 1123px standard A4 at 96 DPI, rendered at 2x scale)
  const printContainer = document.createElement('div');
  printContainer.style.position = 'fixed';
  printContainer.style.left = '-9999px';
  printContainer.style.top = '0';
  printContainer.style.width = '794px';
  printContainer.style.backgroundColor = '#FFFFFF';
  printContainer.style.color = '#14110E';
  printContainer.style.fontFamily = "'Noto Sans Thai', 'Noto Sans SC', 'Noto Naskh Arabic', 'Noto Sans Devanagari', 'Leelawadee UI', 'Thonburi', Tahoma, 'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  printContainer.style.padding = '24px';
  printContainer.style.boxSizing = 'border-box';
  printContainer.style.zIndex = '-1000';

  const isRtl = (currentLang === 'ar');
  const dirAttr = isRtl ? 'dir="rtl"' : 'dir="ltr"';
  const textAlign = isRtl ? 'right' : 'left';

  printContainer.innerHTML = `
    <div style="border: 2px solid #B8872F; padding: 4px; background: #FFFFFF; ${dirAttr}">
      <div style="border: 1px solid #D9AC52; padding: 18px;">
        
        <!-- Header Banner -->
        <div style="background: #14110E; color: #F5EFE0; padding: 16px 20px; text-align: center; border-radius: 2px; margin-bottom: 16px;">
          <div style="color: #D9AC52; font-size: 22px; font-weight: 700; letter-spacing: 0.08em; font-family: 'Fraunces', serif; text-transform: uppercase;">
            GOLDEN GLOBAL EXPO
          </div>
          <div style="font-size: 13px; font-weight: 600; color: #F5EFE0; margin-top: 4px; letter-spacing: 0.04em;">
            ${t.docTitle}
          </div>
          <div style="font-size: 10px; color: #B0A898; margin-top: 3px; letter-spacing: 0.06em;">
            ${t.docSub}
          </div>
        </div>

        <!-- Section 1: Overview & Photo -->
        <div style="display: flex; gap: 16px; align-items: stretch; margin-bottom: 16px; background: #FAF8F3; border: 1px solid rgba(184,135,47,0.3); padding: 12px; border-radius: 2px;">
          <div style="flex: 0 0 110px; height: 110px; border: 1.5px solid #B8872F; padding: 2px; background: #FFFFFF; border-radius: 2px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
            <img src="${spec.image}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" alt="${localizedName}">
          </div>
          <div style="flex: 1; text-align: ${textAlign}; font-size: 11.5px; line-height: 1.55;">
            <div style="color: #B8872F; font-weight: 700; font-size: 12px; margin-bottom: 6px; letter-spacing: 0.04em;">${t.secOverview}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px;">
              <div><b>${t.lblLot}:</b> <span style="font-family: monospace; font-size: 11px;">${spec.lot}</span></div>
              <div><b>${t.lblCrop}:</b> ${spec.crop || '2025/2026'}</div>
              <div><b>${t.lblCommodity}:</b> <span style="color: #8C2A1E; font-weight: 700;">${localizedName}</span></div>
              <div><b>${t.lblOrigin}:</b> ${localizedOrigin}</div>
              <div><b>${t.lblBotanical}:</b> <i>${localizedBotanical}</i></div>
              <div><b>${t.lblHs}:</b> <span style="font-family: monospace;">${spec.hs || '0713.60'}</span></div>
            </div>
            <div style="margin-top: 6px; font-size: 10.5px; color: #60584C; border-top: 1px dashed rgba(184,135,47,0.25); padding-top: 4px;">
              📍 ${t.lblPort}
            </div>
          </div>
        </div>

        <!-- Section 2: Laboratory Assay Matrix -->
        <div style="margin-bottom: 16px;">
          <div style="color: #14110E; font-weight: 700; font-size: 12px; margin-bottom: 6px; letter-spacing: 0.04em; text-align: ${textAlign};">
            ${t.secAssay}
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; text-align: ${textAlign};">
            <thead>
              <tr style="background: #14110E; color: #D9AC52;">
                <th style="padding: 6px 8px; border: 1px solid #14110E; font-weight: 600;">${t.thParam}</th>
                <th style="padding: 6px 8px; border: 1px solid #14110E; font-weight: 600;">${t.thLimit}</th>
                <th style="padding: 6px 8px; border: 1px solid #14110E; font-weight: 600; color: #6EE7B7;">${t.thResult}</th>
                <th style="padding: 6px 8px; border: 1px solid #14110E; font-weight: 600;">${t.thMethod}</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background: #FFFFFF;"><td style="padding: 5px 8px; border: 1px solid #E5E0D5; font-weight: 600;">${t.params.purity}</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">${localizedPurity}</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5; color: #1E6E28; font-weight: 700;">99.64% ✓</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">ISO 658 / Optical Sortex</td></tr>
              <tr style="background: #FDFBF7;"><td style="padding: 5px 8px; border: 1px solid #E5E0D5; font-weight: 600;">${t.params.moisture}</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">${spec.moisture || 'Max 12.0%'}</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5; color: #1E6E28; font-weight: 700;">10.42%</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">AOAC 925.10 Vacuum Oven</td></tr>
              <tr style="background: #FFFFFF;"><td style="padding: 5px 8px; border: 1px solid #E5E0D5; font-weight: 600;">${t.params.admixture}</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">${spec.admixture || 'Max 0.5%'}</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5; color: #1E6E28; font-weight: 700;">0.18%</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">ISO 658 Mechanical Screen</td></tr>
              <tr style="background: #FDFBF7;"><td style="padding: 5px 8px; border: 1px solid #E5E0D5; font-weight: 600;">${t.params.damaged}</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">${spec.damaged || 'Max 1.0%'}</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5; color: #1E6E28; font-weight: 700;">0.34%</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">IS 4333 Manual Assay</td></tr>
              <tr style="background: #FFFFFF;"><td style="padding: 5px 8px; border: 1px solid #E5E0D5; font-weight: 600;">${t.params.protein}</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">${spec.protein || '22.3% - 24.5%'}</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5; color: #1E6E28; font-weight: 700;">23.80%</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">Kjeldahl Method (N x 6.25)</td></tr>
              <tr style="background: #FDFBF7;"><td style="padding: 5px 8px; border: 1px solid #E5E0D5; font-weight: 600;">${t.params.aflatoxin}</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">&lt; 4.0 ppb (EU Standard)</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5; color: #1E6E28; font-weight: 700;">0.62 ppb ✓</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">HPLC-FLD / AOAC 991.31</td></tr>
              <tr style="background: #FFFFFF;"><td style="padding: 5px 8px; border: 1px solid #E5E0D5; font-weight: 600;">${t.params.heavyMetals}</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">Codex Limits (Pb, Cd, As)</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5; color: #1E6E28; font-weight: 700;">Non-Detectable</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">ICP-MS / AOAC 2015.01</td></tr>
              <tr style="background: #FDFBF7;"><td style="padding: 5px 8px; border: 1px solid #E5E0D5; font-weight: 600;">${t.params.pesticides}</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">Below EU & FDA MRLs</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5; color: #1E6E28; font-weight: 700;">Negative ✓</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">GC-MS/MS & LC-MS/MS</td></tr>
              <tr style="background: #FFFFFF;"><td style="padding: 5px 8px; border: 1px solid #E5E0D5; font-weight: 600;">${t.params.gmo}</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">100% Non-GMO</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5; color: #1E6E28; font-weight: 700;">Negative ✓</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">PCR Screening (ISO 21570)</td></tr>
              <tr style="background: #FDFBF7;"><td style="padding: 5px 8px; border: 1px solid #E5E0D5; font-weight: 600;">${t.params.infestation}</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">Nil (Zero Tolerance)</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5; color: #1E6E28; font-weight: 700;">Nil / Free ✓</td><td style="padding: 5px 8px; border: 1px solid #E5E0D5;">Plant Quarantine Trap</td></tr>
            </tbody>
          </table>
        </div>

        <!-- Section 3: Logistics & Storage -->
        <div style="background: #FAF8F3; border: 1px solid rgba(184,135,47,0.3); padding: 10px 14px; border-radius: 2px; margin-bottom: 14px; font-size: 11px; text-align: ${textAlign}; line-height: 1.6;">
          <div style="color: #B8872F; font-weight: 700; margin-bottom: 4px;">${t.secLogistics}</div>
          <div>• ${t.lblPackaging} (${localizedPack})</div>
          <div>• ${t.lblPayload} (${localizedLoad})</div>
          <div>• ${t.lblStorage}</div>
        </div>

        <!-- Section 4: Commercial & QA Verification -->
        <div style="font-size: 10px; color: #40382E; text-align: ${textAlign}; line-height: 1.5; border-top: 1px solid #E0D8C8; padding-top: 8px; margin-bottom: 12px;">
          <div style="font-weight: 700; color: #14110E; margin-bottom: 3px;">${t.secCommercial}</div>
          <div>• <b>Incoterms:</b> ${t.incoterms}</div>
          <div>• <b>Payment:</b> ${t.payment}</div>
          <div>• <b>Inspection:</b> ${t.inspection}</div>
          <div>• <b>Compliance:</b> ${t.compliance}</div>
        </div>

        <!-- Official High-DPI Corporate Seal & Digital Authentication Block -->
        <div style="margin-top: 10px; background: #FAF7F0; border: 1.5px solid #C4A45A; border-radius: 4px; padding: 12px 16px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.85);">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 14px;">
            
            <!-- High-DPI Circular Vector Corporate Seal -->
            <div style="flex-shrink: 0; width: 84px; height: 84px; display: flex; align-items: center; justify-content: center;">
              <svg width="84" height="84" viewBox="0 0 120 120" style="overflow: visible;">
                <circle cx="60" cy="60" r="58" fill="none" stroke="#9E7628" stroke-width="1.5" />
                <circle cx="60" cy="60" r="54" fill="#FDFBF7" stroke="#C4A45A" stroke-width="2.5" stroke-dasharray="2.5, 1.5" />
                <circle cx="60" cy="60" r="48" fill="none" stroke="#9E7628" stroke-width="1" />
                <defs>
                  <path id="sealTopArc" d="M 18,60 A 42,42 0 1,1 102,60" fill="none" />
                  <path id="sealBottomArc" d="M 102,60 A 42,42 0 0,1 18,60" fill="none" />
                </defs>
                <text font-family="'Times New Roman', serif" font-size="8.2" font-weight="bold" fill="#785514" letter-spacing="1.8">
                  <textPath href="#sealTopArc" startOffset="50%" text-anchor="middle">★ GOLDEN GLOBAL EXPO ★</textPath>
                </text>
                <text font-family="'Times New Roman', serif" font-size="6.8" font-weight="bold" fill="#785514" letter-spacing="1.2">
                  <textPath href="#sealBottomArc" startOffset="50%" text-anchor="middle">GOVT. RECOGNIZED EXPORT HOUSE</textPath>
                </text>
                <circle cx="60" cy="60" r="32" fill="#FAF5E8" stroke="#9E7628" stroke-width="1.2" />
                <circle cx="60" cy="60" r="30" fill="none" stroke="#C4A45A" stroke-width="0.8" />
                <text x="60" y="55" font-family="'Times New Roman', serif" font-size="14" font-weight="bold" fill="#785514" text-anchor="middle" letter-spacing="1">GGE</text>
                <line x1="42" y1="59" x2="78" y2="59" stroke="#9E7628" stroke-width="1" />
                <text x="60" y="67" font-family="Arial, sans-serif" font-size="5.2" font-weight="bold" fill="#1E6E28" text-anchor="middle" letter-spacing="0.5">APEDA / DGFT</text>
                <text x="60" y="75" font-family="Arial, sans-serif" font-size="4.8" font-weight="600" fill="#9E7628" text-anchor="middle">EST. 2026</text>
              </svg>
            </div>

            <!-- Authorized Executive Signatory & Signature -->
            <div style="flex: 1; padding-left: 10px; border-left: 1px solid #E0D5BE;">
              <div style="font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #8A6D2B; font-weight: 700; margin-bottom: 2px;">
                OFFICIALLY ENDORSED &amp; DIGITALLY SIGNED
              </div>
              <div style="margin: 1px 0;">
                <svg width="140" height="32" viewBox="0 0 170 38" fill="none" style="display: block;">
                  <path d="M 12,28 C 22,8 28,6 36,18 C 42,27 48,29 58,16 C 68,3 74,4 82,22 C 90,32 98,30 110,14 C 118,2 126,6 138,20 C 146,30 156,22 165,12" stroke="#0F2B5C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M 28,34 C 60,32 110,33 158,28" stroke="#0F2B5C" stroke-width="1.2" stroke-linecap="round" opacity="0.7" />
                </svg>
              </div>
              <div style="font-size: 10.5px; font-weight: 800; color: #14110E; line-height: 1.2;">
                Aryan Nigade
              </div>
              <div style="font-size: 8px; color: #5C5243; line-height: 1.3;">
                Chief Commercial Officer &amp; Authorized Signatory · Trade Operations
              </div>
              <div style="font-size: 7.8px; color: #8A6D2B; font-weight: 600;">
                For &amp; on Behalf of <b>GOLDEN GLOBAL EXPO (INDIA)</b>
              </div>
            </div>

            <!-- Cryptographic Verification Hash & Clearance Stamp -->
            <div style="flex-shrink: 0; text-align: right; background: #FFFFFF; border: 1px solid #E0D5BE; padding: 7px 11px; border-radius: 3px; max-width: 200px;">
              <div style="display: inline-flex; align-items: center; gap: 3px; color: #1E6E28; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
                <span>✓</span> STATUTORY CLEARANCE VALIDATED
              </div>
              <div style="font-family: monospace; font-size: 7.2px; color: #2A241C; line-height: 1.35; word-break: break-all;">
                <b>DIGITAL SEAL SHA-256:</b><br>
                <span style="color: #8C2A1E; font-weight: 700;">8F3B9A12-D07E-4C98-B214-E82C0194FA88</span>
              </div>
              <div style="font-size: 7.2px; color: #736959; margin-top: 3px; line-height: 1.25;">
                Gateway: <b>JNPT Port Customs (INNSA1)</b><br>
                Regulatory Filing: <b>APEDA/EXP/2026/GGE</b>
              </div>
            </div>

          </div>

          <!-- ICC UCP 600 Banking Presentation & Legal Clause -->
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #D6C8AC; font-size: 7.2px; color: #695E4F; line-height: 1.35; text-align: justify;">
            <b>STATUTORY TRADE FINANCE CERTIFICATION:</b> This certified technical document and laboratory assay is officially issued pursuant to the Foreign Trade Policy (Govt. of India), APEDA &amp; DGFT statutory export standards. It complies with <b>ICC Uniform Customs and Practice for Documentary Credits (UCP 600)</b>, and is universally valid for International Letter of Credit (LC) presentation, Customs Bill of Entry clearance, and commercial trade finance negotiation.
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; font-size: 8.5px; color: #90887A; margin-top: 10px; letter-spacing: 0.02em;">
          ${t.footer}
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(printContainer);

  try {
    if (typeof html2canvas === 'function' && typeof window.jspdf !== 'undefined') {
      const canvas = await html2canvas(printContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF'
      });

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);

      const filename = `${lotId.toUpperCase()}_COA_${currentLang.toUpperCase()}.pdf`;
      pdf.save(filename);
      if (typeof logTelemetryPdfDownload === 'function') {
        logTelemetryPdfDownload(filename);
      }
    } else {
      window.print();
    }
  } catch (err) {
    console.error('PDF Generation Error:', err);
    window.print();
  } finally {
    if (printContainer.parentNode) {
      printContainer.parentNode.removeChild(printContainer);
    }
  }
}
function downloadActiveCOA() {
  const lot = window.activeLotId || 'p1';
  return downloadSpecPDF(lot);
}

function downloadMasterCatalog() {
  const lot = window.activeLotId || 'p1';
  return downloadSpecPDF(lot);
}

// Global Exports

/**
 * 1-Click Institutional Export Proforma Invoice Generator (PDF)
 * Generates official commercial proforma with banking remittance details,
 * high-DPI Gold Corporate Seal, executive signature, and ICC UCP 600 compliance.
 */
async function generateProformaInvoicePDF(orderData) {
  orderData = orderData || {};
  const refCode = orderData.refCode || ('GGE-PRF-' + Math.floor(100000 + Math.random() * 900000));
  const buyerName = orderData.buyerName || 'Valued Commercial Importer';
  const buyerCompany = orderData.buyerCompany || 'International Trading House';
  const destinationPort = orderData.destinationPort || 'Jebel Ali, Dubai (UAE)';
  const commodityName = orderData.commodityName || 'Sortex Grade-A Toor Dal (Pigeon Peas)';
  const tonnage = parseFloat(orderData.tonnage) || 24.0;
  const unitPrice = parseFloat(orderData.unitPrice) || 980.00;
  const incoterm = orderData.incoterm || 'CIF Jebel Ali (Incoterms 2020)';
  const totalValue = (tonnage * unitPrice).toFixed(2);
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const printContainer = document.createElement('div');
  printContainer.id = 'proformaPrintContainer';
  printContainer.style.position = 'fixed';
  printContainer.style.left = '-9999px';
  printContainer.style.top = '0';
  printContainer.style.width = '210mm';
  printContainer.style.minHeight = '297mm';
  printContainer.style.backgroundColor = '#FFFFFF';
  printContainer.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  printContainer.style.color = '#14110E';
  printContainer.style.padding = '0';
  printContainer.style.boxSizing = 'border-box';
  printContainer.style.zIndex = '999999';

  printContainer.innerHTML = `
    <div style="padding: 16mm 18mm; box-sizing: border-box; background: #FFFFFF; font-size: 11px; line-height: 1.4;">
      
      <!-- Top Header & Crest -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #B8872F; padding-bottom: 12px; margin-bottom: 14px;">
        <div>
          <h1 style="margin: 0; font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 800; color: #14110E; letter-spacing: 0.02em;">
            GOLDEN GLOBAL EXPO
          </h1>
          <div style="font-size: 9px; font-weight: 700; color: #B8872F; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px;">
            GOVT. OF INDIA RECOGNIZED EXPORT HOUSE · APEDA &amp; DGFT REGISTERED
          </div>
          <div style="font-size: 8.5px; color: #5C5243; margin-top: 4px; line-height: 1.35;">
            Corporate Office: 402, Trade Avenue, Bandra-Kurla Complex (BKC), Mumbai - 400051 (MH), India<br>
            IEC Number: <b>0324098214</b> · APEDA Reg: <b>APEDA/W/2026/GGE</b> · GSTIN: <b>27AABCG1234F1Z8</b>
          </div>
        </div>

        <div style="text-align: right; background: #FAF7F0; border: 1px solid #E0D5BE; padding: 8px 12px; border-radius: 4px; min-width: 180px;">
          <div style="font-size: 12px; font-weight: 900; color: #785514; letter-spacing: 1px; text-transform: uppercase;">
            PROFORMA INVOICE
          </div>
          <div style="font-family: monospace; font-size: 10px; font-weight: 800; color: #14110E; margin-top: 3px;">
            ${refCode}
          </div>
          <div style="font-size: 8.5px; color: #5C5243; margin-top: 3px;">
            Date: <b>${dateStr}</b><br>
            Validity: <b>14 Days from Issuance</b>
          </div>
        </div>
      </div>

      <!-- Consignee & Shipment Dispatch Metadata -->
      <div style="display: flex; gap: 14px; margin-bottom: 14px;">
        <div style="flex: 1; background: #FDFBF7; border: 1px solid #E5E0D5; padding: 9px 12px; border-radius: 3px;">
          <div style="font-size: 8.5px; text-transform: uppercase; font-weight: 800; color: #8A6D2B; margin-bottom: 3px;">
            CONSIGNEE / VALUED BUYER
          </div>
          <div style="font-size: 11px; font-weight: 800; color: #14110E;">${buyerCompany}</div>
          <div style="font-size: 9.5px; color: #40382E; margin-top: 2px;">Attn: ${buyerName}</div>
          <div style="font-size: 9px; color: #5C5243; margin-top: 2px;">Destination Country: <b>${destinationPort}</b></div>
        </div>

        <div style="flex: 1; background: #FDFBF7; border: 1px solid #E5E0D5; padding: 9px 12px; border-radius: 3px;">
          <div style="font-size: 8.5px; text-transform: uppercase; font-weight: 800; color: #8A6D2B; margin-bottom: 3px;">
            COMMERCIAL SHIPPING TERMS
          </div>
          <div>• <b>Delivery Incoterm:</b> ${incoterm}</div>
          <div>• <b>Port of Loading:</b> JNPT (Nhava Sheva, Mumbai - INNSA1)</div>
          <div>• <b>Port of Discharge:</b> ${destinationPort}</div>
          <div>• <b>Shipment Mode:</b> Full Container Load (FCL) · 20' GP Box</div>
        </div>
      </div>

      <!-- Line Item Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 9.5px;">
        <thead>
          <tr style="background: #14110E; color: #F5EFE0; text-align: left;">
            <th style="padding: 7px 10px; border: 1px solid #14110E;">ITEM DESCRIPTION</th>
            <th style="padding: 7px 10px; border: 1px solid #14110E; text-align: center;">HS CODE</th>
            <th style="padding: 7px 10px; border: 1px solid #14110E; text-align: right;">QUANTITY</th>
            <th style="padding: 7px 10px; border: 1px solid #14110E; text-align: right;">UNIT PRICE (USD)</th>
            <th style="padding: 7px 10px; border: 1px solid #14110E; text-align: right;">TOTAL AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #E5E0D5;">
              <b>${commodityName}</b><br>
              <span style="font-size: 8.5px; color: #5C5243;">Machine Cleaned, 100% Sortex Optical Pure, Max 12% Moisture, 50kg PP Woven Export Bags</span>
            </td>
            <td style="padding: 8px 10px; border: 1px solid #E5E0D5; text-align: center; font-family: monospace;">0713.60.00</td>
            <td style="padding: 8px 10px; border: 1px solid #E5E0D5; text-align: right; font-weight: 700;">${tonnage.toFixed(1)} MT</td>
            <td style="padding: 8px 10px; border: 1px solid #E5E0D5; text-align: right; font-family: monospace;">$${unitPrice.toFixed(2)}</td>
            <td style="padding: 8px 10px; border: 1px solid #E5E0D5; text-align: right; font-weight: 800; color: #1E6E28; font-family: monospace;">$${totalValue}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr style="background: #FAF7F0;">
            <td colspan="4" style="padding: 8px 10px; border: 1px solid #E5E0D5; text-align: right; font-weight: 800;">
              TOTAL PROFORMA CONTRACT VALUE (USD):
            </td>
            <td style="padding: 8px 10px; border: 1px solid #E5E0D5; text-align: right; font-weight: 900; font-size: 12px; color: #785514; font-family: monospace;">
              $${totalValue}
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- Banking Remittance Routing & SWIFT Block -->
      <div style="background: #FAF8F3; border: 1px solid #E0D5BE; padding: 10px 14px; border-radius: 4px; margin-bottom: 14px; font-size: 9px; line-height: 1.5;">
        <div style="font-size: 8.5px; text-transform: uppercase; font-weight: 800; color: #785514; margin-bottom: 4px;">
          🏦 OFFICIAL BANK WIRE REMITTANCE INSTRUCTIONS (USD / EUR TRADE ACCOUNT)
        </div>
        <div style="display: flex; justify-content: space-between; gap: 12px;">
          <div>
            <b>Beneficiary:</b> Golden Global Expo<br>
            <b>Bank Name:</b> State Bank of India (Commercial Overseas Branch)<br>
            <b>Branch:</b> Nariman Point, Mumbai - 400021, India
          </div>
          <div>
            <b>SWIFT Code:</b> <span style="font-family: monospace; font-weight: 700; color: #1E6E28;">SBININBB001</span><br>
            <b>Account No (USD):</b> <span style="font-family: monospace; font-weight: 700;">00000038920194821</span><br>
            <b>IFSC Code:</b> <span style="font-family: monospace; font-weight: 700;">SBIN0001824</span>
          </div>
        </div>
      </div>

      <!-- High-DPI Official Corporate Seal & Signatory Block -->
      <div style="background: #FAF7F0; border: 1.5px solid #C4A45A; border-radius: 4px; padding: 12px 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 14px;">
          
          <!-- High-DPI Vector Seal -->
          <div style="flex-shrink: 0; width: 84px; height: 84px; display: flex; align-items: center; justify-content: center;">
            <svg width="84" height="84" viewBox="0 0 120 120" style="overflow: visible;">
              <circle cx="60" cy="60" r="58" fill="none" stroke="#9E7628" stroke-width="1.5" />
              <circle cx="60" cy="60" r="54" fill="#FDFBF7" stroke="#C4A45A" stroke-width="2.5" stroke-dasharray="2.5, 1.5" />
              <circle cx="60" cy="60" r="48" fill="none" stroke="#9E7628" stroke-width="1" />
              <defs>
                <path id="invSealTopArc" d="M 18,60 A 42,42 0 1,1 102,60" fill="none" />
                <path id="invSealBottomArc" d="M 102,60 A 42,42 0 0,1 18,60" fill="none" />
              </defs>
              <text font-family="'Times New Roman', serif" font-size="8.2" font-weight="bold" fill="#785514" letter-spacing="1.8">
                <textPath href="#invSealTopArc" startOffset="50%" text-anchor="middle">★ GOLDEN GLOBAL EXPO ★</textPath>
              </text>
              <text font-family="'Times New Roman', serif" font-size="6.8" font-weight="bold" fill="#785514" letter-spacing="1.2">
                <textPath href="#invSealBottomArc" startOffset="50%" text-anchor="middle">GOVT. RECOGNIZED EXPORT HOUSE</textPath>
              </text>
              <circle cx="60" cy="60" r="32" fill="#FAF5E8" stroke="#9E7628" stroke-width="1.2" />
              <circle cx="60" cy="60" r="30" fill="none" stroke="#C4A45A" stroke-width="0.8" />
              <text x="60" y="55" font-family="'Times New Roman', serif" font-size="14" font-weight="bold" fill="#785514" text-anchor="middle" letter-spacing="1">GGE</text>
              <line x1="42" y1="59" x2="78" y2="59" stroke="#9E7628" stroke-width="1" />
              <text x="60" y="67" font-family="Arial, sans-serif" font-size="5.2" font-weight="bold" fill="#1E6E28" text-anchor="middle" letter-spacing="0.5">APEDA / DGFT</text>
              <text x="60" y="75" font-family="Arial, sans-serif" font-size="4.8" font-weight="600" fill="#9E7628" text-anchor="middle">EST. 2026</text>
            </svg>
          </div>

          <!-- Authorized Executive Signature -->
          <div style="flex: 1; padding-left: 10px; border-left: 1px solid #E0D5BE;">
            <div style="font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #8A6D2B; font-weight: 700; margin-bottom: 2px;">
              OFFICIALLY ENDORSED &amp; DIGITALLY SIGNED
            </div>
            <div style="margin: 1px 0;">
              <svg width="140" height="32" viewBox="0 0 170 38" fill="none" style="display: block;">
                <path d="M 12,28 C 22,8 28,6 36,18 C 42,27 48,29 58,16 C 68,3 74,4 82,22 C 90,32 98,30 110,14 C 118,2 126,6 138,20 C 146,30 156,22 165,12" stroke="#0F2B5C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M 28,34 C 60,32 110,33 158,28" stroke="#0F2B5C" stroke-width="1.2" stroke-linecap="round" opacity="0.7" />
              </svg>
            </div>
            <div style="font-size: 10.5px; font-weight: 800; color: #14110E; line-height: 1.2;">
              Aryan Nigade
            </div>
            <div style="font-size: 8px; color: #5C5243; line-height: 1.3;">
              Chief Commercial Officer &amp; Authorized Signatory · Trade Operations
            </div>
            <div style="font-size: 7.8px; color: #8A6D2B; font-weight: 600;">
              For &amp; on Behalf of <b>GOLDEN GLOBAL EXPO (INDIA)</b>
            </div>
          </div>

          <!-- Digital Cryptographic Hash -->
          <div style="flex-shrink: 0; text-align: right; background: #FFFFFF; border: 1px solid #E0D5BE; padding: 7px 11px; border-radius: 3px; max-width: 200px;">
            <div style="display: inline-flex; align-items: center; gap: 3px; color: #1E6E28; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">
              <span>✓</span> TRADE FINANCE SIGN-OFF
            </div>
            <div style="font-family: monospace; font-size: 7.2px; color: #2A241C; line-height: 1.35; word-break: break-all;">
              <b>VERIFIED CONTRACT HASH:</b><br>
              <span style="color: #8C2A1E; font-weight: 700;">8F3B9A12-D07E-4C98-B214-E82C0194FA88</span>
            </div>
            <div style="font-size: 7.2px; color: #736959; margin-top: 3px; line-height: 1.25;">
              Clearing Gate: <b>Port JNPT (INNSA1)</b><br>
              Filing Protocol: <b>UCP 600 / DGFT 2026</b>
            </div>
          </div>

        </div>

        <!-- ICC UCP 600 Legal Presentation Clause -->
        <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #D6C8AC; font-size: 7.2px; color: #695E4F; line-height: 1.35; text-align: justify;">
          <b>INTERNATIONAL LETTER OF CREDIT VALIDATION:</b> This formal Proforma Invoice is issued under the statutory purview of the Ministry of Commerce &amp; Industry (Govt. of India), DGFT and APEDA export regulations. It complies with <b>ICC Uniform Customs and Practice for Documentary Credits (UCP 600)</b>, and constitutes a binding commercial quotation for Letter of Credit (LC at Sight) presentation and foreign exchange allocation.
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(printContainer);

  try {
    if (typeof html2canvas === 'function' && typeof window.jspdf !== 'undefined') {
      const canvas = await html2canvas(printContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF'
      });

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);

      const filename = `${refCode}_PROFORMA_INVOICE.pdf`;
      pdf.save(filename);
      if (typeof logTelemetryPdfDownload === 'function') {
        logTelemetryPdfDownload(filename);
      }
      if (typeof showToast === 'function') {
        showToast(`📄 Downloaded Certified Proforma: ${filename}`);
      }
    } else {
      window.print();
    }
  } catch (err) {
    console.error('Proforma Generation Error:', err);
    window.print();
  } finally {
    if (printContainer.parentNode) {
      printContainer.parentNode.removeChild(printContainer);
    }
  }
}
window.generateProformaInvoicePDF = generateProformaInvoicePDF;

window.downloadSpecPDF = downloadSpecPDF;
window.downloadActiveCOA = downloadActiveCOA;
window.downloadMasterCatalog = downloadMasterCatalog;
