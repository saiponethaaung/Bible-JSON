const fs = require("fs");
const path = require("path");
var usfm = require("usfm-parser");

async function main() {
  const language = process.argv[2] || "english";
  const version = process.argv[3] || "kjv";

  const directory = path.join(
    __dirname,
    `bible/languages/${language}/${version}`,
  );
  const directoryUsfm = path.join(directory, "usfm");
  const directoryJson = path.join(directory, "json");

  if (!fs.existsSync(directoryUsfm)) {
    console.error(`USFM directory not found: ${directoryUsfm}`);
    console.error("Usage: node converter.js <language> <version>");
    process.exit(1);
  }

  // Ensure output json directory exists
  fs.mkdirSync(directoryJson, { recursive: true });

  // Filter out non-usfm/hidden files and sort
  const files = fs
    .readdirSync(directoryUsfm)
    .filter(
      (f) => !f.startsWith(".") && (f.endsWith(".usfm") || f.endsWith(".txt")),
    )
    .sort();

  console.log(`Processing ${files.length} books for ${language}/${version}...`);

  let books = [];
  const headers = {};

  let counter = 1;
  for (const file of files) {
    const usfmString = fs
      .readFileSync(path.join(directoryUsfm, `${file}`))
      .toString();
    const usfmJSON = await usfm.toJSON(usfmString);
    books.push(usfmJSON);
    const bookNumber = counter++;
    fs.writeFileSync(
      path.join(directoryJson, `${bookNumber}.json`),
      JSON.stringify(usfmJSON, 2),
    );
    headers[bookNumber] = usfmJSON["headers"] ? usfmJSON["headers"]["h"] : file;
  }

  fs.writeFileSync(
    path.join(directory, `books.json`),
    JSON.stringify(headers, 2),
  );

  fs.writeFileSync(
    path.join(directory, "bible.json"),
    JSON.stringify([books], 2),
  );

  console.log(
    `Successfully converted ${language}/${version}! (${files.length} books)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
