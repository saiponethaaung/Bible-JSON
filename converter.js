const fs = require("fs");
const path = require("path");
var usfm = require("usfm-parser");

function updateLanguagesJson(language, version, { oldTestament, newTestament, versionName }) {
  const languagesPath = path.join(__dirname, "bible/languages.json");
  if (!fs.existsSync(languagesPath)) {
    console.warn(`languages.json not found at ${languagesPath}`);
    return;
  }

  const languages = JSON.parse(fs.readFileSync(languagesPath, "utf-8"));

  // Find language entry by matching code or object key
  let langKey = Object.keys(languages).find(
    (k) => languages[k].code === language || k === language
  );

  if (!langKey) {
    langKey = language;
    languages[langKey] = {
      name: language.charAt(0).toUpperCase() + language.slice(1),
      code: language,
      versions: [],
    };
  }

  const langEntry = languages[langKey];
  if (!Array.isArray(langEntry.versions)) {
    langEntry.versions = [];
  }

  let versionEntry = langEntry.versions.find((v) => v.version === version);

  if (!versionEntry) {
    versionEntry = {
      version: version,
      name: versionName || version.charAt(0).toUpperCase() + version.slice(1),
      translations: {
        oldTestament: "Old Testament",
        newTestament: "New Testament",
      },
      oldTestament,
      newTestament,
    };
    langEntry.versions.push(versionEntry);
  } else {
    versionEntry.oldTestament = oldTestament;
    versionEntry.newTestament = newTestament;
    if (versionName && (!versionEntry.name || versionEntry.name === version)) {
      versionEntry.name = versionName;
    }
  }

  fs.writeFileSync(languagesPath, JSON.stringify(languages, null, 2) + "\n");
  console.log(`Updated bible/languages.json for [${langKey}].versions.${version}`);
}

async function main() {
  const language = process.argv[2] || "korea";
  const version = process.argv[3] || "krv";

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

  // Filter out non-usfm/hidden files, non-canonical auxiliary files (e.g. BAK, OTH, TDX), and sort numerically
  const files = fs
    .readdirSync(directoryUsfm)
    .filter((f) => !f.startsWith(".") && (f.endsWith(".usfm") || f.endsWith(".txt")))
    .filter((f) => {
      const match = f.match(/^(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num >= 2 && num <= 96;
      }
      return true;
    })
    .sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b, undefined, { numeric: true });
    });

  console.log(`Processing ${files.length} books for ${language}/${version}...`);

  let books = [];
  const headers = {};
  let otCount = 0;
  let ntCount = 0;
  let extractedVersionName = "";

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

    // Determine OT vs NT based on standard USFM book prefix (< 70 is OT/Apocrypha, >= 70 is NT)
    const match = file.match(/^(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num < 70) {
        otCount++;
      } else {
        ntCount++;
      }
    }

    // Try extracting version name from the first file's ID if available
    if (!extractedVersionName && usfmJSON["headers"] && usfmJSON["headers"]["id"]) {
      const idStr = usfmJSON["headers"]["id"];
      const parts = idStr.split(/[-–,]/);
      if (parts.length > 1) {
        const candidate = parts[1].trim();
        if (candidate.length > 2) {
          extractedVersionName = candidate;
        }
      }
    }
  }

  fs.writeFileSync(
    path.join(directory, `books.json`),
    JSON.stringify(headers, 2),
  );

  fs.writeFileSync(
    path.join(directory, "bible.json"),
    JSON.stringify([books], 2),
  );

  console.log(`Successfully converted ${language}/${version}! (${files.length} books)`);

  // Calculate OT and NT bounds
  let oldTestament, newTestament;
  if (otCount > 0 && ntCount > 0) {
    oldTestament = { start: 1, end: otCount };
    newTestament = { start: otCount + 1, end: otCount + ntCount };
  } else if (otCount > 0) {
    oldTestament = { start: 1, end: otCount };
    newTestament = { start: 0, end: 0 };
  } else {
    oldTestament = { start: 0, end: 0 };
    newTestament = { start: 1, end: ntCount || files.length };
  }

  // Automatically update languages.json
  updateLanguagesJson(language, version, {
    oldTestament,
    newTestament,
    versionName: extractedVersionName || version.charAt(0).toUpperCase() + version.slice(1),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
