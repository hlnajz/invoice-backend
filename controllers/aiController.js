const { GoogleGenAI } = require("@google/genai");
const Invoice = require("../models/Invoice");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const parseInvoiceFromText = async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: "Text is required" });

  try {
    const prompt = `
      You are an expert invoice data extraction AI. Analyze the following text and extract the relevant information to create an invoice.
      Output must be a valid JSON object with the structure:
      { "clientName": "string", "email": "string (if available)", "address": "string (if available)",
        "items": [{ "name": "string", "quantity": "number", "unitPrice": "number" }] }
      Text to parse:
      --- TEXT START ---
      ${text}
      --- TEXT END ---
      Provide only the JSON object.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const responseText = await response.response.text();
    const cleanedJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedData = JSON.parse(cleanedJson);

    res.status(200).json(parsedData);
  } catch (error) {
    console.error("Error parsing invoice with AI:", error);
    res.status(500).json({ message: "Failed to parse invoice data from text.", details: error.message });
  }
};

const generateReminderEmail = async (req, res) => {
  const { invoiceId } = req.body;
  if (!invoiceId) return res.status(400).json({ message: "Invoice ID is required" });

  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const prompt = `
      You are a polite accounting assistant. Write a friendly reminder email about an overdue or upcoming invoice.
      Use details:
      - Client Name: ${invoice.billTo.clientName}
      - Invoice Number: ${invoice.invoiceNumber}
      - Amount Due: ${invoice.total.toFixed(2)}
      - Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}
      Start the email with "Subject:". Keep it concise.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const reminderText = await response.response.text();
    res.status(200).json({ reminderText });
  } catch (error) {
    console.error("Error generating reminder email with AI:", error);
    res.status(500).json({ message: "Failed to generate reminder email.", details: error.message });
  }
};

const getDashboardSummary = async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.user.id });
    if (invoices.length === 0) return res.status(200).json({ insights: ["No invoice data available."] });

    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.status === "Paid");
    const unpaidInvoices = invoices.filter(inv => inv.status !== "Paid");
    const totalRevenue = paidInvoices.reduce((acc, inv) => acc + inv.total, 0);
    const totalOutstanding = unpaidInvoices.reduce((acc, inv) => acc + inv.total, 0);

    const dataSummary = `
      - Total invoices: ${totalInvoices}
      - Paid invoices: ${paidInvoices.length}
      - Unpaid/pending invoices: ${unpaidInvoices.length}
      - Revenue from paid invoices: ${totalRevenue.toFixed(2)}
      - Outstanding amount: ${totalOutstanding.toFixed(2)}
      - Recent 5 invoices: ${invoices
        .slice(0, 5)
        .map(inv => `#${inv.invoiceNumber} $${inv.total.toFixed(2)} status ${inv.status}`)
        .join(", ")}
    `;

    const prompt = `
      You are a friendly financial analyst. Based on the following invoice summary, provide 2–3 concise actionable insights as a JSON array:
      ${dataSummary}
      Return: { "insights": ["...", "..."] }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const responseText = await response.response.text();
    const cleanedJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedData = JSON.parse(cleanedJson);

    res.status(200).json(parsedData);
  } catch (error) {
    console.error("Error generating dashboard summary with AI:", error);
    res.status(500).json({ message: "Failed to generate AI insights.", details: error.message });
  }
};

module.exports = { parseInvoiceFromText, generateReminderEmail, getDashboardSummary };
