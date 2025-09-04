function findMuteButton() {
  console.log('🔍 Starting mute button search...');
  
  // 自分のコントロールバーのミュートボタンを優先的に検索
  const controlBarSelectors = [
    // Google Meetのコントロールバー内のミュートボタン
    '[data-testid="control-bar"] button[data-tooltip*="マイク"]',
    '[data-testid="control-bar"] button[data-tooltip*="mute"]',
    '[data-testid="control-bar"] button[data-tooltip*="Mute"]',
    '[data-testid="control-bar"] button[aria-label*="マイク"]',
    '[data-testid="control-bar"] button[aria-label*="mute"]',
    '[data-testid="control-bar"] button[aria-label*="Mute"]',
    '[data-testid="control-bar"] button[aria-label*="microphone"]',
    '[data-testid="control-bar"] button[aria-label*="Microphone"]',
    // 一般的なコントロールバーのセレクタ
    '[role="toolbar"] button[data-tooltip*="マイク"]',
    '[role="toolbar"] button[data-tooltip*="mute"]',
    '[role="toolbar"] button[data-tooltip*="Mute"]',
    '[role="toolbar"] button[aria-label*="マイク"]',
    '[role="toolbar"] button[aria-label*="mute"]',
    '[role="toolbar"] button[aria-label*="Mute"]',
    '[role="toolbar"] button[aria-label*="microphone"]',
    '[role="toolbar"] button[aria-label*="Microphone"]',
    // 画面下部のコントロールエリア
    '.uArJ5e button[data-tooltip*="マイク"]',
    '.uArJ5e button[data-tooltip*="mute"]',
    '.uArJ5e button[data-tooltip*="Mute"]',
    '.uArJ5e button[aria-label*="マイク"]',
    '.uArJ5e button[aria-label*="mute"]',
    '.uArJ5e button[aria-label*="Mute"]'
  ];

  // コントロールバー内のボタンを優先
  console.log('🎯 Searching in control bar...');
  for (const selector of controlBarSelectors) {
    const button = document.querySelector(selector);
    if (button) {
      console.log('✅ Found control bar button:', selector, button);
      return button;
    }
  }
  console.log('❌ No control bar button found');

  // フォールバック: 従来のセレクタ（参加者リストは除外）
  console.log('🔄 Trying fallback selectors...');
  const fallbackSelectors = [
    'button[data-tooltip*="マイク"]',
    'button[data-tooltip*="mute"]',
    'button[data-tooltip*="Mute"]',
    'button[aria-label*="マイク"]',
    'button[aria-label*="mute"]',
    'button[aria-label*="Mute"]',
    'button[aria-label*="microphone"]',
    'button[aria-label*="Microphone"]'
  ];

  for (const selector of fallbackSelectors) {
    const buttons = document.querySelectorAll(selector);
    console.log(`🔍 Found ${buttons.length} buttons for selector: ${selector}`);
    for (const button of buttons) {
      // 参加者リストやポップアップ内のボタンを除外
      const isInParticipantList = button.closest('[data-participant-id]') || 
                                  button.closest('[role="dialog"]') ||
                                  button.closest('[role="menu"]') ||
                                  button.closest('.participants') ||
                                  button.closest('[data-testid="participant"]');
      
      console.log('🔍 Button check:', {
        button,
        ariaLabel: button.getAttribute('aria-label'),
        tooltip: button.getAttribute('data-tooltip'),
        isInParticipantList
      });
      
      if (!isInParticipantList) {
        console.log('✅ Found fallback button:', button);
        return button;
      }
    }
  }

  // 最後の手段: 全てのボタンを検索（ただし参加者関連は除外）
  console.log('🔄 Trying all buttons search...');
  const allButtons = document.querySelectorAll('button');
  console.log(`🔍 Total buttons found: ${allButtons.length}`);
  
  for (const button of allButtons) {
    // 参加者リストやポップアップ内のボタンを除外
    const isInParticipantList = button.closest('[data-participant-id]') || 
                                button.closest('[role="dialog"]') ||
                                button.closest('[role="menu"]') ||
                                button.closest('.participants') ||
                                button.closest('[data-testid="participant"]');
    
    if (isInParticipantList) {
      continue;
    }

    const ariaLabel = button.getAttribute('aria-label') || '';
    const tooltip = button.getAttribute('data-tooltip') || '';
    const text = button.textContent || '';

    const hasMuteKeywords = ariaLabel.toLowerCase().includes('mic') ||
        ariaLabel.toLowerCase().includes('mute') ||
        tooltip.toLowerCase().includes('mic') ||
        tooltip.toLowerCase().includes('mute') ||
        text.toLowerCase().includes('mic') ||
        text.toLowerCase().includes('mute') ||
        ariaLabel.includes('マイク') ||
        tooltip.includes('マイク') ||
        text.includes('マイク');

    if (hasMuteKeywords) {
      console.log('✅ Found button with mute keywords:', {
        button,
        ariaLabel,
        tooltip,
        text,
        classList: button.className
      });
      return button;
    }
  }

  console.log('❌ No mute button found anywhere');
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
