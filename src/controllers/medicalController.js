const { MEDICINES, DIAGNOSTIC_TESTS } = require("../data/medicalCatalog");

/**
 * Search medicines with intelligent fuzzy substring matching
 * Query params: ?q=name&category=cat&limit=15
 */
const searchMedicines = async (req, res) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    const category = (req.query.category || "").trim().toLowerCase();
    const limit = parseInt(req.query.limit, 10) || 20;

    let results = MEDICINES;

    if (category) {
      results = results.filter((med) => med.category.toLowerCase().includes(category));
    }

    if (q) {
      results = results
        .map((med) => {
          const nameLower = med.name.toLowerCase();
          const genericLower = med.generic.toLowerCase();
          const categoryLower = med.category.toLowerCase();

          let score = 0;
          if (nameLower.startsWith(q)) {
            score = 100;
          } else if (nameLower.includes(q)) {
            score = 75;
          } else if (genericLower.startsWith(q)) {
            score = 60;
          } else if (genericLower.includes(q)) {
            score = 50;
          } else if (categoryLower.includes(q)) {
            score = 25;
          }

          return { ...med, score };
        })
        .filter((med) => med.score > 0)
        .sort((a, b) => b.score - a.score);
    }

    return res.status(200).json(results.slice(0, limit));
  } catch (error) {
    console.error("Search medicines error:", error);
    return res.status(500).json({ message: "Error searching medicines catalog" });
  }
};

/**
 * Search diagnostic & laboratory tests
 * Query params: ?q=testName&category=cat&limit=15
 */
const searchTests = async (req, res) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    const category = (req.query.category || "").trim().toLowerCase();
    const limit = parseInt(req.query.limit, 10) || 20;

    let results = DIAGNOSTIC_TESTS;

    if (category) {
      results = results.filter((test) => test.category.toLowerCase().includes(category));
    }

    if (q) {
      results = results
        .map((test) => {
          const nameLower = test.name.toLowerCase();
          const categoryLower = test.category.toLowerCase();
          const indicationsLower = (test.commonIndications || "").toLowerCase();

          let score = 0;
          if (nameLower.startsWith(q)) {
            score = 100;
          } else if (nameLower.includes(q)) {
            score = 75;
          } else if (categoryLower.includes(q)) {
            score = 40;
          } else if (indicationsLower.includes(q)) {
            score = 30;
          }

          return { ...test, score };
        })
        .filter((test) => test.score > 0)
        .sort((a, b) => b.score - a.score);
    }

    return res.status(200).json(results.slice(0, limit));
  } catch (error) {
    console.error("Search tests error:", error);
    return res.status(500).json({ message: "Error searching diagnostic tests catalog" });
  }
};

/**
 * Get popular medicines and standard screening tests for 1-click UI chips
 */
const getPopularItems = async (req, res) => {
  try {
    const popularMedicines = MEDICINES.filter((m) => m.isPopular);
    const popularTests = DIAGNOSTIC_TESTS.filter((t) => t.isPopular);

    return res.status(200).json({
      medicines: popularMedicines,
      tests: popularTests,
    });
  } catch (error) {
    console.error("Get popular medical items error:", error);
    return res.status(500).json({ message: "Error loading popular medical catalog" });
  }
};

module.exports = {
  searchMedicines,
  searchTests,
  getPopularItems,
};
