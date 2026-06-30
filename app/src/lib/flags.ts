const TLA_TO_ISO: Record<string, string> = {
  AFG: "af", ALB: "al", ALG: "dz", AND: "ad", ANG: "ao", ANT: "ag",
  ARG: "ar", ARM: "am", ARU: "aw", AUS: "au", AUT: "at", AZE: "az",
  BAH: "bs", BHR: "bh", BAN: "bd", BRB: "bb", BLR: "by", BEL: "be",
  BLZ: "bz", BEN: "bj", BER: "bm", BHU: "bt", BOL: "bo", BIH: "ba",
  BOT: "bw", BRA: "br", BRU: "bn", BUL: "bg", BFA: "bf", BDI: "bi",
  CAM: "kh", CMR: "cm", CAN: "ca", CPV: "cv", CTA: "cf", CHA: "td",
  CHI: "cl", CHN: "cn", COL: "co", COM: "km", CGO: "cg", COD: "cd",
  CRC: "cr", CIV: "ci", CRO: "hr", CUB: "cu", CYP: "cy", CZE: "cz",
  DEN: "dk", DJI: "dj", DMA: "dm", DOM: "do", ECU: "ec", EGY: "eg",
  SLV: "sv", GEQ: "gq", ERI: "er", EST: "ee", ETH: "et", FIJ: "fj",
  FIN: "fi", FRA: "fr", GAB: "ga", GAM: "gm", GEO: "ge", GER: "de",
  GHA: "gh", GRE: "gr", GRN: "gd", GUA: "gt", GUI: "gn", GNB: "gw",
  GUY: "gy", HAI: "ht", HON: "hn", HKG: "hk", HUN: "hu", ISL: "is",
  IND: "in", IDN: "id", IRN: "ir", IRQ: "iq", IRL: "ie", ISR: "il",
  ITA: "it", JAM: "jm", JPN: "jp", JOR: "jo", KAZ: "kz", KEN: "ke",
  KOR: "kr", KUW: "kw", KGZ: "kg", LAO: "la", LVA: "lv", LBN: "lb",
  LES: "ls", LBR: "lr", LBY: "ly", LIE: "li", LTU: "lt", LUX: "lu",
  MAC: "mo", MAD: "mg", MWI: "mw", MAS: "my", MDV: "mv", MLI: "ml",
  MLT: "mt", MTN: "mr", MRI: "mu", MEX: "mx", MDA: "md", MNG: "mn",
  MNE: "me", MAR: "ma", MOZ: "mz", MYA: "mm", NAM: "na", NEP: "np",
  NED: "nl", NCL: "nc", NZL: "nz", NCA: "ni", NIG: "ne", NGA: "ng",
  MKD: "mk", NOR: "no", OMA: "om", PAK: "pk", PLE: "ps", PAN: "pa",
  PNG: "pg", PAR: "py", PRY: "py", PER: "pe", PHI: "ph", POL: "pl", POR: "pt",
  QAT: "qa", ROU: "ro", RUS: "ru", RWA: "rw", SKN: "kn", LCA: "lc",
  VIN: "vc", SAM: "ws", STP: "st", KSA: "sa", SEN: "sn", SRB: "rs",
  SEY: "sc", SLE: "sl", SGP: "sg", SVK: "sk", SVN: "si", SOL: "sb",
  SOM: "so", RSA: "za", ESP: "es", SRI: "lk", SDN: "sd", SUR: "sr",
  SWZ: "sz", SWE: "se", SUI: "ch", SYR: "sy", TAH: "pf", TPE: "tw",
  TJK: "tj", TAN: "tz", THA: "th", TLS: "tl", TOG: "tg", TGA: "to",
  TRI: "tt", TUN: "tn", TUR: "tr", TKM: "tm", UGA: "ug", UKR: "ua",
  UAE: "ae", ENG: "gb-eng", SCO: "gb-sct", WAL: "gb-wls", NIR: "gb-nir",
  USA: "us", URU: "uy", UZB: "uz", VAN: "vu", VEN: "ve", VIE: "vn",
  YEM: "ye", ZAM: "zm", ZIM: "zw", CUW: "cw", KVX: "xk",
};

const NAME_TO_ISO: Record<string, string> = {
  Afghanistan: "af", Albania: "al", Algeria: "dz", Andorra: "ad", Angola: "ao",
  Argentina: "ar", Armenia: "am", Australia: "au", Austria: "at", Azerbaijan: "az",
  Bahrain: "bh", Bangladesh: "bd", Belarus: "by", Belgium: "be", Bolivia: "bo",
  "Bosnia and Herzegovina": "ba", "Bosnia-Herzegovina": "ba", Brazil: "br",
  Bulgaria: "bg", Cameroon: "cm", Canada: "ca", Chile: "cl", China: "cn",
  Colombia: "co", "Costa Rica": "cr", Croatia: "hr", Cuba: "cu", Curacao: "cw",
  Curaçao: "cw", "Côte d'Ivoire": "ci", "Ivory Coast": "ci", Denmark: "dk",
  Ecuador: "ec", Egypt: "eg", England: "gb-eng", France: "fr", Germany: "de",
  Ghana: "gh", Greece: "gr", Haiti: "ht", Honduras: "hn", Hungary: "hu",
  Iceland: "is", India: "in", Iran: "ir", Iraq: "iq", Ireland: "ie",
  Israel: "il", Italy: "it", Jamaica: "jm", Japan: "jp", Jordan: "jo",
  Kazakhstan: "kz", Kenya: "ke", "Korea Republic": "kr", "South Korea": "kr",
  Kuwait: "kw", Mexico: "mx", Morocco: "ma", Netherlands: "nl", "New Zealand": "nz",
  Nigeria: "ng", "North Macedonia": "mk", "Northern Ireland": "gb-nir", Norway: "no",
  Panama: "pa", Paraguay: "py", Peru: "pe", Poland: "pl", Portugal: "pt",
  Qatar: "qa", Romania: "ro", Russia: "ru", "Saudi Arabia": "sa", Scotland: "gb-sct",
  Senegal: "sn", Serbia: "rs", Slovakia: "sk", Slovenia: "si", "South Africa": "za",
  Spain: "es", Sweden: "se", Switzerland: "ch", Tunisia: "tn", Turkey: "tr",
  Ukraine: "ua", Uruguay: "uy", USA: "us", "United States": "us",
  Venezuela: "ve", Wales: "gb-wls", Zambia: "zm",
};

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function resolveIso(tla: string, teamName?: string): string {
  const code = tla.trim().toUpperCase();
  if (code && TLA_TO_ISO[code]) {
    return TLA_TO_ISO[code];
  }

  if (teamName) {
    const normalized = normalizeName(teamName);
    if (NAME_TO_ISO[normalized]) {
      return NAME_TO_ISO[normalized];
    }

    const lower = normalized.toLowerCase();
    for (const [name, iso] of Object.entries(NAME_TO_ISO)) {
      if (lower === name.toLowerCase() || lower.includes(name.toLowerCase())) {
        return iso;
      }
    }
  }

  return "";
}

export function getFlagUrl(tla: string, teamName?: string): string {
  const iso = resolveIso(tla, teamName);
  if (!iso) return "";
  return `https://flagcdn.com/${iso}.svg`;
}

export function getIsoCode(tla: string, teamName?: string): string {
  return resolveIso(tla, teamName);
}
