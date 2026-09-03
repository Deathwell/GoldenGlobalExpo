/**
 * Golden Global Expo — Tracking, Carriers & CRM Seed Data
 */
const defaultTrackingDatabase = {
    'GGE-DEMO-XXXX-XXXX': {
      bl: 'GGE-DEMO-XXXX-XXXX',
      commodity: '24.0 MT · Sortex Grade-A Pulses · Export FCL Container (Interactive Demo)',
      status: 'In Oceanic Transit',
      completed: false,
      stage: 4,
      vessel: 'MV GOLDEN HORIZON (IMO 9412356)',
      vesselShort: 'MV Golden Horizon',
      pod: 'Rotterdam Port (Netherlands)',
      podShort: 'Rotterdam (NL)',
      eta: 'Demonstration Transit Tracker',
      container: 'GGEU 000000-0 (20\' GP)'
    },
    'GGE-DEMO-XXXX': {
      bl: 'GGE-DEMO-XXXX-XXXX',
      commodity: '24.0 MT · Sortex Grade-A Pulses · Export FCL Container (Interactive Demo)',
      status: 'In Oceanic Transit',
      completed: false,
      stage: 4,
      vessel: 'MV GOLDEN HORIZON (IMO 9412356)',
      vesselShort: 'MV Golden Horizon',
      pod: 'Rotterdam Port (Netherlands)',
      podShort: 'Rotterdam (NL)',
      eta: 'Demonstration Transit Tracker',
      container: 'GGEU 000000-0 (20\' GP)'
    },
    'GGE-JNPT-2026': {
      bl: 'GGE-JNPT-2026',
      commodity: '24.0 MT · Tur Dal (Sortex Clean Grade-A) · 20ft FCL Container',
      status: 'In Oceanic Transit',
      completed: false,
      stage: 4,
      vessel: 'MSC VALERIA (IMO 9461439)',
      vesselShort: 'MSC Valeria',
      pod: 'Jebel Ali, Dubai (UAE)',
      podShort: 'Jebel Ali (UAE)',
      eta: 'In 2 Days (~36 Hrs)',
      container: 'MSCU 892104-7 (20\' GP)'
    },
    'GGE-RTM-8821': {
      bl: 'GGE-RTM-8821',
      commodity: '48.0 MT · Chia Seeds & Moringa Powder · 2x20ft FCL',
      status: 'In Oceanic Transit (Red Sea)',
      completed: false,
      stage: 4,
      vessel: 'CMA CGM JACQUES SAADE (IMO 9839179)',
      vesselShort: 'CMA CGM Jacques Saade',
      pod: 'Rotterdam Port (Netherlands)',
      podShort: 'Rotterdam (NL)',
      eta: 'In 12 Days (On Schedule)',
      container: 'CMAU 440219-3 / CMAU 440220-7'
    },
    'GGE-SGP-3104': {
      bl: 'GGE-SGP-3104',
      commodity: '26.0 MT · Chana Dal (Sortex Clean Grade-A) · 20ft FCL Container',
      status: 'Port Cleared & Delivered',
      completed: true,
      stage: 5,
      vessel: 'ONE APUS (IMO 9806079)',
      vesselShort: 'ONE Apus',
      pod: 'Port Klang & Singapore Hub',
      podShort: 'Singapore Port',
      eta: 'Discharged & Released',
      container: 'ONEU 773190-2 (20\' GP)'
    }
  };

const CARRIERS = {
    'MSCU': { name: 'MSC (Mediterranean Shipping Co.)', url: (c) => `https://www.msc.com/en/track-a-shipment?reference=${c}`, vessel: 'MSC Global Fleet' },
    'MEDU': { name: 'MSC (Mediterranean Shipping Co.)', url: (c) => `https://www.msc.com/en/track-a-shipment?reference=${c}`, vessel: 'MSC Global Fleet' },
    'MAEU': { name: 'A.P. Moller - Maersk Line', url: (c) => `https://www.maersk.com/tracking/${c}`, vessel: 'Maersk Triple-E Class' },
    'MSKU': { name: 'A.P. Moller - Maersk Line', url: (c) => `https://www.maersk.com/tracking/${c}`, vessel: 'Maersk Fleet' },
    'CMAU': { name: 'CMA CGM Ocean Freight', url: (c) => `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=Container&SearchValue=${c}`, vessel: 'CMA CGM Mega Vessel' },
    'HLCU': { name: 'Hapag-Lloyd Line', url: (c) => `https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html?container=${c}`, vessel: 'Hapag-Lloyd Express' },
    'ONEU': { name: 'Ocean Network Express (ONE)', url: (c) => `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?ctrac-field=${c}`, vessel: 'ONE Magenta Liner' },
    'EGLV': { name: 'Evergreen Marine Corp', url: (c) => `https://www.shipmentlink.com/servlet/TTrn_TrackingServlet?TYPE=CNTR&NO=${c}`, vessel: 'Evergreen Ultra-Max' },
    'EISU': { name: 'Evergreen Marine Corp', url: (c) => `https://www.shipmentlink.com/servlet/TTrn_TrackingServlet?TYPE=CNTR&NO=${c}`, vessel: 'Evergreen Ultra-Max' },
    'COSU': { name: 'COSCO Shipping Lines', url: (c) => `https://lines.coscoshipping.com/ebusiness/cargoTracking?searchType=CONTAINER&number=${c}`, vessel: 'COSCO Star Fleet' },
    'ZCSU': { name: 'ZIM Integrated Shipping', url: (c) => `https://www.zim.com/tools/track-a-shipment?consignment=${c}`, vessel: 'ZIM Pacific' },
    'YMLU': { name: 'Yang Ming Marine Transport', url: (c) => `https://www.yangming.com/e-service/track_trace/track_trace_cargo_tracking.aspx?type=c&num=${c}`, vessel: 'Yang Ming Express' }
  };

const defaultInquiries = [
    {
      id: 'RFQ-891',
      date: '2026-08-25',
      name: 'Tariq Al-Mansoor',
      company: 'Al-Noor Foodstuff Trading LLC',
      email: 'tariq@alnoorfoods.ae',
      phone: '+971501234567',
      country: 'Jebel Ali Port, Dubai (UAE)',
      commodities: 'Tur Dal (Arhar)',
      volume: '2×20\' FCL (50 Metric Tons) · Immediate shipment requested',
      status: 'quoted'
    },
    {
      id: 'RFQ-892',
      date: '2026-08-24',
      name: 'Jan Van Der Meer',
      company: 'Rotterdam Agri-Commodities B.V.',
      email: 'jan@rotterdamagri.nl',
      phone: '+31612345678',
      country: 'Rotterdam Port (Netherlands)',
      commodities: 'Chia Seeds & Moringa Powder',
      volume: '1×40\' HC Container (22 MT) · Organic analysis required',
      status: 'quoted'
    },
    {
      id: 'RFQ-893',
      date: '2026-08-23',
      name: 'Wei Zhang',
      company: 'SingaTrade Global Pte Ltd',
      email: 'wei.zhang@singatrade.sg',
      phone: '+6591234567',
      country: 'Port Klang & Singapore Hub',
      commodities: 'Chana Dal (Bengal Gram)',
      volume: '4×20\' FCL (100 MT) · Sortex Grade-A only',
      status: 'closed'
    },
    {
      id: 'RFQ-894',
      date: '2026-08-22',
      name: 'Marcus Becker',
      company: 'Bavaria Organics GmbH',
      email: 'm.becker@bavaria-organics.de',
      phone: '+491701234567',
      country: 'Hamburg Port (Germany)',
      commodities: 'Moringa Leaf Powder',
      volume: '1×20\' FCL (12 MT) · Micro-mesh 80-100 mesh',
      status: 'new'
    },
    {
      id: 'RFQ-895',
      date: '2026-08-21',
      name: 'Kofi Mensah',
      company: 'AfriGrain Imports Ltd',
      email: 'k.mensah@afrigrain.co.ke',
      phone: '+254701234567',
      country: 'Mombasa Port (Kenya)',
      commodities: 'Jowar (Sorghum Grain) & Jowar Flour',
      volume: '2×20\' FCL (48 MT) · 50kg PP Bags',
      status: 'new'
    }
  ];

const defaultConsignments = [
    {
      bl: 'GGE-JNPT-2026',
      buyer: 'Al-Noor Foodstuff Trading LLC (Dubai)',
      buyerEmail: 'tariq@alnoorfoods.ae',
      buyerPhone: '+971501234567',
      commodity: '24.0 MT · Tur Dal (Sortex Grade-A)',
      status: 'In Oceanic Transit',
      stage: 4,
      vessel: 'MSC VALERIA (IMO 9461439)',
      pod: 'Jebel Ali, Dubai (UAE)',
      eta: 'In 2 Days (~36 Hrs)',
      container: 'MSCU 892104-7',
      docs: {
        inv: { ref: 'GGE/EXP/2026/089', file: null },
        phyto: { ref: 'PSC/MH/JNPT/9912', file: null },
        coa: { ref: 'COA-SGS-94812', file: null },
        bl: { ref: 'Non-Negotiable Seaway Bill', file: null }
      }
    },
    {
      bl: 'GGE-RTM-8821',
      buyer: 'Rotterdam Agri-Commodities B.V.',
      buyerEmail: 'jan@rotterdamagri.nl',
      buyerPhone: '+31612345678',
      commodity: '48.0 MT · Chia Seeds & Moringa Powder',
      status: 'In Oceanic Transit (Red Sea)',
      stage: 4,
      vessel: 'CMA CGM JACQUES SAADE',
      pod: 'Rotterdam Port (Netherlands)',
      eta: 'In 12 Days',
      container: 'CMAU 440219-3',
      docs: {
        inv: { ref: 'GGE/EXP/2026/077', file: null },
        phyto: { ref: 'PSC/MH/JNPT/8841', file: null },
        coa: { ref: 'COA-GEOCHEM-8219', file: null },
        bl: { ref: 'Ocean B/L Copy', file: null }
      }
    },
    {
      bl: 'GGE-SGP-3104',
      buyer: 'SingaTrade Global Pte Ltd',
      buyerEmail: 'wei.zhang@singatrade.sg',
      buyerPhone: '+6591234567',
      commodity: '26.0 MT · Chana Dal (Sortex Grade-A)',
      status: 'Port Cleared & Delivered',
      stage: 5,
      vessel: 'ONE APUS (IMO 9806079)',
      pod: 'Singapore Port',
      eta: 'Discharged & Released',
      container: 'ONEU 773190-2',
      docs: {
        inv: { ref: 'GGE/EXP/2026/064', file: null },
        phyto: { ref: 'PSC/MH/JNPT/7602', file: null },
        coa: { ref: 'COA-INTERTEK-7104', file: null },
        bl: { ref: 'Delivered Delivery Order', file: null }
      }
    }
  ];

window.defaultTrackingDatabase = defaultTrackingDatabase;
window.CARRIERS = CARRIERS;
window.defaultInquiries = defaultInquiries;
window.defaultConsignments = defaultConsignments;
