// 自分のマイクボタンかどうかをラベルから判定するためのパターン
const MIC_PATTERN = /マイク|microphone|\bmic\b/i;
const CAMERA_PATTERN = /カメラ|camera/i;
// 他の参加者に対する操作ボタン（例:「〇〇 さんのマイクをミュート」「Mute 〇〇's microphone」）を弾く
const OTHER_PARTICIPANT_PATTERN = /さんの|さんを|'s\s/i;

function getLabel(element) {
  return `${element.getAttribute('aria-label') || ''} ${element.getAttribute('data-tooltip') || ''}`;
}

function isOwnMicLabel(label) {
  return MIC_PATTERN.test(label) &&
    !CAMERA_PATTERN.test(label) &&
    !OTHER_PARTICIPANT_PATTERN.test(label);
}

function isInOtherParticipantUi(element) {
  return Boolean(
    element.closest('[data-participant-id]') ||
    element.closest('[role="dialog"]') ||
    element.closest('[role="menu"]') ||
    element.closest('.participants') ||
    element.closest('[data-testid="participant"]')
  );
}

function findMuteButton() {
  // 1. data-is-muted が付くのは自分のマイク/カメラボタンだけなので最優先で使う
  for (const element of document.querySelectorAll('[data-is-muted]')) {
    if (isOwnMicLabel(getLabel(element))) {
      return element;
    }
  }

  // 2. jsname による特定。Google 側の更新で変わりうるため 2 番手に置く
  const buttonByJsname = document.querySelector('button[jsname="hw0c9"]');
  if (buttonByJsname && !isInOtherParticipantUi(buttonByJsname)) {
    return buttonByJsname;
  }

  // 3. フォールバック: ラベルから探す。他の参加者を誤ってミュートしないよう除外を徹底する
  for (const element of document.querySelectorAll('button, [role="button"]')) {
    if (isInOtherParticipantUi(element)) {
      continue;
    }
    if (isOwnMicLabel(getLabel(element))) {
      return element;
    }
  }

  return null;
}

function toggleMute() {
  const muteButton = findMuteButton();
  if (!muteButton) {
    console.error('Google Meet: 自分のマイクボタンが見つかりませんでした');
    return false;
  }

  // data-is-muted はクリック前の状態を指すため、切り替え後の状態は反転させて表示する
  const wasMuted = muteButton.getAttribute('data-is-muted') === 'true';
  muteButton.click();
  console.log(`Google Meet: ${wasMuted ? 'ミュート解除' : 'ミュート中'}`);

  return true;
}


chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ status: 'ready' });
    return true;
  }

  if (request.action === 'toggleMute') {
    const success = toggleMute();
    sendResponse({ success });
    return true;
  }
});

console.log('Google Meet Mute Controller: Content script loaded');
