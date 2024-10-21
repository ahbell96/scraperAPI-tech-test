const express = require("express");
const cheerio = require("cheerio");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.text({ type: "text/html" }));

// memory storage for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Setting up fields to store the files on upload,
// otherwise the routes wont be able to take in files directly
const uploadFields = upload.fields([
  { name: "htmlFile", maxCount: 1 }, // HTML file
  { name: "jsonFile", maxCount: 1 }, // JSON file
]);

app.get("/", (_req, res) => {
  res.status(200).send("hello!");
});

app.post("/extract-data", uploadFields, (req, res) => {
  let files, html, cssSelectors;

  if (req.files) {
    files = req.files;
  }

  // check to see if the files exist.
  if (!files || !files.htmlFile || !files.jsonFile) {
    return res.status(400).send({
      status: 400,
      message: "HTML and JSON files are needed.",
    });
  }

  // Manage individual files and throw error if errors
  try {
    html = files.htmlFile[0].buffer.toString("utf-8");
    cssSelectors = JSON.parse(files.jsonFile[0].buffer.toString("utf-8"));
  } catch (parseError) {
    return res.status(400).send({
      status: 400,
      message:
        "Invalid file format. Ensure HTML and JSON files are there / valid.",
      error: parseError.message,
    });
  }

  // If all good, load HTML into cheerio.
  const $ = cheerio.load(html);
  const extractedData = {};

  for (const key in cssSelectors) {
    const selector = cssSelectors[key];

    if (typeof selector === "string") {
      // Handle single elements
      extractedData[key] = $(selector)
        .first()
        .text()
        .replace(/\n\s+/g, "") // remove excess whitespace and newline escapes
        .trim();
    } else if (typeof selector === "object" && selector.__root) {
      // prepare array for table rows
      const data = [];

      // in this case, going through each table tr
      $(selector.__root).each((index, element) => {
        // ignore initial headers from table
        if (index === 0) {
          return;
        }

        // prepare item data obj
        const itemData = {};

        // loop through the table row data via the cssSelector key
        for (const subKey in selector) {
          if (subKey !== "__root") {
            itemData[subKey] = $(element).find(selector[subKey]).text().trim();
          }
        }

        // push to array
        data.push(itemData);
      });
      extractedData[key] = data;
    }
  }

  // return 200 with wanted data
  return res.status(200).send({
    status: 200,
    data: extractedData,
  });
});

app.listen(PORT, () => {
  console.log(`server running on localhost (http://localhost:${PORT})`);
});

module.exports.app;
