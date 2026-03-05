// Netlify serverless function — handles VSee API calls server-side (no CORS issues)

const VSEE = {
  endpoint:    'https://api.vseepreview.com/vc/stable/api_v3',
  accountCode: 'ejc',
  apiKey:      '1b36c0c2ae3781ee8415d7cc6dcdb519',
  apiSecret:   'b6c49f58df6aa44639fa0a799a8cc76f',
  adminToken:  '734e3500a0e75fc83d4e97b0860c2faa',
  portalBase:  'https://ejc.vseepreview.com/vc/stable',
};

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const patient = JSON.parse(event.body);

    // Validate required fields
    if (!patient.firstName || !patient.lastName || !patient.email || !patient.reason) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: firstName, lastName, email, reason' }),
      };
    }

    // ── Step 0: Discover room code ──
    let roomCode = VSEE.accountCode;
    try {
      const roomsRes = await fetch(`${VSEE.endpoint}/rooms`, {
        headers: {
          'X-AccountCode': VSEE.accountCode,
          'X-ApiToken':    VSEE.adminToken,
        },
      });
      if (roomsRes.ok) {
        const roomsJson = await roomsRes.json();
        const rooms = roomsJson.data;
        if (Array.isArray(rooms) && rooms.length > 0) {
          const active = rooms.find(r => r.active !== false) || rooms[0];
          roomCode = active.code || active.slug || VSEE.accountCode;
        }
      }
    } catch (e) {
      console.warn('Room discovery failed, using fallback:', e.message);
    }

    // ── Step 1: SSO Login ──
    const ssoBody = {
      first_name: patient.firstName,
      last_name:  patient.lastName,
      type:       200,
      email:      patient.email,
      code:       patient.email,
    };
    if (patient.dob)     ssoBody.dob        = patient.dob;
    if (patient.gender)  ssoBody.gender     = parseInt(patient.gender);
    if (patient.phone)   ssoBody.phone      = patient.phone;
    if (patient.address) ssoBody.street_addr = patient.address;

    const ssoRes = await fetch(`${VSEE.endpoint}/users/sso?fields=vsee`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-AccountCode': VSEE.accountCode,
        'X-ApiKey':      VSEE.apiKey,
        'X-ApiSecret':   VSEE.apiSecret,
      },
      body: JSON.stringify(ssoBody),
    });

    if (!ssoRes.ok) {
      const err = await ssoRes.text();
      console.error('SSO failed:', ssoRes.status, err);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: `Patient login failed (${ssoRes.status})`, detail: err }),
      };
    }

    const ssoData = await ssoRes.json();
    const token = ssoData.data.token.token;
    const userId = ssoData.data.id;

    // ── Step 2: Create Intake ──
    const intakeRes = await fetch(`${VSEE.endpoint}/intakes`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-AccountCode': VSEE.accountCode,
        'X-ApiToken':    token,
      },
      body: JSON.stringify({
        type:             1,
        room_code:        roomCode,
        reason_for_visit: patient.reason,
      }),
    });

    if (!intakeRes.ok) {
      const err = await intakeRes.text();
      console.error('Intake failed:', intakeRes.status, err);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: `Intake creation failed (${intakeRes.status})`, detail: err }),
      };
    }

    const intakeData = await intakeRes.json();
    const intakeId = intakeData.data.id;

    // ── Step 3: Create Walk-in Visit ──
    const visitRes = await fetch(`${VSEE.endpoint}/visits/add_walkin`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-AccountCode': VSEE.accountCode,
        'X-ApiToken':    token,
      },
      body: JSON.stringify({
        room_code:  roomCode,
        intake_id:  intakeId,
      }),
    });

    if (!visitRes.ok) {
      const err = await visitRes.text();
      console.error('Visit failed:', visitRes.status, err);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: `Visit creation failed (${visitRes.status})`, detail: err }),
      };
    }

    const visitData = await visitRes.json();
    const visitId = visitData.data.id;

    // ── Build redirect URLs ──
    const videoCallUrl   = `${VSEE.portalBase}/auth?sso_token=${token}&next=/visits/start/${visitId}`;
    const waitingRoomUrl = `${VSEE.portalBase}/auth?sso_token=${token}&next=/u/clinic`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        videoCallUrl,
        waitingRoomUrl,
        visitId,
        roomCode,
      }),
    };

  } catch (err) {
    console.error('Unexpected error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
