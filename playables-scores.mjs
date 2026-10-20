export function initialAudioEnabled(sdk) {
  return sdk?.IN_PLAYABLES_ENV ? Boolean(sdk.system.isAudioEnabled()) : true;
}

const number = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
export function readPersonalScores(storage) {
  const read = key => { try { return JSON.parse(storage.getItem(key)); } catch { return null; } };
  return [
    ['Endless · Normal', number(read('shape-shift-endless-best-v3'))],
    ...['easy','hard','extreme'].map(mode => ['Endless · '+mode[0].toUpperCase()+mode.slice(1), number(read('shape-shift-best-'+mode))]),
    ...[['Shape Drop','drop'],['Shape Slice','slice'],['Piano Flow','piano']].map(([name,key]) => [name,number(read('shape-shift-'+key+'-v1')?.best)])
  ];
}

export function createScoreReporter(sdk, storage) {
  let sent = -1, pending;
  return async function report() {
    if (!sdk?.IN_PLAYABLES_ENV || !sdk.engagement?.sendScore) return;
    if (pending) return pending;
    pending = (async () => {
      let best;
      while ((best=readPersonalScores(storage)[0][1])>sent) {
        await sdk.engagement.sendScore({value:best});
        sent=best;
      }
    })();
    try { await pending; } finally { pending=null; }
  };
}

export function renderPersonalScores(document, storage, live) {
  document.querySelector('#leaderboard-dialog h2').textContent='Your best scores';
  document.getElementById('leaderboard-status').textContent=live
    ? 'Your personal records are saved with YouTube. Endless Normal is also sent to YouTube as your platform high score.'
    : 'Your personal records in this browser. Global rankings are not available in this demo.';
  document.getElementById('leaderboard-reload').hidden=true;
  const rows=document.getElementById('leaderboard-rows');
  rows.replaceChildren();
  for (const [name,score] of readPersonalScores(storage)) {
    const row=document.createElement('div');row.className='personal-score-row';
    const label=document.createElement('span');label.textContent=name;
    const value=document.createElement('strong');value.textContent=score.toLocaleString();
    row.append(label,value);rows.append(row);
  }
}
