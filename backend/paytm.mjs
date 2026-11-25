import crypto from 'node:crypto';

const PAYTM_IV = Buffer.from('@@@@&&&&####$$$$', 'utf8');

export function paytmHost(env = 'staging') {
  return String(env).toLowerCase() === 'production'
    ? 'https://secure.paytmpayments.com'
    : 'https://securestage.paytmpayments.com';
}

export function getPaytmConfig(envObj = process.env) {
  const env = String(envObj.PAYTM_ENV || 'staging').toLowerCase() === 'production' ? 'production' : 'staging';
  const mid = String(envObj.PAYTM_MID || '').trim();
  const merchantKey = String(envObj.PAYTM_MERCHANT_KEY || '').trim();
  const website = String(envObj.PAYTM_WEBSITE || (env === 'production' ? 'DEFAULT' : 'WEBSTAGING')).trim();
  const port = Number(envObj.PORT || 4174);
  const callbackUrl = String(envObj.PAYTM_CALLBACK_URL || `http://localhost:${port}/api/payments/paytm/callback`).trim();
  const configured = Boolean(mid && merchantKey && merchantKey.length >= 16);
  return {
    configured,
    env,
    mid,
    merchantKey,
    website,
    host: paytmHost(env),
    callbackUrl
  };
}

function normalizeAesKey(key) {
  const buf = Buffer.from(String(key || ''), 'utf8');
  if (buf.length < 16) {
    throw new Error('Paytm merchant key must be at least 16 characters.');
  }
  return buf.subarray(0, 16);
}

export function generateSalt(length = 4) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

export function encrypt(input, key) {
  const cipher = crypto.createCipheriv('aes-128-cbc', normalizeAesKey(key), PAYTM_IV);
  let encrypted = cipher.update(String(input), 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

export function decrypt(encrypted, key) {
  const decipher = crypto.createDecipheriv('aes-128-cbc', normalizeAesKey(key), PAYTM_IV);
  let decrypted = decipher.update(String(encrypted), 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function paramsToString(params) {
  if (typeof params === 'string') return params;
  const obj = params && typeof params === 'object' ? params : {};
  const keys = Object.keys(obj).sort();
  return keys
    .map(k => {
      const val = obj[k];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.toLowerCase() === 'null' ? '' : str;
    })
    .join('|');
}

export function generateSignature(bodyOrParams, key, salt = generateSalt(4)) {
  const payload = paramsToString(bodyOrParams);
  const hash = crypto.createHash('sha256').update(`${payload}|${salt}`).digest('hex');
  return encrypt(`${hash}${salt}`, key);
}

export function verifySignature(bodyOrParams, key, checksum) {
  try {
    if (!checksum) return false;
    const decrypted = decrypt(checksum, key);
    if (decrypted.length < 5) return false;
    const salt = decrypted.slice(-4);
    const expected = generateSignature(bodyOrParams, key, salt);
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(String(checksum), 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function initiatePaytmTransaction({
  config,
  orderId,
  amount,
  customerId,
  email = '',
  phone = '',
  callbackUrl
}) {
  const body = {
    requestType: 'Payment',
    mid: config.mid,
    websiteName: config.website,
    orderId,
    callbackUrl: callbackUrl || config.callbackUrl,
    txnAmount: {
      value: Number(amount).toFixed(2),
      currency: 'INR'
    },
    userInfo: {
      custId: String(customerId || `CUST_${orderId}`).slice(0, 64),
      ...(email ? { email: String(email).slice(0, 120) } : {}),
      ...(phone ? { mobile: String(phone).replace(/[^0-9+]/g, '').slice(0, 15) } : {})
    }
  };

  const signature = generateSignature(JSON.stringify(body), config.merchantKey);
  const endpoint = `${config.host}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(config.mid)}&orderId=${encodeURIComponent(orderId)}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, head: { signature } })
  });
  const json = await res.json();
  const resultInfo = json?.body?.resultInfo || {};
  const txnToken = json?.body?.txnToken || '';
  if (!res.ok || !txnToken) {
    throw new Error(resultInfo.resultMsg || 'Paytm initiateTransaction failed.');
  }
  return { txnToken, resultInfo };
}

export async function fetchPaytmTransactionStatus({ config, orderId }) {
  const body = { mid: config.mid, orderId };
  const signature = generateSignature(JSON.stringify(body), config.merchantKey);
  const res = await fetch(`${config.host}/v3/order/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, head: { signature } })
  });
  const json = await res.json();
  const resBody = json?.body || {};
  const resultInfo = resBody.resultInfo || {};
  return {
    resultStatus: resultInfo.resultStatus || 'PENDING',
    resultCode: resultInfo.resultCode || '',
    resultMsg: resultInfo.resultMsg || '',
    txnId: resBody.txnId || '',
    bankTxnId: resBody.bankTxnId || '',
    paymentMode: resBody.paymentMode || '',
    txnAmount: resBody.txnAmount || ''
  };
}
