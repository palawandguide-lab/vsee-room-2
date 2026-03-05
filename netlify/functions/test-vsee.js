// Netlify function: diagnostic test for VSee API connectivity
// Call via GET: https://your-site.netlify.app/.netlify/functions/test-vsee

const VSEE = {
  endpoint:    'https://api.vseepreview.com/vc/stable/api_v3',
  altEndpoint: 'https://api-ejc.vseepreview.com/vc/stable/api_v3',
  accountCode: 'ejc',
  apiKey:      '1b36c0c2ae3781ee8415d7cc6dcdb519',
  apiSecret:   'b6c49f58df6aa44639fa0a799a8cc76f',
  adminToken:  '734e3500a0e75fc83d4e97b0860c2faa',
};

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

async function testEndpoint(label, url, options) {
  const result = { label, url, method: options.method || 'GET' };
  try {
    const start = Date.now();
    const res = await fetch(url, options);
    result.duration = Date.now() - start + 'ms';
    result.status = res.status;
    result.statusText = res.statusText;
    const text = await res.text();
    try { result.body = JSON.parse(text); } catch { result.body = text.substring(0, 500); }
    result.ok = res.ok;
  } catch (err) {
    result.error = err.message;
    result.ok = false;
  }
  return result;
}

exports.handler = async (event) => {
  const results = [];

  // Test 1: GET rooms with admin token — generic endpoint
  results.push(await testEndpoint(
    'GET /rooms (generic endpoint)',
    `${VSEE.endpoint}/rooms`,
    { headers: { 'X-AccountCode': VSEE.accountCode, 'X-ApiToken': VSEE.adminToken } }
  ));

  // Test 2: GET rooms with admin token — account-specific endpoint
  results.push(await testEndpoint(
    'GET /rooms (account-specific endpoint)',
    `${VSEE.altEndpoint}/rooms`,
    { headers: { 'X-AccountCode': VSEE.accountCode, 'X-ApiToken': VSEE.adminToken } }
  ));

  // Test 3: GET account info
  results.push(await testEndpoint(
    'GET /accounts/ejc.json',
    `${VSEE.endpoint}/accounts/${VSEE.accountCode}.json`,
    { headers: { 'X-AccountCode': VSEE.accountCode, 'X-ApiToken': VSEE.adminToken } }
  ));

  // Test 4: SSO with form-data — generic endpoint
  const { body: formBody, contentType: formCT } = buildFormData({
    first_name: 'Test',
    last_name: 'Patient',
    type: '200',
    email: 'test.patient.debug@example.com',
    code: 'test.patient.debug@example.com',
  });

  results.push(await testEndpoint(
    'POST /users/sso (form-data, generic)',
    `${VSEE.endpoint}/users/sso.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': formCT,
        'X-AccountCode': VSEE.accountCode,
        'X-ApiKey': VSEE.apiKey,
        'X-ApiSecret': VSEE.apiSecret,
      },
      body: formBody,
    }
  ));

  // Test 5: SSO with form-data — account-specific endpoint
  const { body: formBody2, contentType: formCT2 } = buildFormData({
    first_name: 'Test',
    last_name: 'Patient',
    type: '200',
    email: 'test.patient.debug@example.com',
    code: 'test.patient.debug@example.com',
  });

  results.push(await testEndpoint(
    'POST /users/sso (form-data, account-specific)',
    `${VSEE.altEndpoint}/users/sso.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': formCT2,
        'X-AccountCode': VSEE.accountCode,
        'X-ApiKey': VSEE.apiKey,
        'X-ApiSecret': VSEE.apiSecret,
      },
      body: formBody2,
    }
  ));

  // Test 6: SSO with JSON — generic endpoint
  results.push(await testEndpoint(
    'POST /users/sso (JSON, generic)',
    `${VSEE.endpoint}/users/sso.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AccountCode': VSEE.accountCode,
        'X-ApiKey': VSEE.apiKey,
        'X-ApiSecret': VSEE.apiSecret,
      },
      body: JSON.stringify({
        first_name: 'Test',
        last_name: 'Patient',
        type: 200,
        email: 'test.patient.debug@example.com',
        code: 'test.patient.debug@example.com',
      }),
    }
  ));

  // Test 7: SSO with JSON — account-specific endpoint
  results.push(await testEndpoint(
    'POST /users/sso (JSON, account-specific)',
    `${VSEE.altEndpoint}/users/sso.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AccountCode': VSEE.accountCode,
        'X-ApiKey': VSEE.apiKey,
        'X-ApiSecret': VSEE.apiSecret,
      },
      body: JSON.stringify({
        first_name: 'Test',
        last_name: 'Patient',
        type: 200,
        email: 'test.patient.debug@example.com',
        code: 'test.patient.debug@example.com',
      }),
    }
  ));

  // Summary
  const summary = results.map(r => `${r.ok ? '✅' : '❌'} ${r.label}: ${r.status || r.error}`);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ summary, results }, null, 2),
  };
};
