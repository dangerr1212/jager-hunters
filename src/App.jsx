import React, { useState, useEffect } from 'react';
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
                  body: JSON.stringify({
                    telegram_id: telegramId,
                    bar_id: barId
                  }),
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
      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#0D2018', color: '#fff', minHeight: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Oswald:wght@500;700&display=swap');
          .gothic-font { font-family: 'UnifrakturMaguntia', cursive; }
          .ui-font { font-family: 'Oswald', sans-serif; }
        `}</style>

        {/* 1. Логотип: золотой круг с оленем */}
        <div style={{ marginTop: '20px', marginBottom: '15px' }}>
          <img 
            src="/assets/logo-gold.png" 
            alt="Jager Hunters Gold Logo" 
            style={{ width: '180px', height: '180px', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.6))' }} 
            onError={(e) => { e.target.src = '/logo-gold.png'; }}
          />
        </div>

        {/* 2. Заголовок: JAGER HUNTERS */}
        <h1 className="gothic-font" style={{ fontSize: '42px', color: '#D4530A', textShadow: '0 2px 4px rgba(0,0,0,0.5)', margin: '0 0 5px 0', letterSpacing: '2px' }}>
          JAGER HUNTERS
        </h1>

        {/* 3. Подзаголовок */}
        <p className="ui-font" style={{ fontSize: '14px', color: '#C9A84C', fontStyle: 'italic', letterSpacing: '1px', marginBottom: '25px' }}>
          Охота началась. Найди все точки.
        </p>

        <div style={{ width: '100%', maxWidth: '400px' }}>
          <p className="ui-font" style={{ fontSize: '14px', color: '#C9A84C', marginBottom: '15px', letterSpacing: '1px', textTransform: 'uppercase' }}>ВЫБЕРИ ГЕРОЯ:</p>
          
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '16px', marginTop: '10px' }}>
            
            {/* Карточка Хантера */}
            <div 
              onClick={() => handleSelectCharacter('Хантер')} 
              style={{ backgroundColor: '#ffffff', border: '2px solid #D4530A', borderRadius: '8px', width: '155px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)', transition: 'transform 0.2s' }}
            >
              <div style={{ width: '120px', height: '120px', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                <img src="/hunter.jpg" alt="Хантер" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} /> 
              </div>
              <div style={{ backgroundColor: '#D4530A', width: '100%', padding: '6px 0', textAlign: 'center', borderRadius: '4px' }}>
                <span className="ui-font" style={{ fontSize: '16px', fontWeight: '700', color: '#1B4332', textTransform: 'uppercase', letterSpacing: '1.5px' }}>ХАНТЕР</span>
              </div>
            </div>

            {/* Карточка Ханти */}
            <div 
              onClick={() => handleSelectCharacter('Ханти')} 
              style={{ backgroundColor: '#ffffff', border: '2px solid #D4530A', borderRadius: '8px', width: '155px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)', transition: 'transform 0.2s' }}
            >
              <div style={{ width: '120px', height: '120px', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                <img src="/hunti.jpg" alt="Ханти" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} /> 
              </div>
              <div style={{ backgroundColor: '#D4530A', width: '100%', padding: '6px 0', textAlign: 'center', borderRadius: '4px' }}>
                <span className="ui-font" style={{ fontSize: '16px', fontWeight: '700', color: '#1B4332', textTransform: 'uppercase', letterSpacing: '1.5px' }}>ХАНТИ</span>
              </div>
            </div>

          </div>

          {/* 4. Логотип Jägermeister внизу */}
          <div style={{ marginTop: '35px' }}>
            <img 
              src="/assets/logo-green.png" 
              alt="Jägermeister" 
              style={{ width: '80px', opacity: 0.7 }} 
              onError={(e) => { e.target.src = '/jager-logo.png'; }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (showStory) {
    return (
      <div style={{ padding: '25px', textAlign: 'center', backgroundColor: '#0D2018', color: '#fff', minHeight: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Oswald:wght@500;700&display=swap');
          .gothic-font { font-family: 'UnifrakturMaguntia', cursive; }
          .ui-font { font-family: 'Oswald', sans-serif; }
        `}</style>
        <div style={{ backgroundColor: '#1B4332', border: '2px solid #D4530A', borderRadius: '12px', padding: '25px', maxWidth: '380px', boxShadow: '0 6px 16px rgba(0,0,0,0.5)' }}>
          <h2 className="gothic-font" style={{ fontSize: '24px', color: '#D4530A', marginBottom: '20px', letterSpacing: '1px' }}>НАЧАЛО ОХОТЫ</h2>
          <p className="ui-font" style={{ fontSize: '14px', color: '#ddd', lineHeight: '1.6', textAlign: 'left', marginBottom: '30px' }}>
            «Город погрузился в ночь. Легендарный рецепт из 56 трав утерян, а его части спрятаны в лучших барах. Твоя миссия — зачистить 8 локаций, отсканировать секретные коды и восстановить рецепт. Охота началась!»
          </p>
          <button onClick={() => setShowStory(false)} style={{ padding: '14px 32px', fontSize: '16px', backgroundColor: '#D4530A', color: '#1B4332', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '700', width: '100%', textTransform: 'uppercase', letterSpacing: '1.5px' }} className="ui-font">
            В БОЙ!
          </button>
        </div>
      </div>
    );
  }

  if (gameFinished) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#0D2018', color: '#fff', minHeight: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Oswald:wght@500;700&display=swap');
          .gothic-font { font-family: 'UnifrakturMaguntia', cursive; }
          .ui-font { font-family: 'Oswald', sans-serif; }
        `}</style>
        <h2 className="gothic-font" style={{ fontSize: '28px', color: '#D4530A', marginBottom: '20px' }}>ЭПИЧЕСКАЯ ПОБЕДА!</h2>
        <p style={{ fontSize: '14px', marginBottom: '30px', lineHeight: '1.6', maxWidth: '350px' }} className="ui-font">
          Рецепт из 56 трав восстановлен! Выбери свой сундук с наградой:
        </p>
        {!selectedReward ? (
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
            <div onClick={() => handleSelectReward('merch')} style={{ backgroundColor: '#1B4332', border: '2px solid #D4530A', borderRadius: '12px', padding: '20px', width: '140px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎁</div>
              <span className="ui-font" style={{ fontSize: '11px', color: '#fff', lineHeight: '1.4', textTransform: 'uppercase' }}>ЭПИЧЕСКАЯ ЭКИПИРОВКА<br/>(Мерч)</span>
            </div>
            <div onClick={() => handleSelectReward('bottle')} style={{ backgroundColor: '#1B4332', border: '2px solid #D4530A', borderRadius: '12px', padding: '15px', width: '140px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/jager-logo.png" alt="Бутылка Jägermeister" style={{ width: '50px', height: '80px', objectFit: 'contain', marginBottom: '8px' }} />
              <span className="ui-font" style={{ fontSize: '11px', color: '#fff', lineHeight: '1.4', textTransform: 'uppercase' }}>ЛЕГЕНДАРНЫЙ ЭЛИКСИР</span>
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: '#1B4332', border: '2px solid #C9A84C', borderRadius: '16px', padding: '20px', maxWidth: '350px', marginBottom: '20px' }}>
            <h3 className="gothic-font" style={{ fontSize: '18px', color: '#C9A84C', marginBottom: '15px' }}>НАГРАДА ВЫБРАНА!</h3>
            <p style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '15px', color: '#ddd' }} className="ui-font">
              {selectedReward === 'merch' ? '🎁 Вы выбрали: Лимитированный мерч Jägermeister.' : '🍾 Вы выбрали: Фирменную бутылку Jägermeister.'}
            </p>
            <p style={{ fontSize: '12px', color: '#D4530A', lineHeight: '1.6', marginBottom: '10px' }} className="ui-font">
              📍 Где забрать приз:<br/><b>Бар «Флагманский Jager Haus» (ул. Барная, 56)</b>
            </p>
            <p style={{ fontSize: '10px', color: '#888', lineHeight: '1.5' }} className="ui-font">Покажи этот экран Хранителю (бармену) в призовом баре. Внимание: кнопку «Выдать приз» нажимает только персонал!</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#0D2018', color: '#fff', minHeight: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Oswald:wght@500;700&display=swap');
        .gothic-font { font-family: 'UnifrakturMaguntia', cursive; }
        .ui-font { font-family: 'Oswald', sans-serif; }
        
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
      
      <h1 className="gothic-font" style={{ fontSize: '24px', color: '#D4530A', textShadow: '0 2px 4px rgba(0,0,0,0.5)', marginTop: '10px', letterSpacing: '1px' }}>КАРТА ОХОТЫ</h1>
      <p style={{ fontSize: '13px', marginTop: '10px', color: '#C9A84C' }} className="ui-font">Охотник: <span style={{color: '#fff'}}>{selectedCharacter}</span></p>

      {isAllCompleted && (
        <button onClick={() => setGameFinished(true)} style={{ marginTop: '15px', padding: '14px 20px', backgroundColor: '#D4530A', color: '#1B4332', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '700', width: '100%', maxWidth: '400px', boxShadow: '0 4px 10px rgba(212,83,10,0.4)', zIndex: 10, textTransform: 'uppercase', letterSpacing: '1.5px' }} className="ui-font">
          ✨ СОБРАТЬ ЭЛИКСИР ✨
        </button>
      )}

      {/* Окно уровня */}
      <div style={{ 
        position: 'relative', marginTop: '30px', width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column',
        backgroundColor: '#143326', padding: '20px 0', borderRadius: '16px', border: '2px solid #1B4332', overflow: 'hidden',
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

        {/* Травка */}
        <div style={{ position: 'absolute', top: '10%', left: 'calc(50% - 40px)', fontSize: '12px', zIndex: 0 }}>🌿</div>
        <div style={{ position: 'absolute', top: '30%', left: 'calc(50% + 25px)', fontSize: '14px', zIndex: 0 }}>🌱</div>
        <div style={{ position: 'absolute', top: '50%', left: 'calc(50% - 35px)', fontSize: '12px', zIndex: 0 }}>🌿</div>
        <div style={{ position: 'absolute', top: '75%', left: 'calc(50% + 30px)', fontSize: '14px', zIndex: 0 }}>🌱</div>
        <div style={{ position: 'absolute', top: '90%', left: 'calc(50% - 42px)', fontSize: '10px', zIndex: 0 }}>🌿</div>

        {/* --- ГУСТОЙ ЛЕС (МНОГОСЛОЙНОСТЬ) --- */}
        <div className="tree-sway" style={{ position: 'absolute', top: '3%', left: '2%', fontSize: '16px', opacity: 0.4, zIndex: 0 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '12%', right: '3%', fontSize: '18px', opacity: 0.5, zIndex: 0 }}>🌲</div>
        <div className="tree-sway" style={{ position: 'absolute', top: '22%', left: '8%', fontSize: '14px', opacity: 0.3, zIndex: 0 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '35%', right: '1%', fontSize: '16px', opacity: 0.4, zIndex: 0 }}>🌲</div>
        <div className="tree-sway" style={{ position: 'absolute', top: '48%', left: '3%', fontSize: '18px', opacity: 0.5, zIndex: 0 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '60%', right: '7%', fontSize: '14px', opacity: 0.3, zIndex: 0 }}>🌲</div>
        <div className="tree-sway" style={{ position: 'absolute', top: '78%', left: '2%', fontSize: '16px', opacity: 0.4, zIndex: 0 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '88%', right: '2%', fontSize: '18px', opacity: 0.5, zIndex: 0 }}>🌲</div>

        <div className="tree-sway" style={{ position: 'absolute', top: '8%', left: '12%', fontSize: '24px', opacity: 0.7, zIndex: 2 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '18%', right: '14%', fontSize: '22px', opacity: 0.6, zIndex: 2 }}>🌲</div>
        <div className="tree-sway" style={{ position: 'absolute', top: '28%', left: '4%', fontSize: '28px', opacity: 0.8, zIndex: 2 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '42%', right: '10%', fontSize: '26px', opacity: 0.7, zIndex: 2 }}>🌲</div>
        <div className="tree-sway" style={{ position: 'absolute', top: '55%', left: '11%', fontSize: '24px', opacity: 0.6, zIndex: 2 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '68%', right: '5%', fontSize: '28px', opacity: 0.8, zIndex: 2 }}>🌲</div>
        <div className="tree-sway" style={{ position: 'absolute', top: '82%', left: '13%', fontSize: '22px', opacity: 0.7, zIndex: 2 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '92%', right: '12%', fontSize: '26px', opacity: 0.8, zIndex: 2 }}>🌲</div>

        <div className="tree-sway" style={{ position: 'absolute', top: '15%', left: '-2%', fontSize: '36px', opacity: 0.9, zIndex: 5 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '32%', right: '-4%', fontSize: '40px', opacity: 0.9, zIndex: 5 }}>🌲</div>
        <div className="tree-sway" style={{ position: 'absolute', top: '52%', left: '-5%', fontSize: '38px', opacity: 1, zIndex: 5 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '75%', right: '-3%', fontSize: '36px', opacity: 0.9, zIndex: 5 }}>🌲</div>
        <div className="tree-sway" style={{ position: 'absolute', top: '95%', left: '-1%', fontSize: '42px', opacity: 1, zIndex: 5 }}>🌲</div>

        {/* Логотипы-патрульные */}
        <div className="deer-container-down" style={{ left: '12%', animationDuration: '18s', animationDelay: '0s' }}>
          <img src="/logogo.jpg" alt="Logo" className="deer-sprite" style={{ width: '45px' }} />
        </div>
        <div className="deer-container-up" style={{ right: '12%', animationDuration: '22s', animationDelay: '-5s' }}>
          <img src="/logogo.jpg" alt="Logo" className="deer-sprite" style={{ width: '45px' }} />
        </div>
        <div className="deer-container-down" style={{ left: '6%', animationDuration: '15s', animationDelay: '-8s' }}>
          <img src="/logogo.jpg" alt="Logo" className="deer-sprite" style={{ width: '50px' }} />
        </div>
        <div className="deer-container-up" style={{ right: '6%', animationDuration: '25s', animationDelay: '-12s' }}>
          <img src="/logogo.jpg" alt="Logo" className="deer-sprite" style={{ width: '55px' }} />
        </div>

        {locations.map((loc, index) => {
          const isLeft = index % 2 === 0;
          return (
            <div key={loc.id} style={{ display: 'flex', justifyContent: isLeft ? 'flex-start' : 'flex-end', alignItems: 'center', width: '100%', marginBottom: '25px', position: 'relative', zIndex: 3, padding: '0 15px', boxSizing: 'border-box' }}>
              
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '20px', height: '20px', backgroundColor: loc.completed ? '#C9A84C' : '#D4530A', border: `4px solid ${loc.completed ? '#D4530A' : '#1B4332'}`, borderRadius: '50%', zIndex: 4, boxShadow: '0 0 10px rgba(0,0,0,0.8)' }}></div>
              
              <div onClick={() => !loc.completed && setActiveBar(loc)} style={{ backgroundColor: loc.completed ? '#143326' : '#1B4332', border: `2px solid ${loc.completed ? '#C9A84C' : '#D4530A'}`, borderRadius: '8px', padding: '12px 8px', width: '40%', cursor: loc.completed ? 'default' : 'pointer', boxShadow: loc.completed ? '0 4px 8px rgba(0,0,0,0.4)' : '0 4px 12px rgba(212,83,10,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px', filter: loc.completed ? 'drop-shadow(0 0 5px #C9A84C)' : 'none' }}>
                  {loc.completed ? <img src="/jager-logo.png" alt="Jager" style={{ width: '32px', height: '32px', objectFit: 'contain', backgroundColor: '#fff', borderRadius: '6px', padding: '2px' }} /> : loc.emoji}
                </div>
                <span className="ui-font" style={{ fontSize: '10px', color: loc.completed ? '#C9A84C' : '#fff', marginBottom: '4px', fontWeight: '700' }}>{loc.name}</span>
                <span className="ui-font" style={{ fontSize: '9px', color: loc.completed ? '#ccc' : '#ddd', marginBottom: '10px' }}>{loc.ingredient}</span>
                <button className="ui-font" style={{ fontSize: '9px', padding: '6px', backgroundColor: loc.completed ? 'transparent' : '#D4530A', color: loc.completed ? '#C9A84C' : '#1B4332', border: loc.completed ? 'none' : '1px solid #C9A84C', borderRadius: '4px', fontWeight: '700', width: '100%', textTransform: 'uppercase' }}>
                  {loc.completed ? '✅' : 'СКАН'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeBar && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', zIndex: 100 }}>
          <div style={{ backgroundColor: '#1B4332', border: '2px solid #D4530A', borderRadius: '16px', padding: '20px', maxWidth: '320px', textAlign: 'center', boxShadow: '0 0 20px rgba(212,83,10,0.3)' }}>
            <h3 className="gothic-font" style={{ fontSize: '20px', color: '#D4530A', marginBottom: '15px' }}>{activeBar.name}</h3>
            <p className="ui-font" style={{ fontSize: '13px', marginBottom: '15px' }}>Артефакт: <span style={{ fontSize: '24px', verticalAlign: 'middle' }}>{activeBar.emoji}</span> <b style={{ color: '#C9A84C' }}>{activeBar.ingredient}</b></p>
            <p className="ui-font" style={{ fontSize: '11px', color: '#aaa', marginBottom: '20px', lineHeight: '1.5' }}>Наведите камеру на тейбл-тент в баре для сбора ингредиента.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleScanQRCode(activeBar.id)} style={{ flex: 1, padding: '12px', backgroundColor: '#D4530A', color: '#1B4332', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase' }} className="ui-font">СКАНЕР</button>
              <button onClick={() => setActiveBar(null)} style={{ flex: 1, padding: '12px', backgroundColor: '#143326', color: '#fff', border: '1px solid #C9A84C', borderRadius: '4px', fontWeight: '700', cursor: 'pointer', textTransform: 'uppercase' }} className="ui-font">НАЗАД</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;