const fs = require("fs");
const path = require("path");
var usfm = require("usfm-parser");

async function main() {
  const language = "english";
  const version = "kjv";
  const directory = path.join(
    __dirname,
    `bible/languages/${language}/${version}`,
  );
  const directoryUsfm = path.join(
    __dirname,
    `bible/languages/${language}/${version}/usfm`,
  );
  const files = await fs.readdirSync(directoryUsfm);
  let books = [];
  const headers = {};

  let counter = 1;
  for (const file of files) {
    const usfmString = await fs
      .readFileSync(path.join(directoryUsfm, `${file}`))
      .toString();
    const usfmJSON = await usfm.toJSON(usfmString);
    books.push(usfmJSON);
    const bookNumber = counter++;
    await fs.writeFileSync(
      path.join(directory, `json/${bookNumber}.json`),
      JSON.stringify(usfmJSON, 2),
    );
    headers[bookNumber] = usfmJSON["headers"]["h"];
  }

  await fs.writeFileSync(
    path.join(directory, `books.json`),
    JSON.stringify(headers, 2),
  );

  await fs.writeFileSync(
    path.join(directory, "bible.json"),
    JSON.stringify([books], 2),
  );
}

main();
