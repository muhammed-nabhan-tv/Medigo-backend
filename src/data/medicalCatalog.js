/**
 * Medigo Comprehensive Medical Catalog
 * Curated repository of commonly prescribed medications & diagnostic/laboratory investigations.
 */

const MEDICINES = [
  // Analgesics, Antipyretics & NSAIDs
  {
    id: "med-01",
    name: "Paracetamol (Dolo 650mg)",
    generic: "Paracetamol / Acetaminophen",
    category: "Analgesic & Antipyretic",
    form: "Tablet",
    dosage: "650 mg",
    defaultFrequency: "1-0-1 (Twice daily)",
    defaultDuration: "3-5 days",
    defaultInstruction: "After food",
    frequencyOptions: ["1-0-1 (Twice daily)", "1-1-1 (Thrice daily)", "1-0-0 (Morning only)", "SOS (As needed when fever > 100°F)"],
    instructionOptions: ["After food", "With plenty of water", "Maximum 3 tablets in 24 hours"],
    isPopular: true
  },
  {
    id: "med-02",
    name: "Ibuprofen (Brufen 400mg)",
    generic: "Ibuprofen",
    category: "NSAID / Anti-inflammatory",
    form: "Tablet",
    dosage: "400 mg",
    defaultFrequency: "1-0-1 (Twice daily)",
    defaultDuration: "3 days",
    defaultInstruction: "Strictly after food",
    frequencyOptions: ["1-0-1 (Twice daily)", "1-1-1 (Thrice daily)", "SOS (Pain only)"],
    instructionOptions: ["Strictly after food", "Take with milk or antacid if gastric irritation"],
    isPopular: true
  },
  {
    id: "med-03",
    name: "Aceclofenac + Paracetamol (Zerodol-P)",
    generic: "Aceclofenac 100mg + Paracetamol 325mg",
    category: "Pain Relief / Musculoskeletal",
    form: "Tablet",
    dosage: "100mg + 325mg",
    defaultFrequency: "1-0-1 (Twice daily)",
    defaultDuration: "5 days",
    defaultInstruction: "After meals",
    frequencyOptions: ["1-0-1 (Twice daily)", "SOS (Pain)"],
    instructionOptions: ["After meals", "Do not take on empty stomach"],
    isPopular: true
  },
  {
    id: "med-04",
    name: "Tramadol + Paracetamol (Ultracet)",
    generic: "Tramadol 37.5mg + Paracetamol 325mg",
    category: "Moderate-Severe Analgesic",
    form: "Tablet",
    dosage: "37.5mg + 325mg",
    defaultFrequency: "1-0-1 (Twice daily)",
    defaultDuration: "3 days",
    defaultInstruction: "After food",
    frequencyOptions: ["1-0-1 (Twice daily)", "SOS (Severe pain)"],
    instructionOptions: ["After food", "May cause slight drowsiness; avoid driving"],
    isPopular: false
  },

  // Antibiotics & Antimicrobials
  {
    id: "med-05",
    name: "Amoxicillin + Clavulanate (Augmentin 625mg)",
    generic: "Amoxicillin 500mg + Clavulanic Acid 125mg",
    category: "Broad-Spectrum Antibiotic",
    form: "Tablet",
    dosage: "625 mg",
    defaultFrequency: "1-0-1 (Twice daily)",
    defaultDuration: "5 days",
    defaultInstruction: "At the start of meals",
    frequencyOptions: ["1-0-1 (Twice daily)", "1-1-1 (Thrice daily for severe infections)"],
    instructionOptions: ["At the start of meals", "Complete full 5-day course", "Do not skip doses"],
    isPopular: true
  },
  {
    id: "med-06",
    name: "Azithromycin (Azee 500mg)",
    generic: "Azithromycin",
    category: "Macrolide Antibiotic",
    form: "Tablet",
    dosage: "500 mg",
    defaultFrequency: "1-0-0 (Once daily)",
    defaultDuration: "3-5 days",
    defaultInstruction: "1 hour before food or 2 hours after",
    frequencyOptions: ["1-0-0 (Once daily)"],
    instructionOptions: ["1 hour before food or 2 hours after", "Take at the exact same hour each day", "Complete full course"],
    isPopular: true
  },
  {
    id: "med-07",
    name: "Ciprofloxacin (Cifran 500mg)",
    generic: "Ciprofloxacin",
    category: "Fluoroquinolone Antibiotic",
    form: "Tablet",
    dosage: "500 mg",
    defaultFrequency: "1-0-1 (Twice daily)",
    defaultDuration: "5 days",
    defaultInstruction: "2 hours after meals with water",
    frequencyOptions: ["1-0-1 (Twice daily)"],
    instructionOptions: ["Drink 2-3 liters of water daily", "Avoid dairy products within 2 hours"],
    isPopular: false
  },
  {
    id: "med-08",
    name: "Cefixime (Zifi 200mg)",
    generic: "Cefixime",
    category: "Cephalosporin Antibiotic",
    form: "Tablet",
    dosage: "200 mg",
    defaultFrequency: "1-0-1 (Twice daily)",
    defaultDuration: "5-7 days",
    defaultInstruction: "After food",
    frequencyOptions: ["1-0-1 (Twice daily)", "1-0-0 (Once daily 400mg)"],
    instructionOptions: ["After food", "Complete prescribed course"],
    isPopular: true
  },
  {
    id: "med-09",
    name: "Doxycycline (Doxicip 100mg)",
    generic: "Doxycycline",
    category: "Tetracycline Antibiotic",
    form: "Capsule",
    dosage: "100 mg",
    defaultFrequency: "1-0-1 (Twice daily)",
    defaultDuration: "7 days",
    defaultInstruction: "With full glass of water, remain upright for 30 mins",
    frequencyOptions: ["1-0-1 (Twice daily)", "1-0-0 (Once daily)"],
    instructionOptions: ["With full glass of water", "Do not lie down for 30 minutes after taking", "Avoid direct sun exposure"],
    isPopular: false
  },

  // Gastrointestinal & Proton Pump Inhibitors (PPIs)
  {
    id: "med-10",
    name: "Pantoprazole (Pan 40mg)",
    generic: "Pantoprazole",
    category: "Proton Pump Inhibitor (PPI)",
    form: "Tablet",
    dosage: "40 mg",
    defaultFrequency: "1-0-0 (Morning)",
    defaultDuration: "14 days",
    defaultInstruction: "30 minutes before breakfast on an empty stomach",
    frequencyOptions: ["1-0-0 (Morning empty stomach)", "1-0-1 (Morning and Night before food)"],
    instructionOptions: ["30 minutes before breakfast", "Swallow whole, do not crush or chew"],
    isPopular: true
  },
  {
    id: "med-11",
    name: "Rabeprazole + Domperidone (Razo-D)",
    generic: "Rabeprazole 20mg + Domperidone 30mg SR",
    category: "Gastroesophageal Reflux (GERD) / Antiemetic",
    form: "Capsule",
    dosage: "20mg + 30mg",
    defaultFrequency: "1-0-0 (Morning)",
    defaultDuration: "14 days",
    defaultInstruction: "Morning on empty stomach",
    frequencyOptions: ["1-0-0 (Morning)", "1-0-1 (Before meals)"],
    instructionOptions: ["30 minutes before breakfast", "Helps prevent acidity, nausea, and regurgitation"],
    isPopular: true
  },
  {
    id: "med-12",
    name: "Omeprazole (Omez 20mg)",
    generic: "Omeprazole",
    category: "Antacid / Acid Suppressor",
    form: "Capsule",
    dosage: "20 mg",
    defaultFrequency: "1-0-0 (Morning)",
    defaultDuration: "14 days",
    defaultInstruction: "30 minutes before breakfast",
    frequencyOptions: ["1-0-0 (Once daily)", "1-0-1 (Twice daily)"],
    instructionOptions: ["Take before food", "Drink with water"],
    isPopular: false
  },
  {
    id: "med-13",
    name: "Ondansetron (Emeset 4mg)",
    generic: "Ondansetron",
    category: "Antiemetic / Anti-nausea",
    form: "Tablet",
    dosage: "4 mg",
    defaultFrequency: "SOS (As needed for vomiting)",
    defaultDuration: "3 days",
    defaultInstruction: "30 minutes before food",
    frequencyOptions: ["SOS (As needed)", "1-0-1 (Twice daily)", "1-1-1 (Thrice daily)"],
    instructionOptions: ["Dissolves rapidly", "Take before food if nausea occurs"],
    isPopular: true
  },

  // Allergy & Respiratory
  {
    id: "med-14",
    name: "Montelukast + Levocetirizine (Montair LC)",
    generic: "Montelukast 10mg + Levocetirizine 5mg",
    category: "Anti-allergic / Bronchodilator",
    form: "Tablet",
    dosage: "10mg + 5mg",
    defaultFrequency: "0-0-1 (Night)",
    defaultDuration: "10 days",
    defaultInstruction: "At bedtime",
    frequencyOptions: ["0-0-1 (Night before sleep)", "1-0-0 (Morning)"],
    instructionOptions: ["At bedtime", "May cause mild drowsiness"],
    isPopular: true
  },
  {
    id: "med-15",
    name: "Cetirizine (Cetzine 10mg)",
    generic: "Cetirizine Hydrochloride",
    category: "Antihistamine",
    form: "Tablet",
    dosage: "10 mg",
    defaultFrequency: "0-0-1 (Night)",
    defaultDuration: "5-7 days",
    defaultInstruction: "At bedtime with water",
    frequencyOptions: ["0-0-1 (Night)", "SOS (Allergy flare-up)"],
    instructionOptions: ["May cause drowsiness; avoid driving or alcohol"],
    isPopular: true
  },
  {
    id: "med-16",
    name: "Salbutamol Inhaler (Asthalin 100mcg)",
    generic: "Salbutamol / Albuterol",
    category: "Fast-acting Bronchodilator",
    form: "Inhaler",
    dosage: "100 mcg / puff",
    defaultFrequency: "SOS (2 puffs during breathlessness)",
    defaultDuration: "As needed",
    defaultInstruction: "Inhale via spacer or direct puff, rinse mouth after",
    frequencyOptions: ["SOS (1-2 puffs)", "2 puffs twice daily"],
    instructionOptions: ["Shake inhaler well before use", "Rinse mouth thoroughly with water afterwards"],
    isPopular: true
  },
  {
    id: "med-17",
    name: "Budesonide + Formoterol (Budecort / Foracort 200)",
    generic: "Budesonide 200mcg + Formoterol 6mcg",
    category: "Asthma / COPD Maintenance Inhaler",
    form: "Inhaler",
    dosage: "200 mcg + 6 mcg",
    defaultFrequency: "1-0-1 (1 puff twice daily)",
    defaultDuration: "30 days (Continuous)",
    defaultInstruction: "Rinse mouth and gargle after each inhalation",
    frequencyOptions: ["1-0-1 (Morning & Night)", "1-0-0 (Once daily)"],
    instructionOptions: ["Rinse mouth with water and spit out to prevent fungal infections"],
    isPopular: false
  },

  // Cardiovascular & Hypertension
  {
    id: "med-18",
    name: "Amlodipine (Amlong 5mg)",
    generic: "Amlodipine Besylate",
    category: "Calcium Channel Blocker / Antihypertensive",
    form: "Tablet",
    dosage: "5 mg",
    defaultFrequency: "1-0-0 (Morning)",
    defaultDuration: "30 days (Refill)",
    defaultInstruction: "Morning with or without food",
    frequencyOptions: ["1-0-0 (Morning)", "0-0-1 (Night)"],
    instructionOptions: ["Take at the same time every day", "Do not abruptly discontinue", "Report ankle swelling if noted"],
    isPopular: true
  },
  {
    id: "med-19",
    name: "Telmisartan (Telma 40mg)",
    generic: "Telmisartan",
    category: "Angiotensin Receptor Blocker (ARB)",
    form: "Tablet",
    dosage: "40 mg",
    defaultFrequency: "1-0-0 (Morning)",
    defaultDuration: "30 days (Refill)",
    defaultInstruction: "Morning with water",
    frequencyOptions: ["1-0-0 (Morning)", "1-0-1 (Twice daily if prescribed)"],
    instructionOptions: ["Monitor BP weekly", "Maintain low sodium diet"],
    isPopular: true
  },
  {
    id: "med-20",
    name: "Atorvastatin (Atorva 10mg)",
    generic: "Atorvastatin",
    category: "Statin / Lipid-lowering",
    form: "Tablet",
    dosage: "10 mg",
    defaultFrequency: "0-0-1 (Night)",
    defaultDuration: "30 days (Refill)",
    defaultInstruction: "At bedtime after dinner",
    frequencyOptions: ["0-0-1 (Night)", "0-0-1 (20mg Night)"],
    instructionOptions: ["Best taken at night for optimal cholesterol regulation", "Follow low-fat diet"],
    isPopular: true
  },
  {
    id: "med-21",
    name: "Metoprolol Succinate (Betaloc 25mg)",
    generic: "Metoprolol Succinate ER",
    category: "Beta Blocker / Anti-anginal",
    form: "Tablet",
    dosage: "25 mg",
    defaultFrequency: "1-0-0 (Morning)",
    defaultDuration: "30 days",
    defaultInstruction: "With or immediately after food",
    frequencyOptions: ["1-0-0 (Morning)", "1-0-1 (Twice daily)"],
    instructionOptions: ["Do not skip doses", "Monitor heart rate and blood pressure"],
    isPopular: false
  },

  // Diabetes & Endocrinology
  {
    id: "med-22",
    name: "Metformin (Glycomet 500mg SR)",
    generic: "Metformin Hydrochloride Sustained Release",
    category: "Biguanide / Oral Hypoglycemic",
    form: "Tablet",
    dosage: "500 mg",
    defaultFrequency: "1-0-1 (Twice daily)",
    defaultDuration: "30 days (Refill)",
    defaultInstruction: "With or immediately after meals",
    frequencyOptions: ["1-0-0 (With breakfast)", "1-0-1 (With breakfast and dinner)", "1-1-1 (Thrice daily)"],
    instructionOptions: ["Take with meals to reduce gastrointestinal discomfort", "Regular HbA1c testing recommended"],
    isPopular: true
  },
  {
    id: "med-23",
    name: "Glimepiride (Amaryl 1mg)",
    generic: "Glimepiride",
    category: "Sulfonylurea / Antidiabetic",
    form: "Tablet",
    dosage: "1 mg",
    defaultFrequency: "1-0-0 (Morning)",
    defaultDuration: "30 days",
    defaultInstruction: "Just before or with breakfast",
    frequencyOptions: ["1-0-0 (Morning with breakfast)", "1-0-1 (Twice daily)"],
    instructionOptions: ["Always have meals on time to avoid hypoglycemia", "Keep candy or glucose handy"],
    isPopular: false
  },
  {
    id: "med-24",
    name: "Thyroxine / Levothyroxine (Thyronorm 50mcg)",
    generic: "Levothyroxine Sodium",
    category: "Thyroid Hormone Replacement",
    form: "Tablet",
    dosage: "50 mcg",
    defaultFrequency: "1-0-0 (Early Morning)",
    defaultDuration: "30-60 days",
    defaultInstruction: "Empty stomach early morning with a glass of water",
    frequencyOptions: ["1-0-0 (Morning empty stomach)"],
    instructionOptions: ["Take at least 45 minutes before tea, coffee, or breakfast", "Consistent daily timing is essential"],
    isPopular: true
  },

  // Vitamins, Minerals & Supplements
  {
    id: "med-25",
    name: "Vitamin D3 (Calcirol 60,000 IU)",
    generic: "Cholecalciferol (Vitamin D3)",
    category: "Vitamin Supplement / Bone Health",
    form: "Capsule",
    dosage: "60,000 IU",
    defaultFrequency: "Once weekly (e.g. Every Sunday)",
    defaultDuration: "8 weeks",
    defaultInstruction: "After lunch or dinner with a glass of milk",
    frequencyOptions: ["Once weekly", "Once monthly"],
    instructionOptions: ["Best absorbed with milk or fatty meal", "Follow 8-week course followed by maintenance"],
    isPopular: true
  },
  {
    id: "med-26",
    name: "Vitamin B-Complex + Zinc (Becosules)",
    generic: "Vitamin B1, B2, B6, B12, Niacinamide, Calcium Pantothenate, Zinc",
    category: "Nutritional Supplement / Mouth Ulcers",
    form: "Capsule",
    dosage: "Standard Complex",
    defaultFrequency: "1-0-0 (Once daily)",
    defaultDuration: "15-30 days",
    defaultInstruction: "After breakfast or lunch",
    frequencyOptions: ["1-0-0 (Once daily)", "1-0-1 (Twice daily)"],
    instructionOptions: ["Take after food", "May cause harmless bright yellow urine coloration"],
    isPopular: true
  },
  {
    id: "med-27",
    name: "Ferrous Ascorbate + Folic Acid (Orofer-XT)",
    generic: "Elemental Iron 100mg + Folic Acid 1.5mg",
    category: "Hematinic / Iron Deficiency Anemia",
    form: "Tablet",
    dosage: "100mg + 1.5mg",
    defaultFrequency: "0-0-1 (Night)",
    defaultDuration: "30-60 days",
    defaultInstruction: "2 hours after dinner with water, avoid milk or tea",
    frequencyOptions: ["0-0-1 (Night)", "1-0-1 (Twice daily)"],
    instructionOptions: ["Avoid dairy or tea/coffee within 2 hours of taking", "Darkening of stool is expected and harmless"],
    isPopular: true
  }
];

const DIAGNOSTIC_TESTS = [
  // Hematology & Routine Blood
  {
    id: "test-01",
    name: "Complete Blood Count (CBC) with ESR",
    category: "Hematology",
    sampleType: "Blood (EDTA)",
    turnaround: "4-6 Hours",
    defaultInstructions: "No fasting required. Hydrate normally.",
    commonIndications: "Fever, fatigue, suspected anemia, infection, baseline pre-op",
    isPopular: true
  },
  {
    id: "test-02",
    name: "Blood Sugar - Fasting (FBS)",
    category: "Biochemistry",
    sampleType: "Blood (Fluoride)",
    turnaround: "3-4 Hours",
    defaultInstructions: "Strictly 8 to 10 hours overnight fasting required. Water is permitted.",
    commonIndications: "Diabetes screening, routine metabolic checkup",
    isPopular: true
  },
  {
    id: "test-03",
    name: "Blood Sugar - Postprandial (PPBS)",
    category: "Biochemistry",
    sampleType: "Blood (Fluoride)",
    turnaround: "3-4 Hours",
    defaultInstructions: "Sample to be drawn exactly 2 hours after the start of a meal.",
    commonIndications: "Monitoring diabetes management & glycemic control",
    isPopular: true
  },
  {
    id: "test-04",
    name: "HbA1c (Glycated Hemoglobin)",
    category: "Biochemistry",
    sampleType: "Blood (EDTA)",
    turnaround: "4-6 Hours",
    defaultInstructions: "No fasting required. Reflects 3-month average glucose.",
    commonIndications: "Long-term diabetes monitoring, prediabetes diagnosis",
    isPopular: true
  },
  {
    id: "test-05",
    name: "Lipid Profile Panel (Total, HDL, LDL, VLDL, Triglycerides)",
    category: "Biochemistry",
    sampleType: "Blood (Serum)",
    turnaround: "6-8 Hours",
    defaultInstructions: "10 to 12 hours overnight fasting mandatory. Avoid alcohol 24h prior.",
    commonIndications: "Cardiovascular risk assessment, dyslipidemia, hypertension",
    isPopular: true
  },
  {
    id: "test-06",
    name: "Liver Function Test (LFT - Bilirubin, SGOT, SGPT, Alk Phos, Protein)",
    category: "Biochemistry",
    sampleType: "Blood (Serum)",
    turnaround: "6-8 Hours",
    defaultInstructions: "Overnight fasting of 8-10 hours recommended.",
    commonIndications: "Jaundice, abdominal pain, medication monitoring, liver evaluation",
    isPopular: true
  },
  {
    id: "test-07",
    name: "Kidney Function Test (KFT / RFT - Urea, BUN, Creatinine, Electrolytes)",
    category: "Biochemistry",
    sampleType: "Blood (Serum)",
    turnaround: "4-6 Hours",
    defaultInstructions: "Normal hydration. Avoid heavy meat intake 24h prior.",
    commonIndications: "Hypertension, diabetes monitoring, edema, drug dosage adjustment",
    isPopular: true
  },
  {
    id: "test-08",
    name: "Thyroid Profile Total (T3, T4, TSH)",
    category: "Endocrinology",
    sampleType: "Blood (Serum)",
    turnaround: "6-12 Hours",
    defaultInstructions: "Morning sample preferred. Take thyroid medications after blood draw.",
    commonIndications: "Weight fluctuation, fatigue, hair loss, hypo/hyperthyroidism",
    isPopular: true
  },
  {
    id: "test-09",
    name: "Urine Routine & Microscopic Examination",
    category: "Pathology",
    sampleType: "Urine (Clean Catch)",
    turnaround: "2-4 Hours",
    defaultInstructions: "Collect first morning mid-stream urine in sterile container.",
    commonIndications: "UTI symptoms, burning micturition, hematuria, proteinuria",
    isPopular: true
  },
  {
    id: "test-10",
    name: "Serum Uric Acid",
    category: "Biochemistry",
    sampleType: "Blood (Serum)",
    turnaround: "4 Hours",
    defaultInstructions: "Overnight fasting of 8 hours suggested. Avoid alcohol/red meat.",
    commonIndications: "Joint pain, suspected gout, kidney stones",
    isPopular: false
  },
  {
    id: "test-11",
    name: "Serum Vitamin D3 (25-Hydroxy)",
    category: "Endocrinology",
    sampleType: "Blood (Serum)",
    turnaround: "12-24 Hours",
    defaultInstructions: "No fasting needed.",
    commonIndications: "Bone pain, chronic fatigue, muscle weakness, osteoporosis",
    isPopular: true
  },
  {
    id: "test-12",
    name: "Serum Vitamin B12 (Cyanocobalamin)",
    category: "Biochemistry",
    sampleType: "Blood (Serum)",
    turnaround: "12-24 Hours",
    defaultInstructions: "Overnight fasting of 8 hours recommended.",
    commonIndications: "Peripheral neuropathy, tingling/numbness, megaloblastic anemia",
    isPopular: false
  },
  {
    id: "test-13",
    name: "C-Reactive Protein (Quantitative CRP)",
    category: "Immunology",
    sampleType: "Blood (Serum)",
    turnaround: "4-6 Hours",
    defaultInstructions: "No special preparation.",
    commonIndications: "Acute bacterial infection, systemic inflammatory markers",
    isPopular: false
  },
  {
    id: "test-14",
    name: "Serum Electrolytes (Na+, K+, Cl-)",
    category: "Biochemistry",
    sampleType: "Blood (Serum)",
    turnaround: "2-3 Hours",
    defaultInstructions: "No fasting required.",
    commonIndications: "Dehydration, vomiting, diarrhea, diuretic therapy, arrhythmia",
    isPopular: false
  },

  // Imaging & Cardiac Investigations
  {
    id: "test-15",
    name: "12-Lead Electrocardiogram (ECG)",
    category: "Cardiology",
    sampleType: "Non-invasive Cardiac Trace",
    turnaround: "Immediate (15 mins)",
    defaultInstructions: "Rest quietly for 10 minutes prior to test. Wear loose clothing.",
    commonIndications: "Chest pain, palpitations, shortness of breath, hypertension check",
    isPopular: true
  },
  {
    id: "test-16",
    name: "Chest X-Ray (PA View)",
    category: "Radiology",
    sampleType: "Radiographic Imaging",
    turnaround: "1-2 Hours",
    defaultInstructions: "Remove all metallic jewelry, piercings, and necklaces prior to exposure.",
    commonIndications: "Persistent cough, suspected pneumonia, breathlessness, pre-op clearance",
    isPopular: true
  },
  {
    id: "test-17",
    name: "Ultrasound Whole Abdomen & Pelvis (USG)",
    category: "Radiology",
    sampleType: "Ultrasonography",
    turnaround: "Same Day (1-2 Hours)",
    defaultInstructions: "6 hours fasting required. Drink 1 liter water 1h prior for full bladder.",
    commonIndications: "Abdominal pain, fatty liver, gallstones, renal calculi, pelvic evaluation",
    isPopular: true
  },
  {
    id: "test-18",
    name: "2D Echocardiography with Doppler (2D Echo)",
    category: "Cardiology",
    sampleType: "Cardiac Ultrasound",
    turnaround: "Same Day",
    defaultInstructions: "No fasting required. Wear comfortable two-piece clothing.",
    commonIndications: "Heart murmur, suspected heart failure, structural valve evaluation",
    isPopular: false
  }
];

module.exports = {
  MEDICINES,
  DIAGNOSTIC_TESTS
};
