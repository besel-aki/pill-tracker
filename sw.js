self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // 特別なオフライン処理はしていませんが、Service Workerが
  // fetchイベントを持つことでインストール判定が安定します。
});

self.addEventListener('push', (event) => {
  let payload = { title: 'ピルトラッカー', body: 'お薬の時間です。', mode: 'dosing' };
  try{
    if(event.data) payload = event.data.json();
  }catch(e){
    if(event.data) payload.body = event.data.text();
  }
  const mode = payload.mode || 'dosing';
  const options = {
    body: payload.body || '',
    tag: 'pill-daily',
    data: { mode }
  };
  // 休薬期間中は「飲んだ」ボタンを出さない(ホーム画面のボタンと同じ扱い)
  if(mode !== 'resting'){
    options.actions = [{ action: 'taken', title: '飲んだ' }];
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'ピルトラッカー', options)
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();

  if(e.action === 'taken'){
    e.waitUntil(markTakenFromNotification());
    return;
  }

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});

/* ---------- 通知の「飲んだ」ボタン用 ---------- */
function swIdbOpen(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open('pill-tracker-fs', 1);
    req.onupgradeneeded = ()=>{ req.result.createObjectStore('handles'); };
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
}
async function swIdbGet(key){
  const db = await swIdbOpen();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction('handles', 'readonly');
    const req = tx.objectStore('handles').get(key);
    req.onsuccess = ()=>resolve(req.result || null);
    req.onerror = ()=>reject(req.error);
  });
}
function swTodayStrJST(){
  const jst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  return `${jst.getFullYear()}-${String(jst.getMonth() + 1).padStart(2, '0')}-${String(jst.getDate()).padStart(2, '0')}`;
}
async function markTakenFromNotification(){
  try{
    const id = await swIdbGet('deviceId');
    if(!id) return;
    const date = swTodayStrJST();
    await fetch('/.netlify/functions/mark-taken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, date })
    });
    // アプリがバックグラウンドで開いていれば即座に反映させる
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for(const client of clientList){
      client.postMessage({ type: 'pill-taken-from-notification', date });
    }
  }catch(err){
    console.error('markTakenFromNotification failed', err);
  }
}
