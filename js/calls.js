// GAIVEX calls: 1-to-1 audio/video via WebRTC, signaling through Firestore
export function initCalls({ db, doc, setDoc, getDoc, collection, addDoc, onSnapshot, serverTimestamp, me, myName, showToast }) {
  const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] };
  let peer = null;            // { uid, name } currently open chat
  let pc = null, local = null, callId = null, otherUid = null, unsubs = [], ringTimer = null, incoming = null;

  // ---------- UI ----------
  const css = document.createElement('style');
  css.textContent = `
  .call-btn{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.08);border:1px solid var(--line-soft);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center}
  #callOv{position:fixed;inset:0;z-index:100;background:#0a0e22;display:none;flex-direction:column;align-items:center;justify-content:center}
  #callOv.show{display:flex}
  #remoteV{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000}
  #localV{position:absolute;right:12px;top:calc(12px + env(safe-area-inset-top));width:96px;height:130px;object-fit:cover;border-radius:12px;border:2px solid #fff3;background:#111;z-index:2;transform:scaleX(-1)}
  .call-info{position:relative;z-index:2;text-align:center;color:#fff;text-shadow:0 1px 6px #000}
  .call-info b{font-size:22px;display:block}
  .call-bar{position:absolute;bottom:calc(30px + env(safe-area-inset-bottom));display:flex;gap:18px;z-index:3}
  .call-bar button{width:56px;height:56px;border-radius:50%;border:none;font-size:22px;cursor:pointer;background:#ffffff26;color:#fff}
  .call-bar .red{background:#ef4444}.call-bar .green{background:#22c55e}
  .call-bar button.off{background:#fff;color:#000}`;
  document.head.appendChild(css);

  const ov = document.createElement('div');
  ov.id = 'callOv';
  ov.innerHTML = `<video id="remoteV" autoplay playsinline></video><video id="localV" autoplay playsinline muted></video>
  <div class="call-info"><b id="callName"></b><span id="callState"></span></div>
  <div class="call-bar">
    <button id="cAccept" class="green" style="display:none">📞</button>
    <button id="cMic">🎤</button><button id="cCam">📷</button>
    <button id="cEnd" class="red">✖</button></div>`;
  document.body.appendChild(ov);
  const $ = (id) => document.getElementById(id);

  // header buttons (added to the chat header)
  const head = document.querySelector('#chatView .msg-top');
  const aBtn = Object.assign(document.createElement('button'), { className: 'call-btn', textContent: '📞', title: 'Audio call' });
  const vBtn = Object.assign(document.createElement('button'), { className: 'call-btn', textContent: '🎥', title: 'Video call' });
  head.append(aBtn, vBtn);
  aBtn.onclick = () => startCall('audio');
  vBtn.onclick = () => startCall('video');

  function showOv(name, state, ringing) {
    $('callName').textContent = name; $('callState').textContent = state;
    $('cAccept').style.display = ringing ? 'flex' : 'none';
    $('cMic').style.display = $('cCam').style.display = ringing ? 'none' : 'flex';
    ov.classList.add('show');
  }
  const setState = (t) => ($('callState').textContent = t);

  // ---------- helpers ----------
  async function getMedia(type) {
    try {
      local = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
    } catch (e) { showToast('Mic/Camera permission needed'); return false; }
    $('localV').srcObject = local;
    $('localV').style.display = type === 'video' ? 'block' : 'none';
    $('cCam').style.display = type === 'video' ? 'flex' : 'none';
    return true;
  }
  function makePC(candPath) {
    pc = new RTCPeerConnection(ICE);
    local.getTracks().forEach((t) => pc.addTrack(t, local));
    pc.ontrack = (e) => { $('remoteV').srcObject = e.streams[0]; };
    pc.onicecandidate = (e) => { if (e.candidate) addDoc(collection(db, 'calls', callId, candPath), e.candidate.toJSON()).catch(() => {}); };
    pc.onconnectionstatechange = () => {
      if (pc?.connectionState === 'connected') setState('Connected');
      if (pc && ['failed', 'disconnected'].includes(pc.connectionState)) setTimeout(() => pc && pc.connectionState !== 'connected' && endCall(), 4000);
    };
  }
  function listenCandidates(path) {
    unsubs.push(onSnapshot(collection(db, 'calls', callId, path), (snap) => {
      snap.docChanges().forEach((c) => { if (c.type === 'added') pc?.addIceCandidate(new RTCIceCandidate(c.doc.data())).catch(() => {}); });
    }));
  }
  function cleanup() {
    clearTimeout(ringTimer);
    unsubs.forEach((u) => u()); unsubs = [];
    if (pc) { pc.close(); pc = null; }
    if (local) { local.getTracks().forEach((t) => t.stop()); local = null; }
    $('remoteV').srcObject = null; $('localV').srcObject = null;
    ov.classList.remove('show');
    $('cMic').classList.remove('off'); $('cCam').classList.remove('off');
    callId = null; otherUid = null; incoming = null;
  }

  // ---------- outgoing ----------
  async function startCall(type) {
    if (!peer || callId) return;
    if (!navigator.mediaDevices?.getUserMedia) return showToast('Calls need HTTPS');
    otherUid = peer.uid;
    showOv(peer.name, 'Starting…', false);
    if (!(await getMedia(type))) return cleanup();
    callId = [me.uid, peer.uid].sort().join('_') + '_' + Date.now();
    makePC('callerCandidates');
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await setDoc(doc(db, 'calls', callId), {
        callerId: me.uid, calleeId: peer.uid, type, status: 'ringing',
        offer: { type: offer.type, sdp: offer.sdp }, createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'calls_inbox', peer.uid), {
        callId, from: me.uid, fromName: myName, type, status: 'ringing', ts: Date.now(),
      });
    } catch (e) { console.error(e); showToast('Could not start call — check Firestore rules'); return cleanup(); }
    setState('Ringing…');
    unsubs.push(onSnapshot(doc(db, 'calls', callId), async (s) => {
      const d = s.data(); if (!d || !pc) return;
      if (d.answer && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(d.answer));
        listenCandidates('calleeCandidates');
        clearTimeout(ringTimer); setState('Connecting…');
      }
      if (d.status === 'declined') { showToast('Call declined'); cleanup(); }
      if (d.status === 'ended') { showToast('Call ended'); cleanup(); }
    }));
    ringTimer = setTimeout(() => { if (pc && !pc.currentRemoteDescription) { showToast('No answer'); endCall(); } }, 45000);
  }

  // ---------- incoming ----------
  unsubsInbox();
  function unsubsInbox() {
    onSnapshot(doc(db, 'calls_inbox', me.uid), (s) => {
      const d = s.data(); if (!d) return;
      if (d.status === 'ringing' && Date.now() - d.ts < 60000 && !callId && !incoming) {
        incoming = d; callId = d.callId; otherUid = d.from;
        showOv(d.fromName || 'GAIVEX user', d.type === 'video' ? 'Incoming video call…' : 'Incoming audio call…', true);
      } else if (d.status === 'ended' && incoming && incoming.callId === d.callId && !pc) {
        cleanup();
      }
    }, () => {});
  }
  async function acceptCall() {
    const d = incoming; if (!d) return;
    $('cAccept').style.display = 'none'; setState('Connecting…');
    if (!(await getMedia(d.type))) return declineCall();
    $('cMic').style.display = 'flex';
    makePC('calleeCandidates');
    const snap = await getDoc(doc(db, 'calls', callId));
    const call = snap.data();
    if (!call || call.status !== 'ringing') { showToast('Call no longer available'); return cleanup(); }
    await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
    listenCandidates('callerCandidates');
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await setDoc(doc(db, 'calls', callId), { answer: { type: answer.type, sdp: answer.sdp }, status: 'accepted' }, { merge: true });
    unsubs.push(onSnapshot(doc(db, 'calls', callId), (s) => {
      if (s.data()?.status === 'ended') { showToast('Call ended'); cleanup(); }
    }));
  }
  async function declineCall() {
    const id = callId;
    try { await setDoc(doc(db, 'calls', id), { status: 'declined' }, { merge: true }); } catch {}
    try { await setDoc(doc(db, 'calls_inbox', me.uid), { status: 'ended', callId: id }, { merge: true }); } catch {}
    cleanup();
  }
  async function endCall() {
    const id = callId, other = otherUid, wasRinging = incoming && !pc;
    if (!id) return cleanup();
    if (wasRinging) return declineCall();
    try { await setDoc(doc(db, 'calls', id), { status: 'ended' }, { merge: true }); } catch {}
    try { await setDoc(doc(db, 'calls_inbox', other), { status: 'ended', callId: id }, { merge: true }); } catch {}
    cleanup();
  }

  // ---------- controls ----------
  $('cAccept').onclick = acceptCall;
  $('cEnd').onclick = endCall;
  $('cMic').onclick = () => {
    const t = local?.getAudioTracks()[0]; if (!t) return;
    t.enabled = !t.enabled; $('cMic').classList.toggle('off', !t.enabled);
  };
  $('cCam').onclick = () => {
    const t = local?.getVideoTracks()[0]; if (!t) return;
    t.enabled = !t.enabled; $('cCam').classList.toggle('off', !t.enabled);
  };
  window.addEventListener('beforeunload', () => { if (callId) endCall(); });

  return { setPeer: (uid, name) => { peer = { uid, name }; } };
}
