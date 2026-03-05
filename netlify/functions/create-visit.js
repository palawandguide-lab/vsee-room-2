// Netlify serverless function — handles VSee API calls server-side (no CORS)

const VSEE = {
  // The API endpoint format from VSee docs: https://api-{accountcode}.vseepreview.com/vc/stable/api_v3
  endpoint:    'https://api.vseepreview.com/vc/stable/api_v3',
  altEndpoint: 'https://api-ejc.vseepreview.com/vc/stable/api_v3',
  accountCode: 'ejc',
  apiKey:      '1b36c0c2ae3781ee8415d7cc6dcdb519',
  apiSecret:   'b6c49f58df6aa44639fa0a799a8cc76f',
  adminToken:  '734e3500a0e75fc83d4e97b0860c2faa',
  portalBase:  'https://ejc.vseepreview.com/vc/stable',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// Helper: build multipart/form-data body (VSee requires this format for SSO)
function buildFormData(fields) {
  const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
  let body = '';
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') continue;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
    body += `${value}\r\n`;
  }
  body += `--${boundary}--\r\n`;
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

// Helper: try a fetch, return {ok, status, data}
async function tryFetch(url, options) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: err.message };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const patient = JSON.parse(event.body);

    if (!patient.firstName || !patient.lastName || !patient.email || !patient.reason) {
      return {
        statusCode: 400, headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing required fields: firstName, lastName, email, reason' }),
      };
    }

    // ── Step 0: Discover room code ──
    let roomCode = VSEE.accountCode;
    for (const ep of [VSEE.altEndpoint, VSEE.endpoint]) {
      try {
        const roomsRes = await tryFetch(`${ep}/rooms`, {
          headers: { 'X-AccountCode': VSEE.accountCode, 'X-ApiToken': VSEE.adminToken },
        });
        if (roomsRes.ok && Array.isArray(roomsRes.data?.data)) {
          const rooms = roomsRes.data.data;
          if (rooms.length > 0) {
            const active = rooms.find(r => r.active !== false) || rooms[0];
            roomCode = active.code || active.slug || VSEE.accountCode;
            console.log('Discovered room:', roomCode, 'from', ep);
            break;
          }
        }
      } catch (e) { console.warn('Room discovery failed on', ep, e.message); }
    }

    // ── Step 1: SSO Login (multipart/form-data as per VSee docs) ──
    const ssoFields = {
      first_name: patient.firstName,
      last_name:  patient.lastName,
      type:       '200',
      email:      patient.email,
      code:       patient.email,
    };
    if (patient.dob) ssoFields.dob = patient.dob;
    if (patient.gender) ssoFields.gender = patient.gender;
    if (patient.phone) ssoFields.phone = patient.phone;
    if (patient.address) ssoFields.street_addr = patient.address;

    const { body: ssoBody, contentType: ssoCT } = buildFormData(ssoFields);

    let ssoResult = null;
    // Try both endpoint formats
    for (const ep of [VSEE.altEndpoint, VSEE.endpoint]) {
      const url = `${ep}/users/sso.json`;
      console.log('Trying SSO at:', url);

      const res = await tryFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type':  ssoCT,
          'X-AccountCode': VSEE.accountCode,
          'X-ApiKey':      VSEE.apiKey,
          'X-ApiSecret':   VSEE.apiSecret,
        },
        body: ssoBody,
      });

      console.log('SSO response from', ep, ':', res.status, JSON.stringify(res.data).substring(0, 200));

      if (res.ok && res.data?.data?.token) {
        ssoResult = res.data;
        break;
      }

      // Also try with JSON content type as fallback
      const jsonRes = await tryFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'X-AccountCode': VSEE.accountCode,
          'X-ApiKey':      VSEE.apiKey,
          'X-ApiSecret':   VSEE.apiSecret,
        },
        body: JSON.stringify(ssoFields),
      });

      console.log('SSO JSON response from', ep, ':', jsonRes.status, JSON.stringify(jsonRes.data).substring(0, 200));

      if (jsonRes.ok && jsonRes.data?.data?.token) {
        ssoResult = jsonRes.data;
        break;
      }
    }

    if (!ssoResult) {
      return {
        statusCode: 502, headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Patient login failed on all endpoints. Please verify API credentials.' }),
      };
    }

    const token = ssoResult.data.token.token;

    // ── Step 2: Create Intake ──
    // Use the endpoint that worked for SSO
    const workingEndpoint = VSEE.altEndpoint; // prefer account-specific endpoint

    const { body: intakeBody, contentType: intakeCT } = buildFormData({
      type:             '1',
      room_code:        roomCode,
      reason_for_visit: patient.reason,
    });

    const intakeRes = await tryFetch(`${workingEndpoint}/intakes`, {
      method: 'POST',
      headers: {
        'Content-Type':  intakeCT,
        'X-AccountCode': VSEE.accountCode,
        'X-ApiToken':    token,
      },
      body: intakeBody,
    });

    console.log('Intake response:', intakeRes.status, JSON.stringify(intakeRes.data).substring(0, 200));

    if (!intakeRes.ok || !intakeRes.data?.data?.id) {
      return {
        statusCode: 502, headers: CORS_HEADERS,
        body: JSON.stringify({ error: `Intake creation failed (${intakeRes.status})`, detail: intakeRes.data }),
      };
    }

    const intakeId = intakeRes.data.data.id;

    // ── Step 3: Create Walk-in Visit ──
    const { body: visitBody, contentType: visitCT } = buildFormData({
      room_code: roomCode,
      intake_id: intakeId,
    });

    const visitRes = await tryFetch(`${workingEndpoint}/visits/add_walkin`, {
      method: 'POST',
      headers: {
        'Content-Type':  visitCT,
        'X-AccountCode': VSEE.accountCode,
        'X-ApiToken':    token,
      },
      body: visitBody,
    });

    console.log('Visit response:', visitRes.status, JSON.stringify(visitRes.data).substring(0, 200));

    if (!visitRes.ok || !visitRes.data?.data?.id) {
      return {
        statusCode: 502, headers: CORS_HEADERS,
        body: JSON.stringify({ error: `Visit creation failed (${visitRes.status})`, detail: visitRes.data }),
      };
    }

    const visitId = visitRes.data.data.id;

    // ── Build redirect URLs ──
    const videoCallUrl   = `${VSEE.portalBase}/auth?sso_token=${token}&next=/visits/start/${visitId}`;
    const waitingRoomUrl = `${VSEE.portalBase}/auth?sso_token=${token}&next=/u/clinic`;

    return {
      statusCode: 200, headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, videoCallUrl, waitingRoomUrl, visitId, roomCode }),
    };

  } catch (err) {
    console.error('Unexpected error:', err);
    return {
      statusCode: 500, headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
