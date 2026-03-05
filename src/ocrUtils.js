import Tesseract from 'tesseract.js';

function titleCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function parseIdText(raw) {
  const lines = raw.replace(/\r/g, '\n').split('\n').map(l => l.trim()).filter(Boolean);
  const result = { firstName: '', lastName: '', dob: '', gender: '', address: '' };
  const full = lines.join(' ');

  // ── Name ──
  const ln = full.match(/(?:LN|LAST\s*NAME|SURNAME)[:\s]+([A-Z][A-Za-z'-]+)/i);
  const fn = full.match(/(?:FN|FIRST\s*NAME|GIVEN\s*NAME)[:\s]+([A-Z][A-Za-z'-]+)/i);
  if (ln) result.lastName = titleCase(ln[1]);
  if (fn) result.firstName = titleCase(fn[1]);

  if (!result.lastName || !result.firstName) {
    for (const line of lines) {
      const m = line.match(/^([A-Z]{2,})\s*,\s*([A-Z]{2,})/);
      if (m) {
        result.lastName = titleCase(m[1]);
        result.firstName = titleCase(m[2]);
        break;
      }
    }
  }

  // ── DOB ──
  const dm = full.match(/(?:DOB|DATE\s*OF\s*BIRTH|BORN|BD)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i)
           || full.match(/(\d{2}[/-]\d{2}[/-]\d{4})/);
  if (dm) {
    let [a, b, c] = dm[1].split(/[/-]/);
    if (c.length === 2) c = (parseInt(c) > 50 ? '19' : '20') + c;
    result.dob = a.length === 4
      ? `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
      : `${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
  }

  // ── Gender ──
  const gm = full.match(/(?:SEX|GENDER)[:\s]*(M|F|MALE|FEMALE)/i);
  if (gm) result.gender = /^(M|MALE)$/i.test(gm[1]) ? '1' : '2';

  // ── Address ──
  const am = full.match(/(\d{1,6}\s+[A-Za-z0-9\s,]+(?:ST|AVE|BLVD|DR|RD|LN|CT|WAY|PL|CIR|PKWY)[A-Za-z\s,]*\d{5})/i);
  if (am) result.address = am[1].replace(/\s+/g, ' ').trim();

  return result;
}

export async function recognizeImage(imageData) {
  const { data: { text } } = await Tesseract.recognize(imageData, 'eng', {
    logger: () => {},
  });
  return parseIdText(text);
}
