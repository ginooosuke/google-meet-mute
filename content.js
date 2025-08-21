function findMuteButton() {
  const muteButtons = [
    'button[data-tooltip*="マイク"]',
    'button[data-tooltip*="mute"]',
    'button[data-tooltip*="Mute"]',
    'button[aria-label*="マイク"]',
    'button[aria-label*="mute"]',
    'button[aria-label*="Mute"]',
    'button[aria-label*="microphone"]',
    'button[aria-label*="Microphone"]'
  ];

  for (const selector of muteButtons) {
    const button = document.querySelector(selector);
    if (button) {
      return button;
    }
  }

  const buttons = document.querySelectorAll('button');
  for (const button of buttons) {
    const ariaLabel = button.getAttribute('aria-label') || '';
    const tooltip = button.getAttribute('data-tooltip') || '';
    const text = button.textContent || '';

    if (ariaLabel.toLowerCase().includes('mic') ||
        ariaLabel.toLowerCase().includes('mute') ||
        tooltip.toLowerCase().includes('mic') ||
        tooltip.toLowerCase().includes('mute') ||
        text.toLowerCase().includes('mic') ||
        text.toLowerCase().includes('mute') ||
        ariaLabel.includes('マイク') ||
        tooltip.includes('マイク') ||
        text.includes('マイク')) {
      return button;
    }
  }

  return null;
}

function toggleMute() {
  const muteButton = findMuteButton();
  if (muteButton) {
    muteButton.click();

    const currentState = muteButton.getAttribute('aria-pressed') === 'true' ? 'ミュート中' : 'ミュート解除';
    console.log(`Google Meet: ${currentState}`);

    return true;
  } else {
    console.error('Google Meet: ミュートボタンが見つかりませんでした');
    return false;
  }
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
