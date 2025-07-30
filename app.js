const sourceEditor = ace.edit("sourceEditor");
sourceEditor.session.setMode("ace/mode/json");
sourceEditor.setTheme("ace/theme/twilight");
const targetEditor = ace.edit("targetEditor");
targetEditor.session.setMode("ace/mode/json");
targetEditor.setTheme("ace/theme/twilight");

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
  const resultDialog = document.getElementById("resultDialog");
  const resultText = document.getElementById("resultText");

  try {
    const source = JSON.parse(sourceText);
    const target = JSON.parse(targetText);

    const srcFlat = flattenJSON(source);
    const tgtFlat = flattenJSON(target);

    let resultHTML = '';

    if (ignoreValues) {
      const tgtMap = new Map(tgtFlat.map(e => [e.path, e.value]));
      let missing = [];
      let mismatched = [];

      for (const { path, value } of srcFlat) {
        if (!tgtMap.has(path)) {
          missing.push(`"${path}"`);
        } else if (tgtMap.get(path) !== value) {
          mismatched.push(`"${path}" expected ${value} but found ${tgtMap.get(path)}`);
        }
      }

      if (missing.length) {
        resultHTML += formatList('Missing', missing, 'missing');
      }
      if (mismatched.length) {
        resultHTML += formatList('Value mismatch', mismatched, 'mismatched');
      }
      if (!missing.length && !mismatched.length) resultHTML = `<div class="result success">✅ All keys from source exist in target.</div>`;
    } else {
      const tgtMap = new Map(tgtFlat.map(e => [e.path + '==' + e.value, e.path]));
      const tgtValueMap = new Map();
      tgtFlat.forEach(e => {
        if (!tgtValueMap.has(e.value)) tgtValueMap.set(e.value, []);
        tgtValueMap.get(e.value).push(e.path);
      });

      let missing = [];
      let moved = [];

      for (const { path, value } of srcFlat) {
        const key = path + '==' + value;
        if (tgtMap.has(key)) continue;
        else if (tgtValueMap.has(value)) {
          moved.push(`"${path}" with value ${value} moved to → ${tgtValueMap.get(value).join(', ')}`);
        } else {
          missing.push(`"${path}" with value ${value}`);
        }
      }

      if (missing.length) {
        resultHTML += formatList('Missing', missing, 'missing');
      }
      if (moved.length) {
        resultHTML += formatList('Possibly moved', moved, 'moved');
      }
      if (!missing.length && !moved.length) resultHTML = `<div class="result success">✅ All key-value pairs from source exist in target.</div>`;
    }
    resultText.innerHTML = resultHTML;
  } catch (e) {
    resultText.innerHTML = `<div class="result mismatched">❗ Invalid JSON input.</div>`;
  }

  resultDialog.showModal();
}
