const sourceEditor = ace.edit("sourceEditor");
sourceEditor.session.setMode("ace/mode/json");
sourceEditor.setTheme("ace/theme/twilight");
const targetEditor = ace.edit("targetEditor");
targetEditor.session.setMode("ace/mode/json");
targetEditor.setTheme("ace/theme/twilight");

const resultDialog = document.getElementById("resultDialog");
const resultText = document.getElementById("resultText");

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

function formatList(title, items, cls) {
  return `<div class="result ${cls}"><strong>${title}:</strong><ul><li>${items.join('</li><li>')}</li></ul></div>`;
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
          missing.push(`"${path}"`);
        }
      }

      if (missing.length) {
        resultHTML += formatList('❌ Missing', missing, 'missing');
      } else {
        resultHTML = `<div class="result success">✅ All keys from source exist in target.</div>`;
      }
    } else {
      const tgtSet = new Set(tgtFlat.map(e => e.path + '==' + e.value));
      let missing = [];

      for (const { path, value } of srcFlat) {
        const key = path + '==' + value;
        if (!tgtSet.has(key)) {
          missing.push(`"${path}" with value ${value}`);
        }
      }

      if (missing.length) {
        resultHTML += formatList('❌ Missing', missing, 'missing');
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
