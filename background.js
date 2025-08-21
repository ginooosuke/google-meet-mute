
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-mute') {
    executeToggleMute();
  }
});

async function executeToggleMute() {
  try {
    // すべてのGoogle Meetタブを検索（完全に読み込まれたタブのみ）
    const allMeetTabs = await chrome.tabs.query({ url: 'https://meet.google.com/*' });

    // 読み込み完了済みのタブのみをフィルタ
    const meetTabs = allMeetTabs.filter(tab => tab.status === 'complete');

    if (meetTabs.length === 0) {
      // Google Meetタブが見つからない場合は静かに終了
      if (allMeetTabs.length > 0) {
        // 読み込み中のタブがある場合のみログ出力
        console.log('Google Meet tabs are loading...');
      }
      return;
    }

    console.log(`Found ${meetTabs.length} Google Meet tab(s)`);

    // 複数のタブがある場合は、最後にアクティブだったタブか、最初のタブを使用
    let targetTab = meetTabs[0];

    // アクティブなGoogle Meetタブがあれば優先
    const activeMeetTab = meetTabs.find(tab => tab.active);
    if (activeMeetTab) {
      targetTab = activeMeetTab;
      console.log('Using active Google Meet tab');
    } else {
      // アクティブなタブがない場合は、最も最近アクセスされたタブを選択
      try {
        targetTab = meetTabs.reduce((latest, current) => {
          const latestAccess = latest.lastAccessed || 0;
          const currentAccess = current.lastAccessed || 0;
          return currentAccess > latestAccess ? current : latest;
        });
        console.log('Using most recently accessed Google Meet tab');
      } catch (error) {
        console.error('Error selecting tab:', error);
        targetTab = meetTabs[0]; // フォールバック
        console.log('Using first available Google Meet tab as fallback');
      }
    }

    console.log(`Toggling mute on tab: ${targetTab.title || targetTab.url} (ID: ${targetTab.id})`);

    // targetTabが存在するかチェック
    try {
      await chrome.tabs.get(targetTab.id);
    } catch (error) {
      const remainingTabs = meetTabs.filter(tab => tab.id !== targetTab.id);
      if (remainingTabs.length > 0) {
        tryOtherMeetTabs(remainingTabs, targetTab.id);
      }
      return;
    }

    // content scriptが読み込まれているかチェック
    chrome.tabs.sendMessage(targetTab.id, { action: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        // content scriptを手動で注入
        chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            // 注入に失敗した場合は他のタブを試行
            tryOtherMeetTabs(meetTabs, targetTab.id);
            return;
          }

          // 少し待ってからメッセージを送信
          setTimeout(() => {
            sendToggleMessage(targetTab.id, meetTabs);
          }, 300);
        });
      } else {
        // content scriptが既に読み込まれている
        sendToggleMessage(targetTab.id, meetTabs);
      }
    });
  } catch (error) {
    // エラーは静かに処理（Google Meetが開いていない場合など）
  }
}

function sendToggleMessage(tabId, meetTabs) {
  chrome.tabs.sendMessage(tabId, { action: 'toggleMute' }, (response) => {
    if (chrome.runtime.lastError) {
      // エラーが発生した場合は他のタブを試行
      tryOtherMeetTabs(meetTabs, tabId);
    } else if (response && response.success) {
      // 成功したタブをアクティブにする
      chrome.tabs.update(tabId, { active: true });
      chrome.windows.update(meetTabs.find(tab => tab.id === tabId)?.windowId, { focused: true });
    } else {
      // 失敗した場合は他のタブを試行
      tryOtherMeetTabs(meetTabs, tabId);
    }
  });
}

async function tryOtherMeetTabs(meetTabs, excludeTabId) {
  const remainingTabs = meetTabs.filter(tab => tab.id !== excludeTabId);

  if (remainingTabs.length === 0) {
    // 他にGoogle Meetタブがない場合は静かに終了
    return;
  }

  for (const tab of remainingTabs) {
    // タブが存在するかチェック
    try {
      await chrome.tabs.get(tab.id);
    } catch (error) {
      continue; // タブが存在しない場合は次へ
    }

    try {
      // まずpingで確認
      const pingSuccess = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
          resolve(!chrome.runtime.lastError);
        });
      });

      if (!pingSuccess) {
        // content scriptを注入
        await new Promise((resolve, reject) => {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });

        // 少し待つ
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // ミュート切り替えを実行
      const success = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: 'toggleMute' }, (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });

      if (success) {
        // 成功したタブをアクティブにする
        chrome.tabs.update(tab.id, { active: true });
        chrome.windows.update(tab.windowId, { focused: true });
        break; // 成功したら他のタブは試行しない
      }
    } catch (error) {
      continue; // 次のタブを試行
    }
  }
}

// アイコンクリック時の処理
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

