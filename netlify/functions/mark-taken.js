const { getStore, connectLambda } = require('@netlify/blobs');

// 通知の「飲んだ」ボタンから呼ばれる。
// アプリが開いていなくても記録できるよう、いったんサーバー側に
// 「まだアプリに反映していない服用記録(pendingTaken)」として貯めておき、
// 次にアプリが開かれたタイミングでクライアント側のデータに反映させる。
exports.handler = async (event) => {
  connectLambda(event);
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { id, date } = JSON.parse(event.body);
    if (!id || !date) {
      return { statusCode: 400, body: 'missing fields' };
    }
    const store = getStore('pill-tracker-subs');
    const existing = await store.get(id, { type: 'json' });
    if (!existing) {
      return { statusCode: 404, body: 'not subscribed yet' };
    }
    const pending = Array.isArray(existing.pendingTaken) ? existing.pendingTaken : [];
    if (!pending.includes(date)) pending.push(date);
    existing.pendingTaken = pending;
    await store.setJSON(id, existing);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: 'error: ' + (e && e.message ? e.message : String(e)) };
  }
};
