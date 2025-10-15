const express = require("express");
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
} = require("../controllers/invoiceController.js");
const { protect } = require("../middlewares/authMiddleware.js");

const router = express.Router();

router.route("/").post(protect, createInvoice).get(protect, getInvoices);

router
  .route("/:id")
  .get(protect, getInvoiceById)
  .put(protect, updateInvoice)
  .delete(protect, deleteInvoice)

module.exports = router;
