const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function normalizeBase64(input) {
  let base64 = input.trim();
  const commaIndex = base64.indexOf(",");
  if (commaIndex >= 0) {
    base64 = base64.slice(commaIndex + 1);
  }
  base64 = base64.replace(/\s+/g, "");
  base64 = base64.replace(/-/g, "+").replace(/_/g, "/");
  base64 = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  const remainder = base64.length % 4;
  if (remainder > 0) {
    base64 += "=".repeat(4 - remainder);
  }
  return base64;
}

function validateBase64(input) {
  const normalized = normalizeBase64(input);
  const errors = [];

  if (normalized.length === 0) {
    errors.push("Base64 is empty after normalization.");
  }
  if (normalized.length % 4 !== 0) {
    errors.push(`Normalized Base64 length is not divisible by 4: ${normalized.length}`);
  }
  if (/[^A-Za-z0-9+/=]/.test(normalized)) {
    errors.push("Normalized string still contains invalid Base64 characters.");
  }

  let decoded;
  try {
    decoded = Buffer.from(normalized, "base64");
    if (decoded.length === 0 && normalized.length !== 0) {
      errors.push("Decoded Base64 produced zero bytes.");
    }
  } catch (ex) {
    errors.push(`Failed to decode Base64: ${ex.message}`);
  }

  if (decoded) {
    const reencoded = decoded.toString("base64");
    if (reencoded !== normalized.replace(/=+$/, "")) {
      // compare without padding because JS may normalize padding to canonical form
      const canonical = normalized.replace(/=+$/, "");
      const canonicalReencoded = reencoded.replace(/=+$/, "");
      if (canonical !== canonicalReencoded) {
        errors.push("Re-encoded Base64 does not match normalized input.");
      }
    }
  }

  return {
    normalized,
    valid: errors.length === 0,
    errors,
    buffer: decoded,
    sha256: decoded ? crypto.createHash("sha256").update(decoded).digest("hex") : null,
    size: decoded ? decoded.length : 0,
  };
}

function findLast(text, needle) {
  let idx = text.lastIndexOf(needle);
  return idx;
}

function inspectPdf(buffer) {
  const text = buffer.toString("latin1");
  const issues = [];
  const header = text.slice(0, 8);
  if (!/^%PDF-\d\.\d/.test(header)) {
    issues.push(`Invalid PDF header: ${header.replace(/\r|\n/g, "\\n")}`);
  }

  const eofIndex = findLast(text, "%%EOF");
  if (eofIndex < 0) {
    issues.push("Missing final %%EOF marker.");
  }

  const startxrefIndex = findLast(text, "startxref");
  if (startxrefIndex < 0) {
    issues.push("Missing startxref keyword.");
  }

  const xrefIndex = text.indexOf("xref");
  if (xrefIndex < 0) {
    issues.push("Missing xref section.");
  }

  if (startxrefIndex >= 0) {
    const startxrefText = text.slice(startxrefIndex, startxrefIndex + 128);
    const match = /startxref\s*(\d+)/.exec(startxrefText);
    if (match) {
      const startxref = Number(match[1]);
      if (Number.isNaN(startxref)) {
        issues.push("startxref value is not a number.");
      } else if (startxref >= buffer.length) {
        issues.push(`startxref offset ${startxref} is beyond file length ${buffer.length}.`);
      }
    } else {
      issues.push("Could not parse startxref offset.");
    }
  }

  const trailerIndex = text.lastIndexOf("trailer");
  if (trailerIndex < 0) {
    issues.push("Missing trailer dictionary.");
  }

  const streamMatches = [...text.matchAll(/stream[\r\n]+/g)];
  const endstreamMatches = [...text.matchAll(/endstream/g)];
  if (streamMatches.length !== endstreamMatches.length) {
    issues.push(`Stream count mismatch: found ${streamMatches.length} 'stream' and ${endstreamMatches.length} 'endstream'.`);
  }

  const objMatches = [...text.matchAll(/\d+\s+\d+\s+obj/g)];
  const endobjMatches = [...text.matchAll(/endobj/g)];
  if (objMatches.length !== endobjMatches.length) {
    issues.push(`Object count mismatch: found ${objMatches.length} 'obj' and ${endobjMatches.length} 'endobj'.`);
  }

  const lengthIssues = [];
  const streamRegex = /(\d+)\s+(\d+)\s+obj([\s\S]*?)\/Length\s+(\d+)([\s\S]*?)stream[\r\n]+([\s\S]*?)endstream/g;
  for (const match of text.matchAll(streamRegex)) {
    const [full, objNum, gen, lenText, lengthValue, beforeStream, streamData] = match;
    const declaredLength = Number(lengthValue);
    const actualLength = Buffer.from(streamData, "latin1").length;
    if (declaredLength !== actualLength) {
      lengthIssues.push(`Object ${objNum} ${gen}: /Length=${declaredLength}, actual=${actualLength}`);
    }
  }
  if (lengthIssues.length > 0) {
    issues.push("Stream /Length mismatches detected:\n  " + lengthIssues.join("\n  "));
  }

  return {
    header,
    size: buffer.length,
    eofIndex,
    xrefIndex,
    trailerIndex,
    startxrefIndex,
    issues,
  };
}

async function repairWithPdfLib(buffer) {
  let pdfLib;
  try {
    pdfLib = require("pdf-lib");
  } catch (ex) {
    throw new Error("pdf-lib is not installed. Run: npm install pdf-lib");
  }

  const { PDFDocument } = pdfLib;
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true, updateMetadata: false });
  const repaired = await PDFDocument.create();
  const pages = await repaired.copyPages(doc, doc.getPageIndices());
  pages.forEach((page) => repaired.addPage(page));
  return await repaired.save();
}

function printUsage() {
  console.log("Usage:");
  console.log("  node pdf-repair.js --pdf broken.pdf --out repaired.pdf");
  console.log("  node pdf-repair.js --base64 payload.txt --out repaired.pdf");
  console.log("  node pdf-repair.js --base64 payload.txt --inspect");
  console.log("  node pdf-repair.js --pdf broken.pdf --inspect");
}

async function main() {
  const args = process.argv.slice(2);
  const input = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--pdf") {
      input.pdf = args[++i];
    } else if (arg === "--base64") {
      input.base64 = args[++i];
    } else if (arg === "--out") {
      input.out = args[++i];
    } else if (arg === "--inspect") {
      input.inspect = true;
    } else if (arg === "--help") {
      printUsage();
      return;
    }
  }

  if (!input.pdf && !input.base64) {
    printUsage();
    process.exit(1);
  }

  if (input.pdf && input.base64) {
    console.error("Specify either --pdf or --base64, not both.");
    process.exit(1);
  }

  let buffer;
  if (input.pdf) {
    buffer = fs.readFileSync(path.resolve(input.pdf));
    console.log(`Loaded PDF file: ${input.pdf} (${buffer.length} bytes)`);
  } else {
    const raw = fs.readFileSync(path.resolve(input.base64), "utf8");
    const validation = validateBase64(raw);
    console.log(`Base64 normalized length: ${validation.normalized.length}`);
    console.log(`Binary size: ${validation.size} bytes`);
    console.log(`SHA-256: ${validation.sha256}`);
    if (!validation.valid) {
      console.log("Base64 validation issues:");
      validation.errors.forEach((err) => console.log(`  - ${err}`));
      if (!input.inspect) {
        process.exit(1);
      }
    }
    buffer = validation.buffer;
  }

  const result = inspectPdf(buffer);
  console.log("\nPDF inspection:");
  console.log(`  Header: ${result.header.replace(/\r|\n/g, " ")}`);
  console.log(`  Size: ${result.size} bytes`);
  console.log(`  Last %%EOF index: ${result.eofIndex}`);
  console.log(`  xref index: ${result.xrefIndex}`);
  console.log(`  trailer index: ${result.trailerIndex}`);
  console.log(`  startxref index: ${result.startxrefIndex}`);
  if (result.issues.length === 0) {
    console.log("  No structural issues detected by the basic scan.");
  } else {
    console.log("  Issues:");
    result.issues.forEach((issue) => console.log(`    - ${issue}`));
  }

  if (input.inspect) {
    return;
  }

  if (!input.out) {
    console.error("--out is required for repair.");
    process.exit(1);
  }

  try {
    const repaired = await repairWithPdfLib(buffer);
    fs.writeFileSync(path.resolve(input.out), repaired);
    console.log(`\nRepaired PDF written to ${input.out}`);
  } catch (err) {
    console.error(`\nRepair failed: ${err.message}`);
    console.error("Try installing pdf-lib with: npm install pdf-lib");
    console.error("If the PDF is severely malformed, use qpdf or another repair tool on a saved PDF file.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
