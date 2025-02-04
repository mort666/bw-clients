const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Path to the built index.html file. The expectation is that this file contains <script> tags to generate checksums for.
const indexFile = process.argv.slice(2);
const indexFileDir = path.dirname(indexFile[0]);

// Read the index.html file.
const index = fs.readFileSync(indexFile[0], "utf8");

// Extract all the script tags.
// captures the src tag in the `src` group and any inline script in the `inline` group.
const scripts = index.matchAll(
  /<script[^>]*?(?:src=(["\'])(?<src>(?:[\s\S](?!\1|>))*[\s\S]?)\1)?>(?<inline>[\s\S]*?)<\/script>/gm,
);

const checksums = {
  inline: [],
};

for (const match of scripts) {
  const src = match.groups.src;
  const inline = match.groups.inline;
  if (src) {
    const file = src;
    const fileContent = fs.readFileSync(path.join(indexFileDir, file), "utf8");
    checksums[file] = crypto.createHash("sha256").update(fileContent).digest("hex");
  }
  if (inline) {
    checksums.inline.push(crypto.createHash("sha256").update(inline).digest("hex"));
  }
}

console.log(JSON.stringify(checksums, null, 2));
