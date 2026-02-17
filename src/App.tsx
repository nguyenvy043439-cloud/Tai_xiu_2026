import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io({
  query: {
    roomId: (() => {
      const params = new URLSearchParams(window.location.search);
      let rid = params.get('room');
      if (!rid) {
        rid = `HV:${Math.floor(100 + Math.random() * 900)}.${Math.floor(100 + Math.random() * 900)}`;
        params.set('room', rid);
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
      }
      return rid;
    })(),
    isAdmin: window.location.pathname === '/admin' ? 'true' : 'false'
  }
});

const Game = () => {
  const [roomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || 'default';
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [dices, setDices] = useState([1, 2, 3]);
  const [shake, setShake] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'); 
    audioRef.current.loop = true;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.log("Music play blocked:", e));
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  };

  useEffect(() => {
    const handleStateUpdate = (state: any) => {
      setIsOpen(state.isOpen);
      setIsRolling(state.isRolling);
      setDices(state.dices);
      if (state.isRolling) {
        setShake(true);
        setHasRolled(true);
      } else {
        setShake(false);
      }
    };

    socket.on('stateUpdate', handleStateUpdate);
    socket.emit('requestState');

    return () => {
      socket.off('stateUpdate', handleStateUpdate);
    };
  }, [roomId]);

  const getDiceImage = (val: number) => {
    return `/images/dice/${val}.png`;
  };

  useEffect(() => {
    if (isOpen) {
      setHasRolled(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let audio: HTMLAudioElement | null = null;

    const playAudio = async () => {
      if (isRolling) {
        audio = new Audio('/sounds/shake.mp3');
        audio.loop = true;
        try {
          await audio.play();
        } catch (error) {
          console.log("Phát âm thanh bị chặn hoặc lỗi:", error);
          const handleInteraction = async () => {
            try {
              if (audio) await audio.play();
              window.removeEventListener('click', handleInteraction);
              window.removeEventListener('touchstart', handleInteraction);
            } catch (e) {
              console.error("Lỗi khi phát lại sau tương tác:", e);
            }
          };
          window.addEventListener('click', handleInteraction);
          window.addEventListener('touchstart', handleInteraction);
        }
      }
    };

    playAudio();

    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio = null;
      }
    };
  }, [isRolling]);

  const handlePlateAreaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRolling) return;

    if (isOpen) {
      socket.emit('adminCommand', { type: 'RESET', roomId });
      setTimeout(() => {
        socket.emit('adminCommand', { type: 'ROLL', roomId });
      }, 300);
    } else if (hasRolled) {
      socket.emit('adminCommand', { type: 'OPEN', roomId });
    } else {
      socket.emit('adminCommand', { type: 'ROLL', roomId });
    }
  };

  const handleGlobalClick = () => {
    if (isRolling) return;

    if (isOpen) {
      socket.emit('adminCommand', { type: 'RESET', roomId });
      setTimeout(() => {
        socket.emit('adminCommand', { type: 'ROLL', roomId });
      }, 300);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black flex flex-col items-center justify-center overflow-hidden font-sans select-none"
      onClick={handleGlobalClick}
    >
      {/* Room ID Display */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded text-yellow-400 text-[24px] font-bold font-mono pointer-events-none">
        {roomId}
      </div>

      {/* Music Toggle Button */}
      <button 
        onClick={toggleMusic}
        className="absolute bottom-4 right-4 z-50 bg-black/50 p-3 rounded-full border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20 transition-all shadow-lg"
      >
        {isMusicPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
        )}
      </button>

      {/* ID Display Vertical - Right Side */}
      <div className="absolute right-[60px] top-1/2 -translate-y-1/2 z-50 flex flex-col items-center pointer-events-none">
        <div className="flex flex-col text-[14px] font-bold text-yellow-400/80 uppercase leading-tight tracking-tighter items-center">
          <span>I</span>
          <span>D</span>
          <span className="my-1">:</span>
          {roomId.split('').map((char, i) => (
            <span key={i}>{char}</span>
          ))}
        </div>
      </div>

      {/* Sidebar Dices */}
      <div className="absolute right-[4px] top-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-1 z-50 pointer-events-none">
        {[1, 2, 3, 4, 5, 6].map((val) => (
          <img 
            key={`sidebar-dice-${val}`}
            src={getDiceImage(val)} 
            alt={`dice-${val}`} 
            className="w-[45px] h-[45px] object-contain opacity-90 shadow-lg"
          />
        ))}
      </div>

      <div className="absolute inset-0 z-0 w-full h-full flex items-center justify-center bg-black">
        <div className="relative h-full w-full max-w-[500px]">
          <img 
            src="/images/nen_game.jpeg" 
            alt="Game Board" 
            className="w-full h-full object-fill shadow-2xl" 
          />

          {/* ID Display Vertical Left (Removing as requested to move to right) */}
          <div className="absolute top-[28%] left-[12%] z-50 flex flex-col items-center pointer-events-none">
            <>

          {/* Game Play Area Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`relative w-full aspect-square flex items-center justify-center transition-all duration-300 ${shake ? 'scale-[0.55]' : 'scale-[0.45]'} translate-x-[30px]`}>
              <div className="absolute inset-0 z-0 flex items-center justify-center">
                <img 
                  src="/images/dia_trang.png" 
                  alt="Plate" 
                  className="w-[90%] h-[90%] object-contain drop-shadow-2xl" 
                />
              </div>

              <div 
                className={`absolute z-10 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleGlobalClick();
                }}
              >
                <div className="relative w-[180px] h-[180px] flex items-center justify-center scale-[1.8]">
                  {/* Dice 1 - Top Center */}
                  <img 
                    src={getDiceImage(dices[0])} 
                    alt="dice-0" 
                    className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[65px] h-[65px] object-contain p-1 pointer-events-auto" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGlobalClick();
                    }}
                  />
                  {/* Dice 2 - Bottom Left */}
                  <img 
                    src={getDiceImage(dices[1])} 
                    alt="dice-1" 
                    className="absolute bottom-[18%] left-[10%] w-[65px] h-[65px] object-contain p-1 pointer-events-auto" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGlobalClick();
                    }}
                  />
                  {/* Dice 3 - Bottom Right */}
                  <img 
                    src={getDiceImage(dices[2])} 
                    alt="dice-2" 
                    className="absolute bottom-[18%] right-[10%] w-[65px] h-[65px] object-contain p-1 pointer-events-auto" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGlobalClick();
                    }}
                  />
                </div>
              </div>

              {/* Bowl Lid */}
              <div 
                className={`absolute inset-0 z-20 flex items-center justify-center transition-all duration-700 ease-in-out cursor-pointer ${shake ? 'animate-vibrate' : ''} ${isOpen ? '-translate-y-[60%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
                onClick={handlePlateAreaClick}
              >
                <img 
                  src="/images/nap_vang.png" 
                  alt="Bowl Lid" 
                  className="w-[90%] h-[90%] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]" 
                />
              </div>

              {/* Interaction Overlay */}
              {!isOpen && !isRolling && (
                <div 
                  className={`absolute inset-0 z-30 cursor-pointer`}
                  onClick={handlePlateAreaClick}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes vibrate {
          0% { transform: translate(0); }
          10% { transform: translate(-4px, 4px) rotate(-1deg); }
          20% { transform: translate(4px, -4px) rotate(1deg); }
          30% { transform: translate(-4px, -4px) rotate(-1deg); }
          40% { transform: translate(4px, 4px) rotate(1deg); }
          50% { transform: translate(-4px, 2px) rotate(-1deg); }
          60% { transform: translate(4px, -2px) rotate(1deg); }
          70% { transform: translate(-4px, -4px) rotate(-1deg); }
          80% { transform: translate(4px, 4px) rotate(1deg); }
          90% { transform: translate(-2px, 2px) rotate(0deg); }
          100% { transform: translate(0); }
        }
        .animate-vibrate { animation: vibrate 0.2s linear infinite; }
      `}} />
    </div>
  );
};

const Admin = () => {
  const [selectedValues, setSelectedValues] = useState<number[]>([1, 1, 1]);
  const [rooms, setRooms] = useState<Record<string, any>>({});
  const [selectedRoomId, setSelectedRoomId] = useState<string>('default');

  const [selectedRange, setSelectedRange] = useState<{min: number, max: number} | null>(null);

  useEffect(() => {
    const handleAllRoomsUpdate = (allRooms: Record<string, any>) => {
      setRooms(allRooms);
    };

    socket.on('allRoomsUpdate', handleAllRoomsUpdate);
    socket.emit('adminCommand', { type: 'GET_ALL_ROOMS' });

    return () => {
      socket.off('allRoomsUpdate', handleAllRoomsUpdate);
    };
  }, []);

  // Animation effect for range selection
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (selectedRange) {
      interval = setInterval(() => {
        const randomDices = [
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1
        ];
        // Calculate sum to ensure it stays in range for the visual effect
        let sum = randomDices.reduce((a, b) => a + b, 0);
        // If out of range, just shift one dice to get closer (simple visual approximation)
        if (sum < selectedRange.min) randomDices[0] = Math.min(6, randomDices[0] + (selectedRange.min - sum));
        if (sum > selectedRange.max) randomDices[0] = Math.max(1, randomDices[0] - (sum - selectedRange.max));
        
        setSelectedValues(randomDices);
      }, 150);
    }
    return () => clearInterval(interval);
  }, [selectedRange]);

  const currentRoomState = rooms[selectedRoomId] || {
    isOpen: false,
    isRolling: false,
    dices: [1, 1, 1],
    isOnline: false
  };

  const handleRoll = () => {
    if (currentRoomState.isOpen) return;
    socket.emit('adminCommand', { type: 'ROLL', roomId: selectedRoomId });
  };
  const handleOpen = () => {
    if (currentRoomState.isOpen) return;
    socket.emit('adminCommand', { type: 'OPEN', roomId: selectedRoomId });
  };
  const handleReset = () => {
    socket.emit('adminCommand', { type: 'RESET', roomId: selectedRoomId });
  };

  const getDiceImage = (val: number) => {
    return `/images/dice/${val}.png`;
  };

  useEffect(() => {
    // When rolling starts or dices update, sync the admin selection buttons
    if (currentRoomState.isRolling || !currentRoomState.isOpen) {
      setSelectedValues(currentRoomState.dices);
    }
  }, [currentRoomState.isRolling, currentRoomState.dices, currentRoomState.isOpen]);

  const toggleDiceValue = (diceIndex: number, value: number) => {
    if (currentRoomState.isOpen) return;
    setSelectedRange(null); // Clear range if manual dice is selected
    const newSelected = [...selectedValues];
    newSelected[diceIndex] = value;
    setSelectedValues(newSelected);
    
    // Update server immediately so it shows on Admin's "Current Status"
    socket.emit('adminCommand', { 
      type: 'SET_NEXT_RESULT', 
      roomId: selectedRoomId, 
      value: newSelected 
    });
  };

  const handleSetResult = () => {
    setSelectedRange(null);
    socket.emit('adminCommand', { 
      type: 'SET_NEXT_RESULT', 
      roomId: selectedRoomId, 
      value: selectedValues 
    });
    alert("Đã chọn kết quả: " + selectedValues.join(', '));
  };

  const handleSetRange = (min: number, max: number, label: string) => {
    if (currentRoomState.isOpen) return;
    setSelectedRange({ min, max });
    socket.emit('adminCommand', { 
      type: 'SET_FORCED_RANGE', 
      roomId: selectedRoomId, 
      value: { min, max } 
    });
    // The server will update currentRoomState.dices immediately, 
    // and our useEffect will update the selected buttons.
  };

  const isControlDisabled = currentRoomState.isOpen;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-xl font-bold mb-4 text-yellow-500 text-center uppercase tracking-widest">Admin Control</h1>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Room Selection */}
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
          <label className="block text-sm font-bold text-gray-400 mb-2 uppercase">Chọn thiết bị (Room ID)</label>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(rooms).map(id => (
              <button 
                key={id}
                className={`px-4 py-2 rounded-lg border flex items-center gap-2 ${selectedRoomId === id ? 'bg-yellow-500 border-white' : 'bg-gray-700 border-gray-600'}`}
                onClick={() => setSelectedRoomId(id)}
              >
                <div className={`w-2 h-2 rounded-full ${rooms[id].isOnline ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,1)] animate-pulse' : 'bg-gray-500'}`}></div>
                {id}
              </button>
            ))}
          </div>
        </div>

        {/* Current Status of Selected Room */}
        <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Trạng thái: {selectedRoomId}</h2>
            <div className="flex gap-2">
               <span className={`px-2 py-1 rounded text-xs ${currentRoomState.isOpen ? 'bg-green-600' : 'bg-red-600'}`}>
                 {currentRoomState.isOpen ? 'MỞ' : 'ĐÓNG'}
               </span>
               {currentRoomState.isRolling && (
                 <span className="px-2 py-1 rounded text-xs bg-yellow-600 animate-pulse">XÓC...</span>
               )}
            </div>
          </div>
          <div className="flex justify-center gap-4">
            {currentRoomState.dices.map((d: number, i: number) => (
              <img key={i} src={getDiceImage(d)} className="w-16 h-16 bg-white rounded-lg p-1" alt={`dice-${d}`} />
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className={`bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-700 shadow-xl ${isControlDisabled ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
          <h2 className="text-sm mb-6 font-black text-center text-yellow-500 uppercase tracking-widest">Điều khiển kết quả</h2>

          <div className="flex flex-col gap-6">
            {[0, 1, 2].map(diceIdx => (
              <div key={diceIdx} className="space-y-3">
                <div className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em] text-center">Xí ngầu {diceIdx + 1}</div>
                <div className="flex justify-between items-center gap-1 overflow-x-auto pb-2 no-scrollbar">
                  {[1, 2, 3, 4, 5, 6].map(val => (
                    <button
                      key={`${diceIdx}-${val}`}
                      disabled={isControlDisabled}
                      onClick={() => toggleDiceValue(diceIdx, val)}
                      className={`flex-shrink-0 w-12 h-12 p-1.5 rounded-xl border-2 transition-all duration-200 ${selectedValues[diceIdx] === val ? 'bg-yellow-500 border-white scale-105 shadow-[0_0_20px_rgba(255,255,255,0.8)] border-opacity-100' : 'bg-gray-900 border-gray-700 opacity-60'}`}
                    >
                      <img src={getDiceImage(val)} alt={`dice-${val}`} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <button 
              disabled={isControlDisabled}
              onClick={() => handleSetRange(3, 10, "Xỉu")}
              className="px-6 py-4 rounded-xl font-black text-sm bg-blue-600 hover:bg-blue-500 uppercase tracking-widest disabled:bg-gray-700"
            >
              Xỉu (3-10)
            </button>
            <button 
              disabled={isControlDisabled}
              onClick={() => handleSetRange(11, 18, "Tài")}
              className="px-6 py-4 rounded-xl font-black text-sm bg-red-600 hover:bg-red-500 uppercase tracking-widest disabled:bg-gray-700"
            >
              Tài (11-18)
            </button>
            <button 
              disabled={isControlDisabled}
              onClick={handleSetResult}
              className="col-span-2 py-5 rounded-xl font-black text-lg bg-yellow-600 hover:bg-yellow-500 uppercase tracking-widest shadow-lg disabled:bg-gray-700"
            >
              Xác nhận kết quả
            </button>
            <button 
              disabled={isControlDisabled}
              onClick={handleRoll} 
              className="py-4 rounded-xl font-black bg-gray-700 hover:bg-gray-600 uppercase disabled:bg-gray-800"
            >
              Xóc
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Game />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  </Router>
);

export default App;
