const sourceEditor = ace.edit("sourceEditor");
sourceEditor.session.setMode("ace/mode/json");
sourceEditor.setTheme("ace/theme/twilight");
const targetEditor = ace.edit("targetEditor");
targetEditor.session.setMode("ace/mode/json");
targetEditor.setTheme("ace/theme/twilight");

const resultDialog = document.getElementById("resultDialog");
const resultText = document.getElementById("resultText");
const closeDialogBtn = document.getElementById("closeDialog");

closeDialogBtn.addEventListener('click', () => {
  resultDialog.close();
});

resultDialog.addEventListener('click', (e) => {
  if (e.target === resultDialog) {
    resultDialog.close();
  }
});

function flattenJSON(obj, path = '') {
  let result = [];
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      result.push(...flattenJSON(item, `${path}[${index}]`));
    });
  } else if (obj !== null && typeof obj === 'object') {
    for (let key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      result.push(...flattenJSON(obj[key], path ? `${path}.${key}` : key));
    }
  } else {
    result.push({ path, value: JSON.stringify(obj) });
  }
  return result;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatMissing(items, includeValues) {
  const groups = {};
  for (const it of items) {
    const idx = it.path.indexOf('.');
    let group = '';
    let field = it.path;
    if (idx !== -1) {
      group = it.path.slice(0, idx);
      field = it.path.slice(idx + 1);
    }
    if (!groups[group]) groups[group] = [];
    groups[group].push({ field, value: it.value });
  }

  const lines = [];
  for (const group of Object.keys(groups).sort()) {
    const entries = groups[group];
    const maxLen = Math.max(...entries.map(e => e.field.length));
    if (group) {
      lines.push(`❯ ${escapeHtml(group)}:`);
    }
    const indent = group ? '    ' : '';
    for (const { field, value } of entries) {
      const padded = field.padEnd(maxLen, ' ');
      if (includeValues && value !== undefined) {
        lines.push(`${indent}✘ ${escapeHtml(padded)} = ${escapeHtml(value)}`);
      } else {
        lines.push(`${indent}✘ ${escapeHtml(field)}`);
      }
    }
  }
  return `<div class="result missing"><pre>${lines.join('\n')}</pre></div>`;
}

function compareJSON() {
  const sourceText = sourceEditor.getValue();
  const targetText = targetEditor.getValue();
  const ignoreValues = document.getElementById("ignoreValues").checked;

  try {
    const source = JSON.parse(sourceText);
    const target = JSON.parse(targetText);

    const srcFlat = flattenJSON(source);
    const tgtFlat = flattenJSON(target);

    let resultHTML = '';

    if (ignoreValues) {
      const tgtSet = new Set(tgtFlat.map(e => e.path));
      let missing = [];

      for (const { path } of srcFlat) {
        if (!tgtSet.has(path)) {
          missing.push({ path });
        }
      }

      if (missing.length) {
        resultHTML += formatMissing(missing, false);
      } else {
        resultHTML = `<div class="result success">✅ All keys from source exist in target.</div>`;
      }
    } else {
      const tgtSet = new Set(tgtFlat.map(e => e.path + '==' + e.value));
      let missing = [];

      for (const { path, value } of srcFlat) {
        const key = path + '==' + value;
        if (!tgtSet.has(key)) {
          missing.push({ path, value });
        }
      }

      if (missing.length) {
        resultHTML += formatMissing(missing, true);
      } else {
        resultHTML = `<div class="result success">✅ All key-value pairs from source exist in target.</div>`;
      }
    }
    resultText.innerHTML = resultHTML;
  } catch (e) {
    resultText.innerHTML = `<div class="result mismatched">❗ Invalid JSON input.</div>`;
  }

  resultDialog.showModal();
}
