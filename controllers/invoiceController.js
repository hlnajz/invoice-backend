const Invoice = require("../models/Invoice");

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private
exports.createInvoice = async (req, res) => {
  try {
    const user = req.user;
    const {
      invoiceNumber,
      invoiceDate,
      dueDate,
      billFrom,
      billTo,
      items,
      notes,
      paymentTerms,
      
      discountPercent // discount as percentage
    } = req.body;

    // Calculate subtotal and tax
    let subtotal = 0;
    let taxTotal = 0;
    items.forEach((item) => {
      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
      subtotal += itemTotal;
      taxTotal += itemTotal * ((item.taxPercent || 0) / 100);
      item.total = itemTotal + itemTotal * ((item.taxPercent || 0) / 100); // store item total
    });

    const totalBeforeDiscount = subtotal + taxTotal;
    const discountAmount = totalBeforeDiscount * ((discountPercent || 0) / 100);
    const total = totalBeforeDiscount - discountAmount;

    const invoice = new Invoice({
      user,
      invoiceNumber,
      invoiceDate,
      dueDate,
      billFrom,
      billTo,
      items,
      discountPercent: discountPercent || 0,
      discountAmount,
      notes,
      paymentTerms,
      subtotal,
      taxTotal,
      total,
    });

    await invoice.save();
    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ message: "Error creating invoice", error: error.message });
  }
};

// @desc    Get all invoices of logged-in user
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.user.id }).populate("user", "name email");
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: "Error fetching invoices", error: error.message });
  }
};

// @desc    Get single invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate("user", "name email");
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    if (invoice.user._id.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized" });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: "Error fetching invoice", error: error.message });
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
exports.updateInvoice = async (req, res) => {
  try {
    const {
      invoiceNumber,
      invoiceDate,
      dueDate,
      billFrom,
      billTo,
      items,
      discountPercent,
      notes,
      paymentTerms,
      status,
    } = req.body;

    let subtotal = 0;
    let taxTotal = 0;
    if (items && items.length > 0) {
      items.forEach((item) => {
        const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
        subtotal += itemTotal;
        taxTotal += itemTotal * ((item.taxPercent || 0) / 100);
        item.total = itemTotal + itemTotal * ((item.taxPercent || 0) / 100);
      });
    }

    const totalBeforeDiscount = subtotal + taxTotal;
    const discountAmount = totalBeforeDiscount * ((discountPercent || 0) / 100);
    const total = totalBeforeDiscount - discountAmount;

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        invoiceNumber,
        invoiceDate,
        dueDate,
        billFrom,
        billTo,
        items,
        discountPercent: discountPercent || 0,
        discountAmount,
        notes,
        paymentTerms,
        status,
        subtotal,
        taxTotal,
        total,
      },
      { new: true }
    );

    if (!updatedInvoice) return res.status(404).json({ message: "Invoice not found" });

    res.json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ message: "Error updating invoice", error: error.message });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting invoice", error: error.message });
  }
};
