const webpush = require('web-push');
const { getStore, connectLambda } = require('@netlify/blobs');

webpush.setVapidDetails(
  'mailto:pill-tracker-app@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.config = {
  schedule: '*/5 * * * *'
};

exports.handler = async (event) => {
  connectLambda(event);
  const store = getStore('pill-tracker-subs');
  const { blobs } = await store.list();

  const jst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const currentMinutes = jst.getHours() * 60 + jst.getMinutes();
  const todayStr = `${jst.getFullYear()}-${String(jst.getMonth() + 1).padStart(2, '0')}-${String(jst.getDate()).padStart(2, '0')}`;

  for (const b of blobs) {
    const record = await store.get(b.key, { type: 'json' });
    if (!record) continue;
    const [th, tm] = (record.notifyTime || '00:00').split(':').map(Number);
    const targetMinutes = th * 60 + tm;
    const diff = Math.abs(currentMinutes - targetMinutes);
    if (diff <= 3 && record.lastSentDate !== todayStr) {
      try {
        await webpush.sendNotification(
          record.subscription,
          JSON.stringify({ title: 'ピルトラッカー', body: 'お薬の時間です。アプリを開いて記録しましょう。' })
        );
        record.lastSentDate = todayStr;
        await store.setJSON(b.key, record);
      } catch (err) {
        console.error('push failed for', b.key, err && err.message);
        if (err && (err.statusCode === 404 || err.statusCode === 410)) {
          await store.delete(b.key);
        }
      }
    }
  }
  return { statusCode: 200, body: 'ok' };
};
