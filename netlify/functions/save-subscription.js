const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = JSON.parse(event.body);
    const { id, subscription, notifyTime } = body;
    if (!id || !subscription || !notifyTime) {
      return { statusCode: 400, body: 'missing fields' };
    }
    const store = getStore('pill-tracker-subs');
    const existing = await store.get(id, { type: 'json' });
    await store.setJSON(id, {
      subscription,
      notifyTime,
      lastSentDate: existing ? existing.lastSentDate : null
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: 'error' };
  }
};
