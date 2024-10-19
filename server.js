const express = require("express");
const cheerio = require("cheerio");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.text({ type: "text/html" }));

// memory storage for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Setting up fields to store the files on upload
const uploadFields = upload.fields([
  { name: "htmlFile", maxCount: 1 }, // HTML file
  { name: "jsonFile", maxCount: 1 }, // JSON file
]);

app.get("/", (req, res) => {
  res.status(200).send("hello!");
});

app.post("/html-page", uploadFields, (req, res) => {
  try {
    const files = req.files;

    // Check if files were uploaded
    if (!files || !files.htmlFile || !files.jsonFile) {
      return res.status(400).send({
        status: 400,
        message: "Both HTML and JSON files are required.",
      });
    }

    let html, cssSelectors;

    // Check for errors when converting file buffers to strings
    try {
      html = files.htmlFile[0].buffer.toString("utf-8");
      cssSelectors = JSON.parse(files.jsonFile[0].buffer.toString("utf-8"));
    } catch (parseError) {
      return res.status(400).send({
        status: 400,
        message:
          "Invalid file format. Please ensure HTML and JSON files are valid.",
        error: parseError.message,
      });
    }

    // Check for required CSS selectors in the JSON file
    if (!cssSelectors.title || !cssSelectors.firstParagraph) {
      return res.status(400).send({
        status: 400,
        message:
          "CSS selectors for 'title' and 'firstParagraph' are required in the JSON file.",
      });
    }

    // Parse the HTML using Cheerio
    const $ = cheerio.load(html);

    // Extract data using the provided CSS selectors
    let title, firstParagraph;

    try {
      title = $(cssSelectors.title).text();
      firstParagraph = $(cssSelectors.firstParagraph)
        .text()
        .replace(/\n\s+/g, "") // Remove excess white space and newlines
        .trim();
    } catch (selectorError) {
      return res.status(400).send({
        status: 400,
        message: "Error extracting data using the provided CSS selectors.",
        error: selectorError.message,
      });
    }

    // Send the response with the extracted data
    return res.status(200).send({
      status: 200,
      message: "Files processed successfully.",
      data: {
        title: title || "Title not found",
        firstParagraph: firstParagraph || "First paragraph not found",
      },
    });
  } catch (err) {
    // Catch any other unforeseen errors
    return res.status(500).send({
      status: 500,
      message: "An unexpected error occurred.",
      error: err.message,
    });
  }
});
app.post("/extract-repetitive-data", uploadFields, (req, res) => {
  try {
    const files = req.files;

    // Check if files are present
    if (!files || !files.htmlFile || !files.jsonFile) {
      return res.status(400).send({
        status: 400,
        message: "Both HTML and JSON files are required.",
      });
    }

    let html, cssSelectors;

    // Handle file reading errors (HTML and JSON)
    try {
      html = files.htmlFile[0].buffer.toString("utf-8");
      cssSelectors = JSON.parse(files.jsonFile[0].buffer.toString("utf-8"));
    } catch (parseError) {
      return res.status(400).send({
        status: 400,
        message: "Invalid file format. Ensure HTML and JSON files are valid.",
        error: parseError.message,
      });
    }

    // Validate CSS selectors in JSON (for table row)
    if (!cssSelectors.prices || !cssSelectors.prices.tableRow) {
      return res.status(400).send({
        status: 400,
        message: "CSS selector for 'tableRow' is required in the JSON file.",
      });
    }

    // Parse HTML using Cheerio
    const $ = cheerio.load(html);

    let title,
      prices = [];

    // Extract title and ensure it's not empty
    try {
      title = $(cssSelectors.title).text().trim();
      if (!title) {
        return res.status(400).send({
          status: 400,
          message: "Title not found in the HTML document.",
        });
      }
    } catch (selectorError) {
      return res.status(400).send({
        status: 400,
        message: "Error extracting title from the HTML.",
        error: selectorError.message,
      });
    }

    // Extract prices from table rows
    try {
      // Loop through each table row (excluding headers)
      $(cssSelectors.prices.tableRow).each((index, element) => {
        if (index === 0) return; // Skip header row

        const itemName = $(element)
          .find(cssSelectors.prices.itemName)
          .text()
          .trim();
        const price = $(element).find(cssSelectors.prices.price).text().trim();

        // Ensure itemName and price exist
        if (itemName && price) {
          prices.push({
            itemName,
            price,
          });
        }
      });

      // Check if prices array is empty
      if (prices.length === 0) {
        return res.status(400).send({
          status: 400,
          message: "No valid price data found in the table rows.",
        });
      }
    } catch (selectorError) {
      return res.status(400).send({
        status: 400,
        message: "Error extracting prices from the HTML table.",
        error: selectorError.message,
      });
    }

    // Success - Return scraped data
    return res.status(200).send({
      status: 200,
      message: "Scrape complete.",
      data: {
        title,
        prices,
      },
    });
  } catch (err) {
    // Catch-all error handler for unexpected issues
    return res.status(500).send({
      status: 500,
      message: "An unexpected error occurred.",
      error: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`server running on localhost (http://localhost:${PORT})`);
});
