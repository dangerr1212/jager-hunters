import { useState, useEffect } from 'react';
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
      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#1E392A', color: '#fff', minHeight: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
          .pixel-font { font-family: 'Press Start 2P', 'Courier New', monospace; -webkit-font-smoothing: none; font-smooth: never; }
        `}</style>
        <h1 className="pixel-font" style={{ fontSize: '20px', color: '#FF6B00', textShadow: '2px 2px 0px #111', marginTop: '20px' }}>
          JAGER HUNTERS
        </h1>
        <p style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '20px' }}>Привет, {userName}!</p>
        
        <div style={{ marginTop: '40px', width: '100%', maxWidth: '400px' }}>
          <p className="pixel-font" style={{ fontSize: '12px', color: '#FF6B00', marginBottom: '30px', textShadow: '1px 1px 0px #111' }}>ВЫБЕРИ ГЕРОЯ:</p>
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
            <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', color: '#1E392A', border: '4px solid #FF6B00', borderRadius: '12px', width: '160px', height: '170px', cursor: 'pointer', boxShadow: '0 8px 0px #CC5500', gap: '15px' }} onClick={() => handleSelectCharacter('Хантер')}>
              <img src="/hunter.jpg" alt="Хантер" style={{ width: '80px', height: '80px', imageRendering: 'pixelated', transform: 'scale(1.4)' }} /> 
              <span className="pixel-font" style={{ fontSize: '16px', lineHeight: '1', fontWeight: 'bold' }}>ХАНТЕР</span>
            </button>
            <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', color: '#1E392A', border: '4px solid #FF6B00', borderRadius: '12px', width: '160px', height: '170px', cursor: 'pointer', boxShadow: '0 8px 0px #CC5500', gap: '15px' }} onClick={() => handleSelectCharacter('Ханти')}>
              <img src="/hunti.jpg" alt="Ханти" style={{ width: '100px', height: '100px', imageRendering: 'pixelated' }} /> 
              <span className="pixel-font" style={{ fontSize: '16px', lineHeight: '1', fontWeight: 'bold' }}>ХАНТИ</span>
            </button>
          </div>
          <div style={{ marginTop: '50px' }}>
            <img src="/jager-logo.png" alt="Jägermeister" style={{ width: '250px', borderRadius: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.4)' }} />
          </div>
        </div>
      </div>
    );
  }

  if (showStory) {
    return (
      <div style={{ padding: '25px', textAlign: 'center', backgroundColor: '#1E392A', color: '#fff', minHeight: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); .pixel-font { font-family: 'Press Start 2P', 'Courier New', monospace; -webkit-font-smoothing: none; font-smooth: never; }`}</style>
        <div style={{ backgroundColor: '#112218', border: '4px solid #FF6B00', borderRadius: '16px', padding: '25px', maxWidth: '380px', boxShadow: '0 8px 0px #CC5500' }}>
          <h2 className="pixel-font" style={{ fontSize: '14px', color: '#FF6B00', marginBottom: '20px', lineHeight: '1.5' }}>НАЧАЛО ОХОТЫ</h2>
          <p className="pixel-font" style={{ fontSize: '11px', color: '#ddd', lineHeight: '1.8', textAlign: 'left', marginBottom: '30px' }}>
            «Город погрузился в пиксельную ночь. Легендарный рецепт из 56 трав утерян, а его части спрятаны в лучших барах. Твоя миссия — зачистить 8 локаций, отсканировать секретные коды и восстановить рецепт. Охота началась!»
          </p>
          <button onClick={() => setShowStory(false)} style={{ padding: '15px 30px', fontSize: '14px', backgroundColor: '#FF6B00', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', boxShadow: '0 4px 0px #CC5500' }} className="pixel-font">
            В БОЙ!
          </button>
        </div>
      </div>
    );
  }

  if (gameFinished) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#1E392A', color: '#fff', minHeight: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap'); .pixel-font { font-family: 'Press Start 2P', 'Courier New', monospace; -webkit-font-smoothing: none; font-smooth: never; }`}</style>
        <h2 className="pixel-font" style={{ fontSize: '16px', color: '#FF6B00', marginBottom: '20px' }}>ЭПИЧЕСКАЯ ПОБЕДА!</h2>
        <p style={{ fontSize: '12px', marginBottom: '30px', lineHeight: '1.6', maxWidth: '350px' }} className="pixel-font">
          Рецепт из 56 трав восстановлен! Выбери свой сундук с наградой:
        </p>
        {!selectedReward ? (
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
            <div onClick={() => handleSelectReward('merch')} style={{ backgroundColor: '#112218', border: '4px solid #FF6B00', borderRadius: '12px', padding: '20px', width: '140px', cursor: 'pointer', boxShadow: '0 6px 0px #CC5500', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎁</div>
              <span className="pixel-font" style={{ fontSize: '9px', color: '#fff', lineHeight: '1.4' }}>ЭПИЧЕСКАЯ ЭКИПИРОВКА<br/>(Мерч)</span>
            </div>
            <div onClick={() => handleSelectReward('bottle')} style={{ backgroundColor: '#112218', border: '4px solid #FF6B00', borderRadius: '12px', padding: '15px', width: '140px', cursor: 'pointer', boxShadow: '0 6px 0px #CC5500', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/jager-logo.png" alt="Бутылка Jägermeister" style={{ width: '50px', height: '80px', objectFit: 'contain', marginBottom: '8px' }} />
              <span className="pixel-font" style={{ fontSize: '9px', color: '#fff', lineHeight: '1.4' }}>ЛЕГЕНДАРНЫЙ ЭЛИКСИР</span>
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: '#112218', border: '4px solid #4ade80', borderRadius: '16px', padding: '20px', maxWidth: '350px', marginBottom: '20px' }}>
            <h3 className="pixel-font" style={{ fontSize: '12px', color: '#4ade80', marginBottom: '15px' }}>НАГРАДА ВЫБРАНА!</h3>
            <p style={{ fontSize: '11px', lineHeight: '1.6', marginBottom: '15px', color: '#ddd' }} className="pixel-font">
              {selectedReward === 'merch' ? '🎁 Вы выбрали: Лимитированный мерч Jägermeister.' : '🍾 Вы выбрали: Фирменную бутылку Jägermeister.'}
            </p>
            <p style={{ fontSize: '10px', color: '#FF6B00', lineHeight: '1.6', marginBottom: '10px' }} className="pixel-font">
              📍 Где забрать приз:<br/><b>Бар «Флагманский Jager Haus» (ул. Барная, 56)</b>
            </p>
            <p style={{ fontSize: '9px', color: '#888', lineHeight: '1.5' }}>Покажи этот экран Хранителю (бармену) в призовом баре. Внимание: кнопку «Выдать приз» нажимает только персонал!</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#1E392A', color: '#fff', minHeight: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .pixel-font { font-family: 'Press Start 2P', 'Courier New', monospace; -webkit-font-smoothing: none; font-smooth: never; }
        
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
      
      <h1 className="pixel-font" style={{ fontSize: '16px', color: '#FF6B00', textShadow: '2px 2px 0px #111', marginTop: '10px' }}>КАРТА ОХОТЫ</h1>
      <p style={{ fontSize: '12px', marginTop: '10px', color: '#4ade80' }} className="pixel-font">Охотник: <span style={{color: '#fff'}}>{selectedCharacter}</span></p>

      {isAllCompleted && (
        <button onClick={() => setGameFinished(true)} style={{ marginTop: '15px', padding: '15px 20px', backgroundColor: '#FF6B00', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', width: '100%', maxWidth: '400px', boxShadow: '0 6px 0px #CC5500', zIndex: 10 }} className="pixel-font">
          ✨ СОБРАТЬ ЭЛИКСИР ✨
        </button>
      )}

      {/* Окно уровня */}
      <div style={{ 
        position: 'relative', marginTop: '30px', width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column',
        backgroundColor: '#112516', padding: '20px 0', borderRadius: '16px', border: '4px solid #2A4E3C', overflow: 'hidden',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
      }}>
        
        {/* Дорога */}
        <div style={{ 
          position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', 
          width: '56px', backgroundColor: '#3A2010', 
          borderLeft: '6px solid #1E392A', borderRight: '6px solid #1E392A', zIndex: 0,
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)'
        }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '4px', borderLeft: '4px dashed #5C2E0B' }}></div>
        </div>

        {/* Травка */}
        <div style={{ position: 'absolute', top: '10%', left: 'calc(50% - 40px)', fontSize: '12px', zIndex: 0 }}>🌿</div>
        <div style={{ position: 'absolute', top: '30%', left: 'calc(50% + 25px)', fontSize: '14px', zIndex: 0 }}>🌱</div>
        <div style={{ position: 'absolute', top: '50%', left: 'calc(50% - 35px)', fontSize: '12px', zIndex: 0 }}>🌿</div>
        <div style={{ position: 'absolute', top: '75%', left: 'calc(50% + 30px)', fontSize: '14px', zIndex: 0 }}>🌱</div>
        <div style={{ position: 'absolute', top: '90%', left: 'calc(50% - 42px)', fontSize: '10px', zIndex: 0 }}>🌿</div>

        {/* --- ГУСТОЙ ЛЕС (МНОГОСЛОЙНОСТЬ) --- */}
        
        {/* Дальний план (маленькие, темные, позади всего) */}
        <div className="tree-sway" style={{ position: 'absolute', top: '3%', left: '2%', fontSize: '16px', opacity: 0.4, zIndex: 0 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '12%', right: '3%', fontSize: '18px', opacity: 0.5, zIndex: 0 }}>🌲</div>
        <div className="tree-sway" style={{ position: 'absolute', top: '22%', left: '8%', fontSize: '14px', opacity: 0.3, zIndex: 0 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '35%', right: '1%', fontSize: '16px', opacity: 0.4, zIndex: 0 }}>🌲</div>
        <div className="tree-sway" style={{ position: 'absolute', top: '48%', left: '3%', fontSize: '18px', opacity: 0.5, zIndex: 0 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '60%', right: '7%', fontSize: '14px', opacity: 0.3, zIndex: 0 }}>🌲</div>
        <div className="tree-sway" style={{ position: 'absolute', top: '78%', left: '2%', fontSize: '16px', opacity: 0.4, zIndex: 0 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '88%', right: '2%', fontSize: '18px', opacity: 0.5, zIndex: 0 }}>🌲</div>

        {/* Средний план (стандартные деревья) */}
        <div className="tree-sway" style={{ position: 'absolute', top: '8%', left: '12%', fontSize: '24px', opacity: 0.7, zIndex: 2 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '18%', right: '14%', fontSize: '22px', opacity: 0.6, zIndex: 2 }}>🌲</div>
        <div className="tree-sway" style={{ position: 'absolute', top: '28%', left: '4%', fontSize: '28px', opacity: 0.8, zIndex: 2 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '42%', right: '10%', fontSize: '26px', opacity: 0.7, zIndex: 2 }}>🌲</div>
        <div className="tree-sway" style={{ position: 'absolute', top: '55%', left: '11%', fontSize: '24px', opacity: 0.6, zIndex: 2 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '68%', right: '5%', fontSize: '28px', opacity: 0.8, zIndex: 2 }}>🌲</div>
        <div className="tree-sway" style={{ position: 'absolute', top: '82%', left: '13%', fontSize: '22px', opacity: 0.7, zIndex: 2 }}>🌲</div>
        <div className="tree-sway-alt" style={{ position: 'absolute', top: '92%', right: '12%', fontSize: '26px', opacity: 0.8, zIndex: 2 }}>🌲</div>

        {/* Передний план (огромные деревья, перекрывают всё, создавая глубину) */}
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
          <img src="/logogo.jpg " alt="Logo" className="deer-sprite" style={{ width: '55px' }} />
        </div>

        {locations.map((loc, index) => {
          const isLeft = index % 2 === 0;
          return (
            <div key={loc.id} style={{ display: 'flex', justifyContent: isLeft ? 'flex-start' : 'flex-end', alignItems: 'center', width: '100%', marginBottom: '25px', position: 'relative', zIndex: 3, padding: '0 15px', boxSizing: 'border-box' }}>
              
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '20px', height: '20px', backgroundColor: loc.completed ? '#FFD700' : '#8B4513', border: `4px solid ${loc.completed ? '#CC5500' : '#5C2E0B'}`, borderRadius: '50%', zIndex: 4, boxShadow: '0 0 10px rgba(0,0,0,0.8)' }}></div>
              
              <div onClick={() => !loc.completed && setActiveBar(loc)} style={{ backgroundColor: loc.completed ? '#2d1b0d' : '#4a2f1d', border: `4px solid ${loc.completed ? '#FFD700' : '#8B4513'}`, borderRadius: '8px', padding: '12px 8px', width: '40%', cursor: loc.completed ? 'default' : 'pointer', boxShadow: loc.completed ? '0 4px 0px #1a0f07' : '0 4px 0px #2b1a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '4px', left: '4px', width: '4px', height: '4px', backgroundColor: '#111', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', top: '4px', right: '4px', width: '4px', height: '4px', backgroundColor: '#111', borderRadius: '50%' }}></div>

                <div style={{ fontSize: '24px', marginBottom: '8px', filter: loc.completed ? 'drop-shadow(0 0 5px #FFD700)' : 'none' }}>
                  {loc.completed ? <img src="/jager-logo.png" alt="Jager" style={{ width: '32px', height: '32px', objectFit: 'contain', backgroundColor: '#fff', borderRadius: '6px', padding: '2px' }} /> : loc.emoji}
                </div>
                <span className="pixel-font" style={{ fontSize: '8px', color: loc.completed ? '#FFD700' : '#fff', marginBottom: '6px', lineHeight: '1.4' }}>{loc.name}</span>
                <span className="pixel-font" style={{ fontSize: '7px', color: loc.completed ? '#ccc' : '#e0c097', marginBottom: '10px', lineHeight: '1.3' }}>{loc.ingredient}</span>
                <button className="pixel-font" style={{ fontSize: '8px', padding: '8px', backgroundColor: loc.completed ? 'transparent' : '#FF6B00', color: loc.completed ? '#FFD700' : '#fff', border: loc.completed ? 'none' : '2px solid #CC5500', borderRadius: '6px', fontWeight: 'bold', width: '100%', textShadow: loc.completed ? 'none' : '1px 1px 0 #111' }}>
                  {loc.completed ? '✅' : 'СКАН'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeBar && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', zIndex: 100 }}>
          <div style={{ backgroundColor: '#112218', border: '4px solid #FF6B00', borderRadius: '16px', padding: '20px', maxWidth: '320px', textAlign: 'center', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}>
            <h3 className="pixel-font" style={{ fontSize: '12px', color: '#FF6B00', marginBottom: '15px' }}>{activeBar.name}</h3>
            <p style={{ fontSize: '14px', marginBottom: '20px' }}>Артефакт: <span style={{ fontSize: '24px', verticalAlign: 'middle' }}>{activeBar.emoji}</span> <b style={{ color: '#e0c097' }}>{activeBar.ingredient}</b></p>
            <p style={{ fontSize: '11px', color: '#aaa', marginBottom: '20px', lineHeight: '1.5' }}>Наведите камеру на тейбл-тент в баре для сбора ингредиента.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleScanQRCode(activeBar.id)} style={{ flex: 1, padding: '12px', backgroundColor: '#FF6B00', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 0px #CC5500' }} className="pixel-font">СКАНЕР</button>
              <button onClick={() => setActiveBar(null)} style={{ flex: 1, padding: '12px', backgroundColor: '#2A4E3C', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 0px #143d21' }} className="pixel-font">НАЗАД</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;