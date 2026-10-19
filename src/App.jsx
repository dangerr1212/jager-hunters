import React, { useState, useEffect, useRef } from 'react';
import WebApp from '@twa-dev/sdk';

function App() {
  const twa = WebApp?.default || WebApp;

  useEffect(() => {
    if (twa && typeof twa.ready === 'function') {
      twa.ready();
      twa.expand();
    }
  }, [twa]);

  const telegramId = twa?.initDataUnsafe?.user?.id?.toString() || 'test_user_13322fd3';
  const userName = twa?.initDataUnsafe?.user?.first_name || 'Охотник';

  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showStory, setShowStory] = useState(false);
  const [activeBar, setActiveBar] = useState(null);
  
  const [gameFinished, setGameFinished] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);

  const hunterImgRef = useRef(null);
  const huntiImgRef = useRef(null);

  const [locations, setLocations] = useState([
    { id: 1, name: 'Бар №1', ingredient: 'Корень имбиря', emoji: '🫚', completed: false },
    { id: 2, name: 'Бар №2', ingredient: 'Звёздчатый анис', emoji: '⭐', completed: false },
    { id: 3, name: 'Бар №3', ingredient: 'Кора корицы', emoji: '🪵', completed: false },
    { id: 4, name: 'Бар №4', ingredient: 'Корень солодки', emoji: '🌿', completed: false },
    { id: 5, name: 'Бар №5', ingredient: 'Цедра апельсина', emoji: '🍊', completed: false },
    { id: 6, name: 'Бар №6', ingredient: 'Шафран', emoji: '🌸', completed: false },
    { id: 7, name: 'Бар №7', ingredient: 'Гвоздика', emoji: '🌱', completed: false },
    { id: 8, name: 'Бар №8', ingredient: 'Кардамон', emoji: '🥠', completed: false },
  ]);

  const isAllCompleted = locations.every(loc => loc.completed);

  const pixelateImage = (imgElement) => {
    if (!imgElement) return;
    const canvas = document.createElement('canvas');
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    
    if (imgElement.complete) {
      ctx.drawImage(imgElement, 0, 0, size, size);
      imgElement.src = canvas.toDataURL();
    } else {
      imgElement.onload = () => {
        ctx.drawImage(imgElement, 0, 0, size, size);
        imgElement.src = canvas.toDataURL();
      };
    }
  };

  useEffect(() => {
    if (!selectedCharacter) {
      pixelateImage(hunterImgRef.current);
      pixelateImage(huntiImgRef.current);
    }
  }, [selectedCharacter]);

  useEffect(() => {
    fetch(`https://jager-hunters.onrender.com/api/user/${telegramId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          if (data.user.character) {
            setSelectedCharacter(data.user.character);
          }
          if (data.user.reward) {
            setSelectedReward(data.user.reward);
            setGameFinished(true);
          }
          if (data.user.completed_bars && data.user.completed_bars.length > 0) {
            setLocations(prev => prev.map(loc => ({
              ...loc,
              completed: data.user.completed_bars.includes(loc.id)
            })));
          }
        }
      })
      .catch(err => console.error('Ошибка загрузки данных с сервера:', err));
  }, [telegramId]);

  const handleSelectCharacter = async (characterName) => {
    try {
      await fetch('https://jager-hunters.onrender.com/api/select-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: telegramId,
          username: userName,
          character: characterName,
        }),
      });
      setSelectedCharacter(characterName);
      setShowStory(true);
    } catch (error) {
      console.error('Ошибка сохранения персонажа:', error);
      setSelectedCharacter(characterName);
      setShowStory(true);
    }
  };

  const handleScanQRCode = (barId) => {
    const lastScanTime = localStorage.getItem('lastScanTime');
    if (lastScanTime) {
      const timePassed = (Date.now() - parseInt(lastScanTime)) / 1000 / 60; 
      if (timePassed < 30) {
        const timeLeft = Math.ceil(30 - timePassed);
        alert(`Слишком быстро, охотник! Дай зелью усвоиться. Сканер остынет через ${timeLeft} минут.`);
        return;
      }
    }

    if (twa && typeof twa.showScanQrPopup === 'function') {
      twa.showScanQrPopup({ text: "Отсканируй артефакт бара!" }, (text) => {
        if (text) {
          const scannedText = text.trim().toUpperCase();
          const expectedKey = `JAGER_BAR_${barId}`;

          if (scannedText.includes(expectedKey)) {
            twa.closeScanQrPopup();
            localStorage.setItem('lastScanTime', Date.now().toString());
            
            const saveProgress = async () => {
              try {
                await fetch('https://jager-hunters.onrender.com/api/complete-bar', { 
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ telegram_id: telegramId, bar_id: barId }),
                });

                const updatedLocations = locations.map(loc => 
                  loc.id === barId ? { ...loc, completed: true } : loc
                );
                setLocations(updatedLocations);
                setActiveBar(null);

                const allDone = updatedLocations.every(loc => loc.completed);
                if (allDone) {
                  alert('Потрясающе! Все 8 артефактов собраны. Теперь доступна кнопка сбора эликсира!');
                } else {
                  alert('LEVEL UP! Локация захвачена. Ты получил новый артефакт. Двигай к следующей цели!');
                }
              } catch (error) {
                console.error('Ошибка сохранения прогресса бара:', error);
              }
            };
            
            saveProgress();
            return true;
          } else {
            twa.closeScanQrPopup();
            alert(`Неизвестный артефакт! Этот код не из нашего квеста. Ищи правильный тейбл-тент! [Считано: "${text}"]`);
            return true;
          }
        }
      });
    } else {
      alert("Сканер доступен только с телефона в Telegram!");
    }
  };

  const handleSelectReward = async (rewardType) => {
    if (selectedReward) return;
    try {
      await fetch('https://jager-hunters.onrender.com/api/select-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramId, reward: rewardType }),
      });
      setSelectedReward(rewardType);
    } catch (error) {
      console.error('Ошибка сохранения приза:', error);
      setSelectedReward(rewardType);
    }
  };

  if (!selectedCharacter) {
    return (
      <div className="app">
        {/* 1. ЛОГОТИП */}
        <div className="logo-container">
          <img 
            src="/assets/logo-gold.png" 
            alt="Jager Hunters Gold Logo" 
            className="hero-logo" 
            onError={(e) => { e.target.src = '/logo-gold.png'; }}
          />
        </div>

        {/* 2. ТЕКСТЫ */}
        <h1 className="main-title">JAGER HUNTERS</h1>
        <p className="sub-title">
          <span className="blink-arrow">▶</span> Охота началась. Найди все точки.
        </p>

        {/* 3. ВЫБОР ГЕРОЯ */}
        <h2 className="section-title">▼ ВЫБЕРИ ГЕРОЯ:</h2>

        {/* 4. ПЕРСОНАЖИ */}
        <div className="characters-grid">
          {/* Хантер */}
          <div className="character-card" onClick={() => handleSelectCharacter('Хантер')}>
            <div className="avatar-wrapper">
              <img 
                ref={hunterImgRef}
                src="/hunter.jpg" 
                alt="Хантер" 
                className="character-img" 
              />
            </div>
            <div className="name-badge">
              <span>ХАНТЕР</span>
            </div>
          </div>

          {/* Ханти */}
          <div className="character-card" onClick={() => handleSelectCharacter('Ханти')}>
            <div className="avatar-wrapper">
              <img 
                ref={huntiImgRef}
                src="/hunti.jpg" 
                alt="Ханти" 
                className="character-img" 
              />
            </div>
            <div className="name-badge">
              <span>ХАНТИ</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showStory) {
    return (
      <div className="app" style={{ justifyContent: 'center' }}>
        <div style={{ backgroundColor: '#143326', border: '3px solid #D4530A', borderRadius: '0px', padding: '20px', maxWidth: '340px', boxShadow: '4px 4px 0px #8B2500', textAlign: 'center' }}>
          <h2 className="pixel-font" style={{ fontSize: '12px', color: '#D4530A', marginBottom: '15px', lineHeight: '1.5' }}>НАЧАЛО ОХОТЫ</h2>
          <p className="pixel-font" style={{ fontSize: '8px', color: '#ddd', lineHeight: '1.8', textAlign: 'left', marginBottom: '20px' }}>
            «Город погрузился в пиксельную ночь. Легендарный рецепт из 56 трав утерян, а его части спрятаны в лучших барах. Твоя миссия — зачистить 8 локаций, отсканировать секретные коды и восстановить рецепт. Охота началась!»
          </p>
          <button onClick={() => setShowStory(false)} style={{ padding: '12px 20px', fontSize: '9px', backgroundColor: '#D4530A', color: '#fff', border: 'none', borderRadius: '0px', cursor: 'pointer', fontWeight: 'bold', width: '100%', boxShadow: '3px 3px 0px #8B2500' }} className="pixel-font">
            В БОЙ!
          </button>
        </div>
      </div>
    );
  }

  if (gameFinished) {
    return (
      <div className="app" style={{ justifyContent: 'center' }}>
        <h2 className="pixel-font" style={{ fontSize: '12px', color: '#D4530A', marginBottom: '15px', textAlign: 'center' }}>ЭПИЧЕСКАЯ ПОБЕДА!</h2>
        <p style={{ fontSize: '9px', marginBottom: '20px', lineHeight: '1.6', maxWidth: '340px', textAlign: 'center' }} className="pixel-font">
          Рецепт из 56 трав восстановлен! Выбери свой сундук с наградой:
        </p>
        {!selectedReward ? (
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            <div onClick={() => handleSelectReward('merch')} style={{ backgroundColor: '#143326', border: '3px solid #D4530A', borderRadius: '0px', padding: '15px', width: '140px', cursor: 'pointer', boxShadow: '4px 4px 0px #8B2500', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎁</div>
              <span className="pixel-font" style={{ fontSize: '7px', color: '#fff', lineHeight: '1.4' }}>ЭПИЧЕСКАЯ ЭКИПИРОВКА<br/>(Мерч)</span>
            </div>
            <div onClick={() => handleSelectReward('bottle')} style={{ backgroundColor: '#143326', border: '3px solid #D4530A', borderRadius: '0px', padding: '12px', width: '140px', cursor: 'pointer', boxShadow: '4px 4px 0px #8B2500', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <img src="/jager-logo.png" alt="Бутылка Jägermeister" style={{ width: '40px', height: '60px', objectFit: 'contain', marginBottom: '6px' }} />
              <span className="pixel-font" style={{ fontSize: '7px', color: '#fff', lineHeight: '1.4' }}>ЛЕГЕНДАРНЫЙ ЭЛИКСИР</span>
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: '#143326', border: '3px solid #4ade80', borderRadius: '0px', padding: '15px', maxWidth: '340px', textAlign: 'center', boxShadow: '4px 4px 0px #1e5c32' }}>
            <h3 className="pixel-font" style={{ fontSize: '10px', color: '#4ade80', marginBottom: '12px' }}>НАГРАДА ВЫБРАНА!</h3>
            <p style={{ fontSize: '8px', lineHeight: '1.6', marginBottom: '12px', color: '#ddd' }} className="pixel-font">
              {selectedReward === 'merch' ? '🎁 Вы выбрали: Лимитированный мерч Jägermeister.' : '🍾 Вы выбрали: Фирменную бутылку Jägermeister.'}
            </p>
            <p style={{ fontSize: '8px', color: '#D4530A', lineHeight: '1.6', marginBottom: '8px' }} className="pixel-font">
              📍 Где забрать приз:<br/><b>Бар «Флагманский Jager Haus» (ул. Барная, 56)</b>
            </p>
            <p style={{ fontSize: '7px', color: '#888', lineHeight: '1.5' }} className="pixel-font">Покажи этот экран Хранителю (бармену) в призовом баре.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app" style={{ justifyContent: 'flex-start', overflowY: 'auto' }}>
      <style>{`
        @keyframes patrol-down { 0% { top: -15%; } 100% { top: 115%; } }
        @keyframes patrol-up { 0% { top: 115%; } 100% { top: -15%; } }
        @keyframes step-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
        
        .tree-sway { display: inline-block; transform-origin: bottom center; animation: sway 4s ease-in-out infinite; }
        .tree-sway-alt { display: inline-block; transform-origin: bottom center; animation: sway 5s ease-in-out infinite alternate-reverse; }

        .deer-container-down { position: absolute; animation: patrol-down linear infinite; z-index: 1; }
        .deer-container-up { position: absolute; animation: patrol-up linear infinite; z-index: 1; }
        .deer-sprite { display: inline-block; animation: step-bounce 0.6s steps(2) infinite; filter: drop-shadow(0 4px 0 rgba(0,0,0,0.4)); image-rendering: pixelated; }
      `}</style>
      
      <h1 className="pixel-font" style={{ fontSize: '12px', color: '#D4530A', textShadow: '2px 2px 0px #000', marginTop: '5px' }}>КАРТА ОХОТЫ</h1>
      <p style={{ fontSize: '9px', marginTop: '6px', color: '#4ade80' }} className="pixel-font">Охотник: <span style={{color: '#fff'}}>{selectedCharacter}</span></p>

      {isAllCompleted && (
        <button onClick={() => setGameFinished(true)} style={{ marginTop: '10px', padding: '10px 15px', backgroundColor: '#D4530A', color: '#fff', border: 'none', borderRadius: '0px', cursor: 'pointer', fontWeight: 'bold', width: '100%', maxWidth: '360px', boxShadow: '4px 4px 0px #8B2500', zIndex: 10 }} className="pixel-font">
          ✨ СОБРАТЬ ЭЛИКСИР ✨
        </button>
      )}

      {/* Окно уровня */}
      <div style={{ 
        position: 'relative', marginTop: '15px', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column',
        backgroundColor: '#143326', padding: '15px 0', borderRadius: '0px', border: '3px solid #1B4332', overflow: 'hidden',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
      }}>
        
        {/* Дорога */}
        <div style={{ 
          position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', 
          width: '56px', backgroundColor: '#0D2018', 
          borderLeft: '6px solid #143326', borderRight: '6px solid #143326', zIndex: 0,
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
        }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '4px', borderLeft: '4px dashed #1B4332' }}></div>
        </div>

        {locations.map((loc, index) => {
          const isLeft = index % 2 === 0;
          return (
            <div key={loc.id} style={{ display: 'flex', justifyContent: isLeft ? 'flex-start' : 'flex-end', alignItems: 'center', width: '100%', marginBottom: '20px', position: 'relative', zIndex: 3, padding: '0 12px', boxSizing: 'border-box' }}>
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '16px', height: '16px', backgroundColor: loc.completed ? '#FFD700' : '#8B4513', border: `3px solid ${loc.completed ? '#CC5500' : '#5C2E0B'}`, borderRadius: '50%', zIndex: 4, boxShadow: '0 0 8px rgba(0,0,0,0.8)' }}></div>
              
              <div onClick={() => !loc.completed && setActiveBar(loc)} style={{ backgroundColor: loc.completed ? '#2d1b0d' : '#4a2f1d', border: `3px solid ${loc.completed ? '#FFD700' : '#D4530A'}`, borderRadius: '0px', padding: '10px 6px', width: '42%', cursor: loc.completed ? 'default' : 'pointer', boxShadow: loc.completed ? '3px 3px 0px #1a0f07' : '3px 3px 0px #2b1a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px', filter: loc.completed ? 'drop-shadow(0 0 5px #FFD700)' : 'none' }}>
                  {loc.completed ? <img src="/jager-logo.png" alt="Jager" style={{ width: '28px', height: '28px', objectFit: 'contain', backgroundColor: '#fff', borderRadius: '0px', padding: '2px' }} /> : loc.emoji}
                </div>
                <span className="pixel-font" style={{ fontSize: '7px', color: loc.completed ? '#FFD700' : '#fff', marginBottom: '4px', lineHeight: '1.4' }}>{loc.name}</span>
                <span className="pixel-font" style={{ fontSize: '6px', color: loc.completed ? '#ccc' : '#e0c097', marginBottom: '8px', lineHeight: '1.3' }}>{loc.ingredient}</span>
                <button className="pixel-font" style={{ fontSize: '7px', padding: '6px', backgroundColor: loc.completed ? 'transparent' : '#D4530A', color: loc.completed ? '#FFD700' : '#fff', border: loc.completed ? 'none' : '2px solid #8B2500', borderRadius: '0px', fontWeight: 'bold', width: '100%' }}>
                  {loc.completed ? '✅' : 'СКАН'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeBar && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', zIndex: 100 }}>
          <div style={{ backgroundColor: '#143326', border: '3px solid #D4530A', borderRadius: '0px', padding: '20px', maxWidth: '320px', textAlign: 'center', boxShadow: '4px 4px 0px #8B2500' }}>
            <h3 className="pixel-font" style={{ fontSize: '10px', color: '#D4530A', marginBottom: '12px' }}>{activeBar.name}</h3>
            <p className="pixel-font" style={{ fontSize: '9px', marginBottom: '12px' }}>Артефакт: <span style={{ fontSize: '18px', verticalAlign: 'middle' }}>{activeBar.emoji}</span> <b style={{ color: '#C9A84C' }}>{activeBar.ingredient}</b></p>
            <p className="pixel-font" style={{ fontSize: '7px', color: '#aaa', marginBottom: '15px', lineHeight: '1.6' }}>Наведите камеру на тейбл-тент в баре для сбора ингредиента.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleScanQRCode(activeBar.id)} style={{ flex: 1, padding: '10px', backgroundColor: '#D4530A', color: '#fff', border: 'none', borderRadius: '0px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '3px 3px 0px #8B2500' }} className="pixel-font">СКАНЕР</button>
              <button onClick={() => setActiveBar(null)} style={{ flex: 1, padding: '10px', backgroundColor: '#1B4332', color: '#fff', border: 'none', borderRadius: '0px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '3px 3px 0px #0D2018' }} className="pixel-font">НАЗАД</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;