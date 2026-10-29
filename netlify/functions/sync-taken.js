const { getStore, connectLambda } = require('@netlify/blobs');

// アプリ起動時に呼ばれる。
// 通知の「飲んだ」ボタンでサーバーに貯まっている未反映の日付を取り出し、
// 取り出した分はサーバー側からクリアする。
exports.handler = async (event) => {
  connectLambda(event);
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { id } = JSON.parse(event.body);
    if (!id) {
      return { statusCode: 400, body: 'missing fields' };
    }
    const store = getStore('pill-tracker-subs');
    const existing = await store.get(id, { type: 'json' });
    const pending = (existing && Array.isArray(existing.pendingTaken)) ? existing.pendingTaken : [];
    if (existing && pending.length) {
      existing.pendingTaken = [];
      await store.setJSON(id, existing);
    }
    return { statusCode: 200, body: JSON.stringify({ dates: pending }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: 'error: ' + (e && e.message ? e.message : String(e)) };
  }
};
