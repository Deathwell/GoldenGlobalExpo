/**
 * Golden Global Expo — Commodity Specifications & Benchmark Pricing Matrix
 * Single source of truth for all product lots, laboratory assays, and baseline pricing.
 * Sourcing: Maharashtra & Karnataka | Capacity: Multi-Container FCL (24–26 MT) & LCL Private Label (from 300 kg).
 */

const specDatabase = {
  "p1": {
    "lot": "GGE-TR-2026-A1",
    "name": "Classic Toor (Tur Dal / Split Pigeon Pea)",
    "botanical": "Cajanus cajan",
    "category": "pulses",
    "image": "images/products/toor_dal.jpg?v=6",
    "hs": "0713.60",
    "origin": "Maharashtra / Karnataka (India)",
    "crop": "2025/2026 Crop (Peak Mandi Arrival: December – February)",
    "harvestSeason": "December to February (Kharif Harvest)",
    "purity": "99.5% Min (Sortex Clean Grade-A)",
    "moisture": "10.0% – 12.0% Max",
    "admixture": "0.5% Max",
    "damaged": "1.0% Max",
    "foreignMatter": "0.1% Max (Free from live weevils/stone)",
    "protein": "22.3% – 24.5% Dry Basis",
    "packing": "25kg / 50kg PP Woven Bags (Custom Private Label available)",
    "loadability": "20' FCL Load: 24.0 MT (240 Quintals) · LCL / Sample MOQ: 300 kg (3 Quintals)",
    "shelfLife": "24 Months from packaging in dry cool storage",
    "certifications": "APEDA Compliance, FSSAI Export Standards, Phytosanitary, Non-GMO",
    "inspection": "Pre-shipment inspection by SGS, Intertek, or Bureau Veritas supported at CFS Nhava Sheva (INNSA1)"
  },
  "p2": {
    "lot": "GGE-MN-2026-B2",
    "name": "Classic Moong (Whole Green Mung Bean)",
    "botanical": "Vigna radiata",
    "category": "pulses",
    "image": "images/products/moong_whole.jpg?v=5",
    "hs": "0713.31",
    "origin": "Maharashtra / Karnataka (India)",
    "crop": "2025/2026 Crop (Dual Harvest: Oct–Nov & Apr–May)",
    "harvestSeason": "October – November (Kharif) & April – May (Summer)",
    "purity": "99.5% Min (Machine Clean & Polished)",
    "moisture": "11.0% Max",
    "admixture": "0.5% Max",
    "damaged": "1.0% Max (Immature < 1%)",
    "foreignMatter": "0.2% Max",
    "protein": "24.0% – 25.5% Dry Basis",
    "packing": "25kg / 50kg PP Bags (Double Stitch / Jute Optional)",
    "loadability": "20' FCL Load: 24.0 MT (240 Quintals) · LCL / Sample MOQ: 300 kg (3 Quintals)",
    "shelfLife": "24 Months from packaging",
    "certifications": "APEDA Compliance, FSSAI Export Standards, Phytosanitary, Non-GMO",
    "inspection": "Pre-shipment inspection by SGS, Intertek, or Bureau Veritas supported at CFS Nhava Sheva (INNSA1)"
  },
  "p3": {
    "lot": "GGE-CH-2026-C3",
    "name": "Classic Chana Dal (Bengal Gram Split)",
    "botanical": "Cicer arietinum",
    "category": "pulses",
    "image": "images/products/chana_dal.jpg?v=6",
    "hs": "0713.20",
    "origin": "Maharashtra / Karnataka (India)",
    "crop": "2025/2026 Crop (Peak Mandi Arrival: February – April)",
    "harvestSeason": "February to April (Peak Rabi Harvest)",
    "purity": "99.7% Min (Sortex Clean / Unpolished)",
    "moisture": "10.5% Max",
    "admixture": "0.3% Max",
    "damaged": "0.8% Max",
    "foreignMatter": "0.05% Max",
    "protein": "20.8% – 22.0% Dry Basis",
    "packing": "25kg / 50kg PP Woven Bags with Liner",
    "loadability": "20' FCL Load: 24.0 MT (240 Quintals) · LCL / Sample MOQ: 300 kg (3 Quintals)",
    "shelfLife": "24 Months in dry ventilated warehouse",
    "certifications": "APEDA Compliance, FSSAI Export Standards, SGS Ready",
    "inspection": "Pre-shipment inspection by SGS, Intertek, or Bureau Veritas supported at CFS Nhava Sheva (INNSA1)"
  },
  "p4": {
    "lot": "GGE-MS-2026-D4",
    "name": "Classic Masoor (Split Red Lentils)",
    "botanical": "Lens culinaris",
    "category": "pulses",
    "image": "images/products/masoor_split.jpg?v=6",
    "hs": "0713.40",
    "origin": "Maharashtra / Karnataka (India)",
    "crop": "2025/2026 Crop (Peak Harvest: February – April)",
    "harvestSeason": "February to April (Rabi Harvest)",
    "purity": "99.5% Min (Sortex Clean Grade-A)",
    "moisture": "11.0% Max",
    "admixture": "0.5% Max",
    "damaged": "1.0% Max",
    "foreignMatter": "0.1% Max",
    "protein": "25.0% – 26.5% Dry Basis",
    "packing": "25kg / 50kg PP Woven Bags",
    "loadability": "20' FCL Load: 24.0 MT (240 Quintals) · LCL / Sample MOQ: 300 kg (3 Quintals)",
    "shelfLife": "24 Months from packaging",
    "certifications": "APEDA Compliance, FSSAI Export Standards, Phytosanitary, Non-GMO",
    "inspection": "Pre-shipment inspection by SGS, Intertek, or Bureau Veritas supported at CFS Nhava Sheva (INNSA1)"
  },
  "p5": {
    "lot": "GGE-CS-2026-E5",
    "name": "Chia Seeds (Raw Superfood 99.9% Purity)",
    "botanical": "Salvia hispanica L.",
    "category": "seeds",
    "image": "images/products/chia_seeds.jpg?v=6",
    "hs": "1207.99",
    "origin": "Maharashtra / Karnataka (India)",
    "crop": "2025/2026 Crop (Peak Harvest: February – April)",
    "harvestSeason": "February to April (Rabi Superfood Harvest)",
    "purity": "99.9% Min (Sortex Triple Clean)",
    "moisture": "7.0% Max (Ultra-Low Moisture)",
    "admixture": "0.1% Max (Free from dark weed seeds)",
    "damaged": "0.1% Max",
    "foreignMatter": "Nil / Zero Extraneous Matter",
    "protein": "18.5% – 21.0% (Omega-3: 60% of Lipid Content)",
    "packing": "25kg Multi-Wall Paper Bags / 1kg Vacuum Sealed Pouches",
    "loadability": "20' FCL Load: 24.0 MT (240 Quintals) · LCL / Sample MOQ: 300 kg (3 Quintals)",
    "shelfLife": "36 Months in vacuum sealed moisture barrier",
    "certifications": "FSSAI Standards, APEDA Compliance, ETO-Free, Gluten-Free",
    "inspection": "Pre-shipment inspection by SGS, Intertek, or Bureau Veritas supported at CFS Nhava Sheva (INNSA1)"
  },
  "p6": {
    "lot": "GGE-CR-2026-F6",
    "name": "Coriander Seeds (Dhania Whole)",
    "botanical": "Coriandrum sativum",
    "category": "seeds",
    "image": "images/products/coriander_seeds.jpg?v=5",
    "hs": "0909.21",
    "origin": "Maharashtra / Karnataka (India)",
    "crop": "2025/2026 Crop (Peak Harvest: February – April)",
    "harvestSeason": "February to April (Rabi Spice Harvest)",
    "purity": "99.0% Min (Eagle Quality Sortex Clean)",
    "moisture": "9.0% Max",
    "admixture": "1.0% Max",
    "damaged": "1.0% Max (Splits < 5%)",
    "foreignMatter": "0.2% Max",
    "protein": "Essential Volatile Oil: 0.3% – 0.5% Min",
    "packing": "25kg Jute Bags / PP Woven Bags",
    "loadability": "20' FCL Load: 24.0 MT (240 Quintals) · LCL / Sample MOQ: 300 kg (3 Quintals)",
    "shelfLife": "24 Months in cool aromatic storage",
    "certifications": "Spices Board India, FSSAI Standards, Phytosanitary",
    "inspection": "Pre-shipment inspection by SGS, Intertek, or Bureau Veritas supported at CFS Nhava Sheva (INNSA1)"
  },
  "p7": {
    "lot": "GGE-CM-2026-G7",
    "name": "Cumin Seeds (Jeera Whole Sortex Clean)",
    "botanical": "Cuminum cyminum",
    "category": "seeds",
    "image": "images/products/cumin_seeds.jpg?v=5",
    "hs": "0909.31",
    "origin": "Maharashtra / Karnataka (India)",
    "crop": "2025/2026 Crop (Peak Harvest: February – April)",
    "harvestSeason": "February to April (Peak Rabi Mandi Arrival)",
    "purity": "99.5% Min (Singapore / Europe Quality 1% Extraneous)",
    "moisture": "8.5% Max",
    "admixture": "0.5% Max",
    "damaged": "0.5% Max",
    "foreignMatter": "0.1% Max",
    "protein": "Volatile Oil: 2.5% – 3.0% Min",
    "packing": "25kg / 50kg PP Bags / Jute Bags",
    "loadability": "20' FCL Load: 24.0 MT (240 Quintals) · LCL / Sample MOQ: 300 kg (3 Quintals)",
    "shelfLife": "24 Months in cool dry warehouse",
    "certifications": "Spices Board India, APEDA, FSSAI, Non-GMO",
    "inspection": "Pre-shipment inspection by SGS, Intertek, or Bureau Veritas supported at CFS Nhava Sheva (INNSA1)"
  },
  "p8": {
    "lot": "GGE-MP-2026-H8",
    "name": "Moringa Leaf Powder (Organic Superfood)",
    "botanical": "Moringa oleifera Lam.",
    "category": "powders",
    "image": "images/products/moringa_powder.jpg?v=6",
    "hs": "1211.90",
    "origin": "Karnataka / Maharashtra (India)",
    "crop": "2025/2026 Multi-Harvest (Peak: Mar–May & Sep–Nov)",
    "harvestSeason": "March – May & September – November (Shadow-Dried)",
    "purity": "100% Pure Virgin Leaf (80–100 Micro Mesh)",
    "moisture": "6.0% Max",
    "admixture": "Nil (Free from stems/heavy metals)",
    "damaged": "Nil (Cold-Milled to preserve chlorophyll)",
    "foreignMatter": "Nil (Microbiological assay negative for E.coli/Salmonella)",
    "protein": "27.0% – 30.0% Bio-available Amino Acids",
    "packing": "25kg Fiber Drums with Food-Grade Inner Poly Liner",
    "loadability": "20' FCL Load: 24.0 MT (240 Quintals) · LCL / Sample MOQ: 300 kg (3 Quintals)",
    "shelfLife": "24 Months in light-blocking barrier containers",
    "certifications": "FSSAI Standards, Heavy Metal Lab Tested, Gamma-Free",
    "inspection": "Pre-shipment inspection by SGS, Intertek, or Bureau Veritas supported at CFS Nhava Sheva (INNSA1)"
  },
  "p9": {
    "lot": "GGE-MT-2026-I9",
    "name": "Mint Powder (Pudina Dehydrated Spray-Dried)",
    "botanical": "Mentha spicata",
    "category": "powders",
    "image": "images/products/mint_powder.jpg?v=5",
    "hs": "1211.90",
    "origin": "Maharashtra / Karnataka (India)",
    "crop": "2025/2026 Crop (Peak Harvest: May – July)",
    "harvestSeason": "May to July (Summer Shadow-Dried & Spray-Dried)",
    "purity": "100% Pure Natural Mint Leaf Powder",
    "moisture": "5.0% Max",
    "admixture": "Nil (Dehydrated under vacuum)",
    "damaged": "Nil",
    "foreignMatter": "Nil (Mesh size 80-100)",
    "protein": "Natural Menthol & Volatile Aroma preserved",
    "packing": "20kg / 25kg Poly-lined Cartons / Fiber Drums",
    "loadability": "20' FCL Load: 24.0 MT (240 Quintals) · LCL / Sample MOQ: 300 kg (3 Quintals)",
    "shelfLife": "24 Months in airtight packaging",
    "certifications": "FSSAI Export Standards, Phytosanitary, Non-GMO",
    "inspection": "Pre-shipment inspection by SGS, Intertek, or Bureau Veritas supported at CFS Nhava Sheva (INNSA1)"
  },
  "p10": {
    "lot": "GGE-CP-2026-J10",
    "name": "Coriander Powder (Dhania Powder)",
    "botanical": "Coriandrum sativum (Powder)",
    "category": "powders",
    "image": "images/products/coriander_powder.jpg?v=6",
    "hs": "0909.22",
    "origin": "Maharashtra / Karnataka (India)",
    "crop": "Milled Fresh On-Order from Certified Rabi Crop",
    "harvestSeason": "Continuous Year-Round On-Demand Milling",
    "purity": "100% Pure Ground Coriander (No starch/additives)",
    "moisture": "8.0% Max",
    "admixture": "Nil",
    "damaged": "Nil",
    "foreignMatter": "Nil (Cold ground to protect essential oils)",
    "protein": "Volatile Oil > 0.25%",
    "packing": "25kg PP Woven Bags / Food Grade Poly Liners",
    "loadability": "20' FCL Load: 24.0 MT (240 Quintals) · LCL / Sample MOQ: 300 kg (3 Quintals)",
    "shelfLife": "18 Months in sealed packaging",
    "certifications": "Spices Board India, FSSAI Export Standards",
    "inspection": "Pre-shipment inspection by SGS, Intertek, or Bureau Veritas supported at CFS Nhava Sheva (INNSA1)"
  },
  "p11": {
    "lot": "GGE-JW-2026-K11",
    "name": "Sorghum Grain (Jowar Whole Grain)",
    "botanical": "Sorghum bicolor",
    "category": "grains",
    "image": "images/products/jowar_grain.jpg?v=5",
    "hs": "1007.90",
    "origin": "Maharashtra / Karnataka (India)",
    "crop": "2025/2026 Crop (Peak Harvest: January – March)",
    "harvestSeason": "January to March (Maldandi Rabi Harvest)",
    "purity": "99.0% Min (Machine Cleaned / Sortex)",
    "moisture": "12.0% Max",
    "admixture": "1.0% Max",
    "damaged": "1.5% Max",
    "foreignMatter": "0.2% Max",
    "protein": "10.5% – 11.5% Dry Basis",
    "packing": "50kg PP Woven Bags",
    "loadability": "20' FCL Load: 24.0 MT (240 Quintals) · LCL / Sample MOQ: 300 kg (3 Quintals)",
    "shelfLife": "24 Months from harvest",
    "certifications": "APEDA Compliance, FSSAI Export Standards, COO",
    "inspection": "Pre-shipment inspection by SGS, Intertek, or Bureau Veritas supported at CFS Nhava Sheva (INNSA1)"
  },
  "p12": {
    "lot": "GGE-JF-2026-L12",
    "name": "Jowar Flour (Sorghum Flour / Gluten-Free)",
    "botanical": "Sorghum bicolor (Milled Flour)",
    "category": "grains",
    "image": "images/products/jowar_flour.jpg?v=5",
    "hs": "1102.90",
    "origin": "Maharashtra / Karnataka (India)",
    "crop": "Cold Stone-Milled Fresh On-Order from Certified Maldandi Rabi Crop",
    "harvestSeason": "Continuous Year-Round On-Demand Milling",
    "purity": "100% Pure Sorghum Flour (Gluten-Free Certified, Zero Additives)",
    "moisture": "10.0% Max",
    "admixture": "Nil (100% Sorghum Grain)",
    "damaged": "Mesh Size: 80–100 Fine Bakery/Roti Grade",
    "foreignMatter": "Nil (Cold-milled to protect natural dietary fibers & minerals)",
    "protein": "9.5% – 11.0% Dry Basis (High Fiber, Low GI)",
    "packing": "25kg / 50kg Multi-Wall Paper Bags / PP Woven with Liner",
    "loadability": "20' FCL Load: 22.0 MT (440 Bags) · LCL / Sample MOQ: 300 kg (3 Quintals)",
    "shelfLife": "12 Months from packaging in dry cool storage",
    "certifications": "APEDA Compliance, FSSAI Export Standards, Gluten-Free Tested, Non-GMO",
    "inspection": "Pre-shipment inspection by SGS, Intertek, or Bureau Veritas supported at CFS Nhava Sheva (INNSA1)"
  },
  "p13": {
    "lot": "GGE-TP-2026-M13",
    "name": "Tissue Paper (Virgin Wood Pulp Rolls)",
    "botanical": "100% Virgin Softwood/Hardwood Pulp",
    "category": "paper",
    "image": "images/products/tissue_paper.jpg?v=5",
    "hs": "4818.10",
    "origin": "Maharashtra (India)",
    "crop": "Industrial Manufacturing (10–14 Days Lead Time)",
    "harvestSeason": "Continuous Year-Round Industrial Production",
    "purity": "100% Virgin Wood Pulp (Elemental Chlorine Free)",
    "moisture": "5.0% – 7.0%",
    "admixture": "Zero Recycle Sludge / Non-Fluorescent",
    "damaged": "Grammage: 13.5 – 17.0 GSM (1-Ply / 2-Ply / 3-Ply)",
    "foreignMatter": "Brightness: 86% – 88% ISO",
    "protein": "Tensile Strength: MD > 1.8 N/m, CD > 0.8 N/m",
    "packing": "Palletized Jumbo Reels / Master Export Cartons",
    "loadability": "20' FCL Load: 24.0 MT (240 Quintals) · LCL / Sample MOQ: 300 kg (3 Quintals)",
    "shelfLife": "Indefinite under dry conditions",
    "certifications": "FSC Controlled Wood Standards, ISO 9001:2015, REACH Compliant",
    "inspection": "Pre-shipment inspection by SGS, Intertek, or Bureau Veritas supported at CFS Nhava Sheva (INNSA1)"
  },
  "p14": {
    "lot": "GGE-EW-2026-N14",
    "name": "Emmer Wheat (Khapli Wheat / Ancient Grain)",
    "botanical": "Triticum dicoccum",
    "category": "grains",
    "image": "images/products/emmer_wheat.jpg?v=5",
    "hs": "1001.99",
    "origin": "Maharashtra / Karnataka (India)",
    "crop": "2025/2026 Crop (Peak Mandi Arrival: February – April)",
    "harvestSeason": "February to April (Rabi Ancient Grain Harvest)",
    "purity": "99.5% Min (Sortex Clean Grade-A)",
    "moisture": "10.5% – 12.0% Max",
    "admixture": "0.5% Max",
    "damaged": "1.0% Max",
    "foreignMatter": "0.1% Max (Free from live weevils/stone)",
    "protein": "14.5% – 16.0% Dry Basis (High Fiber, Low GI)",
    "packing": "25kg / 50kg PP Woven Bags (Custom Private Label available)",
    "loadability": "20' FCL Load: 24.0 MT (240 Quintals) · LCL / Sample MOQ: 300 kg (3 Quintals)",
    "shelfLife": "24 Months from packaging in dry cool storage",
    "certifications": "APEDA Compliance, FSSAI Export Standards, Phytosanitary, Non-GMO",
    "inspection": "Pre-shipment inspection by SGS, Intertek, or Bureau Veritas supported at CFS Nhava Sheva (INNSA1)"
  },
  "p15": {
    "lot": "GGE-CG-2026-O15",
    "name": "Pure Cow Ghee (Traditional Desi Clarified Butter)",
    "botanical": "Bos indicus (Clarified Butterfat)",
    "category": "dairy",
    "image": "images/products/cow_ghee.jpg?v=5",
    "hs": "0405.90",
    "origin": "Maharashtra / Gujarat (India)",
    "crop": "Fresh Continuous Churning & Clarification (Bilona Method)",
    "harvestSeason": "Continuous Year-Round Fresh Batch Processing",
    "purity": "99.8% Min Pure Milk Fat (Zero Trans Fat & Chemical Additives)",
    "moisture": "0.3% Max (Export Standard)",
    "admixture": "FFA < 0.5% (As Oleic Acid), Peroxide Value < 0.4 meq/kg",
    "damaged": "RM Value > 28.0, Polenske Value 1.0 – 2.0",
    "foreignMatter": "Nil (Golden Granular Danedar Texture)",
    "protein": "Beta-Carotene & Fat-Soluble Vitamins A, D, E, K Enriched",
    "packing": "15kg Food-Grade Export Tins / 500ml & 1000ml Glass Jars in Master Cartons",
    "loadability": "20' FCL Load: 18.0 MT (1,200 Tins) · LCL / Sample MOQ: 150 kg",
    "shelfLife": "18 Months in ambient cool conditions away from light",
    "certifications": "FSSAI Central Export License, Agmark Special Grade, Halal, Non-GMO",
    "inspection": "Pre-shipment assay by SGS, Intertek, or Bureau Veritas supported at CFS Nhava Sheva (INNSA1)"
  },
  "p17": {
    "lot": "GGE-HS-2026-Q17",
    "name": "Indian Home Spices (Kitchen Essentials)",
    "botanical": "Turmeric, Red Chilli, Mustard Seeds, Fenugreek, Cloves, Pepper & Cardamom (Sold Individually)",
    "category": "spices",
    "image": "images/products/spice_blend.jpg?v=5",
    "hs": "0904 – 0910",
    "origin": "Maharashtra, Karnataka, Kerala, Rajasthan & Andhra Pradesh (India)",
    "crop": "2025/2026 Fresh Mandi Crop (Single-Commodity Lots)",
    "harvestSeason": "Continuous Year-Round Mandi Origination by Spice Variety",
    "purity": "99.5% Min Sortex Clean / Grade-A Single Origins (Unblended)",
    "moisture": "7.0% – 11.0% Max (Variety-Specific AOAC Standard)",
    "admixture": "0.5% Max (Single Commodity Origin Purity)",
    "damaged": "1.0% Max (Optical Sortex Color Graded)",
    "foreignMatter": "0.1% Max (Free from dead/live weevils, stone, extraneous matter)",
    "protein": "Single-Origin Chemical & Volatile Essential Oil Assay Per Lot",
    "packing": "25kg / 50kg PP Woven Bags, Multi-Wall Paper Sacks, or Private Label Pouches (100g – 1kg)",
    "loadability": "20' FCL Load: 16.0 – 24.0 MT (Single Spice FCL or Palletized Consolidated Multi-Spice) · MOQ: 300 kg",
    "shelfLife": "24 Months in airtight cool dry storage away from direct sunlight",
    "certifications": "Spices Board of India CRES, FSSAI Export Standards, Phytosanitary, Non-GMO, Halal",
    "inspection": "Pre-shipment assay by SGS, Intertek, or Bureau Veritas supported at CFS Nhava Sheva (INNSA1)",
    "spiceVarieties": [
      {
        "name": "Turmeric (Haldi)",
        "botanical": "Curcuma longa",
        "form": "Polished Whole Fingers & Cold-Ground Fine Powder",
        "grade": "Salem / Nizamabad Sortex Grade-A",
        "assay": "Curcumin Content > 3.0% – 4.5%",
        "hs": "0910.30"
      },
      {
        "name": "Red Chilli (Lal Mirch)",
        "botanical": "Capsicum annuum",
        "form": "Stemless Whole Dried Pods & Flakes / Powder",
        "grade": "Guntur S17 / Byadgi Deep Red",
        "assay": "Color ASTA 100–140 | Pungency 20,000–35,000 SHU",
        "hs": "0904.22"
      },
      {
        "name": "Black Mustard Seeds (Rai / Sarson)",
        "botanical": "Brassica nigra",
        "form": "Bold Machine-Cleaned Whole Seeds",
        "grade": "Machine Clean & Micro-Sortex Clean",
        "assay": "Purity 99.5% Min | Volatile Oil > 0.6%",
        "hs": "1207.50"
      },
      {
        "name": "Fenugreek Seeds (Methi Dana)",
        "botanical": "Trigonella foenum-graecum",
        "form": "Golden Yellow Whole Seeds",
        "grade": "Machine Cleaned & Sortexed",
        "assay": "Purity 99.0% Min | Total Ash < 7.0%",
        "hs": "0910.99"
      },
      {
        "name": "Black Peppercorns (Kali Mirch)",
        "botanical": "Piper nigrum",
        "form": "Whole Sun-Dried Black Peppercorns",
        "grade": "Tellicherry Garbled Extra Bold (TGEB)",
        "assay": "Bulk Density 550–570 g/L | Piperine > 4.5%",
        "hs": "0904.11"
      },
      {
        "name": "Whole Cloves (Laung)",
        "botanical": "Syzygium aromaticum",
        "form": "Handpicked Headed Whole Cloves",
        "grade": "Lalpari Special Grade (Headless < 2%)",
        "assay": "Volatile Essential Oil > 17.0% v/w (High Eugenol)",
        "hs": "0907.10"
      },
      {
        "name": "Green Cardamom (Chhoti Elaichi)",
        "botanical": "Elettaria cardamomum",
        "form": "Imperial Whole Green Pods",
        "grade": "7mm – 8mm Jumbo Deep Green Pods",
        "assay": "Volatile Oil > 6.0% v/w | Moisture < 10.0%",
        "hs": "0908.31"
      },
      {
        "name": "Cinnamon / Cassia Quills (Dalchini)",
        "botanical": "Cinnamomum verum / Cassia",
        "form": "Rolled Quills & Clean Cut Sticks",
        "grade": "Selected Clean Quills (Cinnamaldehyde Rich)",
        "assay": "Volatile Oil > 1.2% | Moisture < 12.0%",
        "hs": "0906.11"
      }
    ]
  }
};

const defaultPrices = {
  "p1": {
    "name": "Classic Toor (Tur Dal)",
    "baseUsd": 820,
    "hs": "0713.60"
  },
  "p2": {
    "name": "Classic Moong (Whole)",
    "baseUsd": 840,
    "hs": "0713.31"
  },
  "p3": {
    "name": "Classic Chana Dal",
    "baseUsd": 760,
    "hs": "0713.20"
  },
  "p4": {
    "name": "Classic Masoor (Red Split)",
    "baseUsd": 790,
    "hs": "0713.40"
  },
  "p5": {
    "name": "Chia Seeds (Superfood)",
    "baseUsd": 1850,
    "hs": "1207.99"
  },
  "p6": {
    "name": "Coriander Seeds (Dhania)",
    "baseUsd": 1420,
    "hs": "0909.21"
  },
  "p7": {
    "name": "Cumin Seeds (Jeera Whole)",
    "baseUsd": 3800,
    "hs": "0909.31"
  },
  "p8": {
    "name": "Moringa Leaf Powder",
    "baseUsd": 3800,
    "hs": "1211.90"
  },
  "p9": {
    "name": "Mint Powder (Pudina)",
    "baseUsd": 3200,
    "hs": "1211.90"
  },
  "p10": {
    "name": "Coriander Powder",
    "baseUsd": 1650,
    "hs": "0909.22"
  },
  "p11": {
    "name": "Jowar (Whole Sorghum)",
    "baseUsd": 520,
    "hs": "1007.90"
  },
  "p12": {
    "name": "Jowar Flour (Sorghum Flour)",
    "baseUsd": 620,
    "hs": "1102.90"
  },
  "p13": {
    "name": "Tissue Paper Virgin Pulp",
    "baseUsd": 1150,
    "hs": "4818.10"
  },
  "p14": {
    "name": "Emmer Wheat (Khapli Wheat)",
    "baseUsd": 680,
    "hs": "1001.99"
  },
  "p15": {
    "name": "Pure Cow Ghee (Desi Bilona)",
    "baseUsd": 6800,
    "hs": "0405.90"
  },
  "p17": {
    "name": "Indian Home Spices (Individual Lots)",
    "baseUsd": 2450,
    "hs": "0904-0910"
  }
};

const domesticCommodityCatalog = {
  "p1": {
    "code": "p1",
    "name": "Classic Toor (Tur Dal)",
    "category": "pulses",
    "grade": "Sortex Grade-A · Machine Clean",
    "fssai": "FSSAI Cat. 06.0 Pulses",
    "image": "images/products/toor_dal.jpg?v=6",
    "packs": { "500g": 85, "1kg": 160, "5kg": 775, "25kg": 3750 },
    "desc": "Mechanically polished, moisture-tested unadulterated split pigeon pea."
  },
  "p2": {
    "code": "p2",
    "name": "Classic Moong (Whole)",
    "category": "pulses",
    "grade": "Sortex Machine Cleaned",
    "fssai": "FSSAI Cat. 06.0 Pulses",
    "image": "images/products/moong_whole.jpg?v=5",
    "packs": { "500g": 80, "1kg": 150, "5kg": 725, "25kg": 3500 },
    "desc": "Uniform green whole mung beans, pesticide residue tested."
  },
  "p3": {
    "code": "p3",
    "name": "Classic Chana Dal",
    "category": "pulses",
    "grade": "Sortex Clean / Unpolished",
    "fssai": "FSSAI Cat. 06.0 Pulses",
    "image": "images/products/chana_dal.jpg?v=6",
    "packs": { "500g": 65, "1kg": 120, "5kg": 575, "25kg": 2750 },
    "desc": "Rich golden split chickpea kernels with optimal cooking texture."
  },
  "p4": {
    "code": "p4",
    "name": "Classic Masoor (Red Split)",
    "category": "pulses",
    "grade": "Sortex Clean Grade-A",
    "fssai": "FSSAI Cat. 06.0 Pulses",
    "image": "images/products/masoor_split.jpg?v=6",
    "packs": { "500g": 70, "1kg": 130, "5kg": 625, "25kg": 3000 },
    "desc": "High-protein split red lentils, double-bagged for freshness."
  },
  "p5": {
    "code": "p5",
    "name": "Chia Seeds (Superfood)",
    "category": "seeds",
    "grade": "99.9% Purity · Food Grade",
    "fssai": "FSSAI Cat. 04.0 Seeds",
    "image": "images/products/chia_seeds.jpg?v=6",
    "packs": { "500g": 190, "1kg": 360, "5kg": 1700, "25kg": 8200 },
    "desc": "Natural raw black chia seeds rich in Omega-3 and dietary fiber."
  },
  "p6": {
    "code": "p6",
    "name": "Coriander Seeds (Dhania)",
    "category": "spices",
    "grade": "Eagle Quality Green Clean",
    "fssai": "FSSAI Cat. 12.0 Spices",
    "image": "images/products/coriander_seeds.jpg?v=5",
    "packs": { "500g": 95, "1kg": 180, "5kg": 850, "25kg": 4100 },
    "desc": "Aromatic whole coriander seeds sourced from Rajasthan & MP."
  },
  "p7": {
    "code": "p7",
    "name": "Cumin Seeds (Jeera Whole)",
    "category": "spices",
    "grade": "Sortex Cleaned 99.5%",
    "fssai": "FSSAI Cat. 12.0 Spices",
    "image": "images/products/cumin_seeds.jpg?v=5",
    "packs": { "500g": 240, "1kg": 460, "5kg": 2200, "25kg": 10500 },
    "desc": "High volatile oil Unjha grade whole cumin seeds with robust aroma."
  },
  "p8": {
    "code": "p8",
    "name": "Moringa Leaf Powder",
    "category": "powders",
    "grade": "Micro-Fine Shadow Dried",
    "fssai": "FSSAI Cat. 04.0 Nutraceutical",
    "image": "images/products/moringa_powder.jpg?v=6",
    "packs": { "500g": 220, "1kg": 420, "5kg": 2000, "25kg": 9500 },
    "desc": "100% pure organic Moringa oleifera powder, dark emerald shade."
  },
  "p9": {
    "code": "p9",
    "name": "Mint Powder (Pudina)",
    "category": "powders",
    "grade": "Spray-Dried Natural Green",
    "fssai": "FSSAI Cat. 04.0 Herbs",
    "image": "images/products/mint_powder.jpg?v=5",
    "packs": { "500g": 180, "1kg": 340, "5kg": 1600, "25kg": 7800 },
    "desc": "Concentrated mint aroma powder for commercial seasoning and snacks."
  },
  "p10": {
    "code": "p10",
    "name": "Coriander Powder",
    "category": "powders",
    "grade": "Slow Cold-Ground Aromatic",
    "fssai": "FSSAI Cat. 12.0 Ground Spices",
    "image": "images/products/coriander_powder.jpg?v=6",
    "packs": { "500g": 110, "1kg": 210, "5kg": 1000, "25kg": 4800 },
    "desc": "Freshly ground whole coriander seeds without added husk or filler."
  },
  "p11": {
    "code": "p11",
    "name": "Jowar (Whole Sorghum)",
    "category": "grains",
    "grade": "Maldandi Yellow Sortex Clean",
    "fssai": "FSSAI Cat. 06.0 Grains",
    "image": "images/products/sorghum.jpg?v=5",
    "packs": { "500g": 45, "1kg": 80, "5kg": 380, "25kg": 1800 },
    "desc": "Gluten-free traditional super-grain from Maharashtra farms."
  },
  "p12": {
    "code": "p12",
    "name": "Jowar Flour (Sorghum Atta)",
    "category": "grains",
    "grade": "Stone Ground · Gluten-Free 100%",
    "fssai": "FSSAI Cat. 06.0 Flours",
    "image": "images/products/jowar_flour.jpg?v=5",
    "packs": { "500g": 50, "1kg": 90, "5kg": 430, "25kg": 2050 },
    "desc": "Freshly stone-ground whole jowar flour, naturally gluten-free and low GI."
  },
  "p13": {
    "code": "p13",
    "name": "Tissue Paper Virgin Pulp",
    "category": "paper",
    "grade": "100% Virgin Bamboo/Wood Pulp",
    "fssai": "FMCG / Non-Food Consumer Goods",
    "image": "images/products/tissue_paper.jpg?v=5",
    "packs": { "500g": 150, "1kg": 280, "5kg": 1300, "25kg": 5800 },
    "desc": "Ultra-soft, high-absorbency commercial multi-fold paper products."
  },
  "p14": {
    "code": "p14",
    "name": "Emmer Wheat (Khapli Wheat)",
    "category": "grains",
    "grade": "Ancient Low-Gluten Grain",
    "fssai": "FSSAI Cat. 06.0 Grains",
    "image": "images/products/emmer_wheat.jpg?v=5",
    "packs": { "500g": 55, "1kg": 100, "5kg": 480, "25kg": 2300 },
    "desc": "Diabetic-friendly ancient diploid wheat grain with rich mineral profile."
  },
  "p15": {
    "code": "p15",
    "name": "Pure Cow Ghee (Desi Bilona)",
    "category": "dairy",
    "grade": "A2 Vedic Bilona Churned",
    "fssai": "FSSAI Cat. 02.0 Dairy Fats",
    "image": "images/products/cow_ghee.jpg?v=5",
    "packs": { "500g": 450, "1kg": 850, "5kg": 4100, "25kg": 19800 },
    "desc": "Traditional hand-churned grass-fed cow ghee with granular Danedar texture."
  },
  "p17": {
    "code": "p17",
    "name": "Indian Home Spices (Individual Lots)",
    "category": "spices",
    "grade": "Single-Lot Sortex Cleaned",
    "fssai": "FSSAI Cat. 12.0 Spices",
    "image": "images/products/home_spices.jpg?v=5",
    "packs": { "500g": 160, "1kg": 300, "5kg": 1420, "25kg": 6800 },
    "desc": "Whole spices (Turmeric, Mustard, Fenugreek, Clove) in individual lots."
  }
};

// Merge default domestic pack rates into defaultPrices
Object.keys(defaultPrices).forEach(k => {
  if (domesticCommodityCatalog[k] && domesticCommodityCatalog[k].packs) {
    defaultPrices[k].domesticPacks = { ...domesticCommodityCatalog[k].packs };
  }
});

if (typeof window !== "undefined") {
  window.specDatabase = specDatabase;
  window.defaultPrices = defaultPrices;
  window.domesticCommodityCatalog = domesticCommodityCatalog;
  window.defaultDomesticCatalog = JSON.parse(JSON.stringify(domesticCommodityCatalog));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { specDatabase, defaultPrices, domesticCommodityCatalog };
}
