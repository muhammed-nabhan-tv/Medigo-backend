const express = require("express");
const router = express.Router();
const {
  searchMedicines,
  searchTests,
  getPopularItems,
} = require("../controllers/medicalController");

// Public search endpoints for autocomplete & quick chips
router.get("/medicines", searchMedicines);
router.get("/tests", searchTests);
router.get("/popular", getPopularItems);

module.exports = router;
