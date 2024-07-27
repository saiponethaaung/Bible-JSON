const fs = require("fs");
const path = require("path");
var usfm = require("usfm-parser");

async function main() {
  const language = "myanmar";
  const version = "judson";
  const directory = path.join(
    __dirname,
    `bible/languages/${language}/${version}`
  );
  const directoryUsfm = path.join(
    __dirname,
    `bible/languages/${language}/${version}/usfm`
  );
  const files = await fs.readdirSync(directoryUsfm);
  let books = [];

  let counter = 1;
  for (const file of files) {
    const usfmString = await fs
      .readFileSync(path.join(directoryUsfm, `${file}`))
      .toString();
    const usfmJSON = await usfm.toJSON(usfmString);
    books.push(usfmJSON);
    await fs.writeFileSync(
      path.join(directory, `json/${counter++}.json`),
      JSON.stringify(usfmJSON)
    );
  }

  await fs.writeFileSync(
    path.join(directory, "bible.json"),
    JSON.stringify([books])
  );
}

main();
