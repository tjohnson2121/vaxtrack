export const SOURCES = {
  // Health Canada DPD
  hcDpdOnlineQuery: "https://health-products.canada.ca/dpd-bdpp/index-eng.jsp",

  // RSV — Health Canada monographs
  hcAbrysvo: "https://pdf.hres.ca/dpd_pm/00082124.PDF",
  hcArexvy: "https://pdf.hres.ca/dpd_pm/00077616.PDF",
  hcBeyfortus: "https://health-products.canada.ca/dpd-bdpp/info?lang=eng&code=102595",

  // RSV — NACI
  naciOlderAdults:
    "https://www.canada.ca/content/dam/phac-aspc/documents/services/publications/vaccines-immunization/national-advisory-committee-immunization-statement-prevention-rsv-disease-older-adults/naci-statement-2024-07-12.pdf",
  naciRsvSummary:
    "https://www.canada.ca/en/public-health/services/publications/vaccines-immunization/national-advisory-committee-immunization-statement-prevention-rsv-disease-older-adults.html",

  // RSV — Provincial sources
  onPrograms:
    "https://www.ontario.ca/page/respiratory-syncytial-virus-rsv-prevention-programs",
  qcPiq:
    "https://msss.gouv.qc.ca/professionnels/vaccination/piq-vaccins/vrs-vaccin-contre-virus-respiratoire-syncytial/",
  nsAdultFaq:
    "https://novascotia.ca/dhw/CDPC/documents/Respiratory-Syncytial-Virus-FAQ.pdf",
  abRsv:
    "https://abpharmacy.ca/news/rsv-immunization-program-eligibility-expansion/",
  bcRsv:
    "https://www.healthlinkbc.ca/healthlinkbc-files/respiratory-syncytial-virus-rsv-vaccine",
  mbRsv:
    "https://www.gov.mb.ca/health/publichealth/cdc/vaccineeligibility.html#RSV",
  nbRsv:
    "https://www2.gnb.ca/content/gnb/en/departments/health/DrugPlans/TheNewBrunswickPrescriptionDrugProgram/publichealthplan/rsv-vaccine.html",
  nlRsv: "https://www.gov.nl.ca/releases/2025/health/0328n04/",
  peRsv:
    "https://www.princeedwardisland.ca/en/news/province-expands-rsv-protection-for-infants-and-seniors",
  skRsv:
    "https://www.lungsask.ca/education/lung-diseases/viral-infections/rsv-respiratory-syncytial-virus/treatment-and-prevention",
  ntRsv:
    "https://www.hss.gov.nt.ca/professionals/sites/professionals/files/resources/nwt-immunization-schedule-health-care-professionals.pdf",
  nuRsv:
    "http://www.news.gov.nu.ca/2024/december/2024-12%20PSA%20%28HEA%29%20RSV%20Prevention%20Program%20in%20Nunavut%20-%20ENG.pdf",
  ytRsv:
    "https://yukon.ca/sites/default/files/2025-09/Section8.RSVVaccines.YIPManual.08.2025.pdf",

  // Shingles — Health Canada monograph
  hcShingrix: "https://pdf.hres.ca/dpd_pm/00082294.PDF",

  // Shingles — NACI
  naciShingles:
    "https://publications.gc.ca/collections/collection_2025/aspc-phac/HP40-388-2025-1-eng.pdf",
  naciShinglesSummary:
    "https://www.canada.ca/en/public-health/services/publications/vaccines-immunization/national-advisory-committee-immunization-summary-updated-recommendations-herpes-zoster-vaccination-adults-immunocompromised.html",
  cigShingles:
    "https://www.canada.ca/en/public-health/services/publications/healthy-living/canadian-immunization-guide-part-4-active-vaccines/page-8-herpes-zoster-(shingles)-vaccine.html",

  // Shingles — Provincial sources
  onShingles: "https://www.ontario.ca/page/shingles-vaccine",
  qcShingles:
    "https://msss.gouv.qc.ca/professionnels/vaccination/piq-vaccins/zona-su-vaccin-sous-unitaire-contre-le-zona/",
  nsShingles:
    "https://novascotia.ca/dhw/cdpc/documents/shingles-immunization-information-healthcare-professionals.pdf",
  abShingles:
    "https://myhealth.alberta.ca/Topic/Immunization/pages/shingrix-shingles-vaccine.aspx",
  bcShingles: "https://www.healthlinkbc.ca/healthlinkbc-files/shingles-vaccine",
  mbShingles:
    "https://www.gov.mb.ca/health/publichealth/diseases/shingles.html",
  nbShingles:
    "https://www2.gnb.ca/content/gnb/en/departments/health/patientinformation/PrimaryHealthCare/pharmacy_services/shingles.html",
  nlShingles: "https://www.gov.nl.ca/releases/2025/health/0829n04/",
  peShingles:
    "https://www.princeedwardisland.ca/en/news/free-shingles-vaccine-program-expanded-to-include-islanders-50-and-over",
  skShingles:
    "https://novascotia.ca/dhw/cdpc/documents/shingles-immunization-information-healthcare-professionals.pdf",
  ytShingles: "https://yukonimmunization.ca/diseases-and-vaccines/shingles",

  // COVID-19 — Health Canada product monographs (DPD PDF)
  hcCovidSpikevax: "https://pdf.hres.ca/dpd_pm/00083494.PDF",
  hcCovidMNEXSPIKE: "https://pdf.hres.ca/dpd_pm/00081916.PDF",
  hcCovidNUVAXOVID: "https://pdf.hres.ca/dpd_pm/00080962.PDF",

  // COVID-19 — PHAC / national
  naciCovidPdf:
    "https://www.canada.ca/content/dam/phac-aspc/documents/services/publications/vaccines-immunization/national-advisory-committee-immunization-summary-guidance-covid-19-vaccines-2025-summer-2026/naci-summary-2025-01-10.pdf",
  naciCovidSummaryHtml:
    "https://www.canada.ca/en/public-health/services/publications/vaccines-immunization/national-advisory-committee-immunization-summary-guidance-covid-19-vaccines-2025-summer-2026.html",
  cigCovid:
    "https://www.canada.ca/en/public-health/services/publications/healthy-living/canadian-immunization-guide-part-4-active-vaccines/page-26-covid-19-vaccine.html",
  covidCoverageInfobase:
    "https://health-infobase.canada.ca/covid-19/vaccination-coverage/",

  // COVID-19 — Provincial / territorial program pages
  abCovid: "https://www.ab.bluecross.ca/news/covid-19-updates.php",
  onCovid: "https://www.ontario.ca/page/covid-19-vaccines",
  /** Ontario MOH Health Care Provider Fact Sheet — product list & eligibility (respiratory season). */
  onCovidMohHcpFactSheet2025:
    "https://www.ontario.ca/files/2025-10/moh-covid-vaccine-factsheet-hcp-en-2025-10-03.pdf",
  bcCovid:
    "https://www2.gov.bc.ca/gov/content/health/managing-your-health/immunizations/covid-19-immunization",
  mbCovid: "https://www.gov.mb.ca/covid19/vaccine.html",
  nbCovid:
    "https://www2.gnb.ca/content/gnb/en/corporate/promo/vaccines-and-immunization/sars-cov-2-vaccines.html",
  nlCovid:
    "https://www.gov.nl.ca/covid-19/vaccine/files/NL-COVID19-Immunization-Plan-1.pdf",
  nsCovid: "https://www.nshealth.ca/coronavirusvaccine",
  peCovid:
    "https://www.princeedwardisland.ca/en/information/health-and-wellness/covid-19-getting-the-vaccine",
  qcCovid:
    "https://msss.gouv.qc.ca/professionnels/vaccination/piq-vaccins/covid-19-vaccin-a-arn-messager-contre-la-covid-19/",
  skCovid:
    "https://www.saskhealthauthority.ca/your-health/conditions-illnesses-services-wellness/all-z/covid-19-saskatchewan/covid-19-immunization-eligibility",
  ntCovid: "https://www.hss.gov.nt.ca/en/services/covid-19",
  nuCovid: "https://www.gov.nu.ca/en/health/influenza-and-covid-19",
  ytCovid: "https://yukonimmunization.ca/diseases-and-vaccines/covid-19",
  ytCovidFactSheet:
    "https://yukon.ca/sites/default/files/hss/covid_vaccine_eligibility_chart_sep_2023.pdf",

  // COVID-19 — Other references
  cdcCovidStayCurrent: "https://www.cdc.gov/covid/vaccines/stay-up-to-date.html",

  // HPV — Health Canada monographs (DPD PDF)
  hcHpvGardasil: "https://pdf.hres.ca/dpd_pm/00082002.PDF",
  hcHpvCervarix: "https://pdf.hres.ca/dpd_pm/00073320.PDF",

  // HPV — PHAC / national
  naciHpvPdf:
    "https://www.canada.ca/content/dam/phac-aspc/documents/services/publications/vaccines-immunization/national-advisory-committee-immunization-summary-updated-recommendations-hpv-vaccines/naci-summary-24-07-2024.pdf",
  naciHpvSummaryHtml:
    "https://www.canada.ca/en/public-health/services/publications/vaccines-immunization/national-advisory-committee-immunization-summary-updated-recommendations-hpv-vaccines.html",
  cigHpv:
    "https://www.canada.ca/en/public-health/services/publications/healthy-living/canadian-immunization-guide-part-4-active-vaccines/page-9-human-papillomavirus-vaccine.html",

  // HPV — Provincial / territorial program pages
  /** Alberta Health Services / MyHealth Alberta — HPV-9 vaccine (alberta.ca/hpv-vaccine was 404). */
  abHpv:
    "https://myhealth.alberta.ca/topic/Immunization/pages/hpv-9-vaccine.aspx",
  onHpv: "https://www.ontario.ca/page/getting-hpv-vaccine",
  bcHpv:
    "https://www.healthlinkbc.ca/health-library/health-features/get-hpv-vaccine",
  mbHpv: "https://www.gov.mb.ca/health/publichealth/factsheets/hpv.pdf",
  nbHpv: "https://www.gnb.ca/en/topic/health-wellness/immunization-vaccination/hpv-vaccine.html",
  nlHpv:
    "https://www.partnershipagainstcancer.ca/topics/hpv-vaccine-access-2022/newfoundland-and-labrador/",
  nsHpv: "https://www.nshealth.ca/hpv",
  peHpv:
    "https://www.princeedwardisland.ca/sites/default/files/publications/hpv9_fact_sheet_2017.pdf",
  qcHpv:
    "https://www.msss.gouv.qc.ca/professionnels/vaccination/piq-vaccins/vph-vaccin-contre-les-virus-du-papillome-humain/",
  skHpv: "https://saskcancer.ca/prevention-hpv",
  ntHpv: "https://www.hss.gov.nt.ca/en/services/human-papillomavirus-hpv",
  nuHpv:
    "https://www.gov.nu.ca/sites/default/files/documents/2023-01/Nunavut%20HPV%20Immunization%20Program_28Aug2013.pdf",
  ytHpv:
    "https://yukonimmunization.ca/get-immunized/grade-6-and-9-school-based-immunization",

  // HPV — Other references
  cdcHpv: "https://www.cdc.gov/hpv/index.html",
  partnershipEliminationCervical:
    "https://s22457.pcdn.co/wp-content/uploads/2020/11/Elimination-cervical-cancer-action-plan-EN.pdf",
  partnershipCervicalScreeningQI2016:
    "https://s22457.pcdn.co/wp-content/uploads/2019/01/Cervical-Cancer-Screen-Quality-Indicators-Report-2016-EN.pdf",
  partnershipHpvAccess2022:
    "https://www.partnershipagainstcancer.ca/topics/hpv-vaccine-access-2022/",
  hpvGlobalActionPrograms:
    "https://hpvglobalaction.org/en/free-hpv-immunization-programs-by-province-territory/",
  naoRapidReview36:
    "https://naohealthobservatory.ca/wp-content/uploads/2023/06/NAO-Rapid-Review-36_EN.pdf",
  partnershipHpvDelivery:
    "https://www.partnershipagainstcancer.ca/topics/hpv-immunization-policies/hpv-vaccine-delivery/",
  cancerSocietyHpv:
    "https://cancer.ca/en/cancer-information/reduce-your-risk/get-vaccinated/human-papillomavirus-hpv",
} as const;
