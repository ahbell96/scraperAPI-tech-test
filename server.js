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

// post html doc route
app.post("/html-page", uploadFields, (req, res) => {
  const files = req.files;

  console.log("files : ", files);

  if (!files) {
    return res
      .status(400)
      .send({ status: 400, message: "no files available." });
  }

  console.log("files are available.");

  const html = files.htmlFile[0].buffer.toString("utf-8");
  const cssSelectors = JSON.parse(files.jsonFile[0].buffer.toString("utf-8"));

  // Parse the HTML file using Cheerio
  const $ = cheerio.load(html);

  // fetch the wanted content via the css Selectors
  const title = $(cssSelectors.title).text();
  const firstParagraph = $(cssSelectors.firstParagraph)
    .text()
    .replace(/\n\s+/g, "") // replace white space and escapes with blank.
    .trim();

  return res.status(200).send({
    status: 200,
    message: "Files are available.",
    data: {
      title: title ?? "",
      firstParagraph: firstParagraph,
    },
  });
});

app.listen(PORT, () => {
  console.log(`server running on localhost (http://localhost:${PORT})`);
});
