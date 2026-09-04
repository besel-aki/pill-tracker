const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async (event) => {
  connectLambda(event);

  if (event.httpMethod === 'DELETE') {
    try {
      const { id } = JSON.parse(event.body || '{}');
      if (!id) return { statusCode: 400, body: 'missing id' };
      const store = getStore('pill-tracker-subs');
      await store.delete(id);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      console.error(e);
      return { statusCode: 500, body: 'error: ' + (e && e.message ? e.message : String(e)) };
    }
  }

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
    const timeChanged = !existing || existing.notifyTime !== notifyTime;
    await store.setJSON(id, {
      subscription,
      notifyTime,
      lastSentDate: timeChanged ? null : existing.lastSentDate
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: 'error: ' + (e && e.message ? e.message : String(e)) };
  }
};
