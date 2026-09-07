const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async (event) => {
  connectLambda(event);
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { id, mode } = JSON.parse(event.body);
    if (!id || !mode) {
      return { statusCode: 400, body: 'missing fields' };
    }
    const store = getStore('pill-tracker-subs');
    const existing = await store.get(id, { type: 'json' });
    if (!existing) {
      return { statusCode: 404, body: 'not subscribed yet' };
    }
    existing.mode = mode;
    await store.setJSON(id, existing);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: 'error: ' + (e && e.message ? e.message : String(e)) };
  }
};
