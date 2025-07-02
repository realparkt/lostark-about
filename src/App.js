import React, { useState, useEffect, useRef } from 'react';
import { Clock, Users, Search, AlertCircle, Trash2, Plus, Calendar, ArrowLeft } from 'lucide-react'; 

// API 키를 환경 변수에서 불러옵니다.
// Vercel에서 REACT_APP_LOSTARK_API_KEY 이름으로 환경 변수를 설정해주세요.
const API_KEY = process.env.REACT_APP_LOSTARK_API_KEY; 

export default function RaidManager() {
  const [characterName, setCharacterName] = useState('');
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [raids, setRaids] = useState([]);
  const [selectedRaid, setSelectedRaid] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRaidName, setNewRaidName] = useState('');
  const [newRaidDate, setNewRaidDate] = useState('');
  const [newRraidTime, setNewRaidTime] = useState('');
  const [draggedCharacter, setDraggedCharacter] = useState(null);
  const [showRaidDetails, setShowRaidDetails] = useState(false); 

  // useRef를 사용하여 공격대 목록 컨테이너에 접근
  const raidListRef = useRef(null); 

  // API 키가 설정되지 않았을 때 에러 메시지
  useEffect(() => {
    if (!API_KEY) {
      setError('오류: API 키가 설정되지 않았습니다. Vercel 환경 변수 (REACT_APP_LOSTARK_API_KEY)를 확인해주세요.');
    }
  }, []); 

  // 저장된 공격대 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRaids = localStorage.getItem('lostarkRaids');
      if (savedRaids) {
        try {
          const parsedRaids = JSON.parse(savedRaids);
          setRaids(parsedRaids);
          // 앱 로드 시 첫 번째 공격대가 있다면 선택하고 상세 정보 표시
          if (parsedRaids.length > 0 && !selectedRaid) {
              setSelectedRaid(parsedRaids[0].id);
              setShowRaidDetails(true); 
          }
        } catch (e) {
          console.error('Failed to parse saved raids:', e);
        }
      }
    }
  }, []); 

  // 공격대 출발 일시 24시간 이후 자동 삭제 기능
  useEffect(() => {
    const checkExpiredRaids = () => {
      const now = new Date();
      const filteredRaids = raids.filter(raid => {
        const raidDateTime = new Date(raid.dateTime);
        const twentyFourHoursAfterRaid = new Date(raidDateTime.getTime() + 24 * 60 * 60 * 1000); 
        return now < twentyFourHoursAfterRaid; 
      });
      
      if (filteredRaids.length !== raids.length) {
        setRaids(filteredRaids);
        if (typeof window !== 'undefined') {
          localStorage.setItem('lostarkRaids', JSON.stringify(filteredRaids));
        }
        // 삭제된 공격대가 선택된 공격대였다면 선택 해제 및 목록으로 돌아가기
        if (selectedRaid && !filteredRaids.some(raid => raid.id === selectedRaid)) {
            setSelectedRaid(null);
            setShowRaidDetails(false); 
        }
        console.log('만료된 공격대 삭제 완료.');
      }
    };

    // 1분마다 체크
    const intervalId = setInterval(checkExpiredRaids, 60000); 
    // 컴포넌트 언마운트 시 또는 raids가 변경될 때 setInterval 클리어
    return () => clearInterval(intervalId);
  }, [raids, selectedRaid]); 

  // 캐릭터 검색
  const searchCharacter = async () => {
    if (!API_KEY) { 
      setError('오류: API 키가 설정되지 않았습니다. Vercel 환경 변수를 확인해주세요.');
      return;
    }

    if (!characterName) {
      setError('캐릭터명을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // API 요청 URL: Curl로 성공한 경로인 '/characters/' 사용
      const response = await fetch(
        `/characters/${encodeURIComponent(characterName)}/siblings`, 
        {
          headers: {
            'accept': 'application/json',
            'authorization': `bearer ${API_KEY}`
          }
        }
      );

      // 응답이 OK가 아니면 에러 처리
      if (!response.ok) {
        let errorMessage = '캐릭터 정보를 가져올 수 없습니다. 다시 시도해주세요.';
        if (response.status === 400) {
            errorMessage = '잘못된 요청입니다. 캐릭터명을 확인해주세요.';
        } else if (response.status === 401) {
            errorMessage = 'API 키가 유효하지 않거나 만료되었습니다.';
        } else if (response.status === 404) {
            errorMessage = '해당 캐릭터 또는 연관 캐릭터를 찾을 수 없습니다.';
        } else if (response.status === 429) {
            errorMessage = 'API 호출 제한을 초과했습니다. 잠시 후 다시 시도해주세요.';
        } else if (response.status >= 500) {
            errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }
        throw new Error(errorMessage);
      }

      const data = await response.json(); 
      
      if (!data || data.length === 0) {
        setError('해당 캐릭터 또는 연관 캐릭터를 찾을 수 없습니다.');
        setCharacters([]);
      } else {
        let highestIlvlChar = null;
        let highestIlvl = -1;
        
        // ItemAvgLevel은 "1,661.67"과 같은 문자열이므로 숫자로 변환하여 비교합니다.
        const parsedData = data.map(char => ({
          ...char,
          parsedIlvl: parseFloat(char.ItemAvgLevel.replace(/,/g, ''))
        }));

        parsedData.forEach(char => {
          if (char.parsedIlvl > highestIlvl) {
            highestIlvl = char.parsedIlvl;
            highestIlvlChar = char;
          }
        });

        // 아이템 레벨 가장 높은 캐릭터와 배럭 이름 변경 로직
        const transformedCharacters = parsedData.map(char => {
            const mainCharName = highestIlvlChar ? highestIlvlChar.CharacterName : '';
            if (char.CharacterName === mainCharName) {
                // 가장 높은 레벨 캐릭터는 원래 이름 그대로 표시
                return { ...char, displayName: char.CharacterName }; 
            } else {
                // 그 외 캐릭터는 '실제캐릭터이름 (메인캐릭터이름)' 형태로 표시
                return { 
                    ...char, 
                    displayName: `${char.CharacterName} (${mainCharName})` 
                };
            }
        });

        // 아이템 레벨 기준으로 내림차순 정렬
        transformedCharacters.sort((a, b) => b.parsedIlvl - a.parsedIlvl);

        setCharacters(transformedCharacters);
        setError(''); 
      }
    } catch (err) {
      setError(err.message);
      setCharacters([]);
    } finally {
      setLoading(false);
    }
  };

  // 공격대 생성
  const createRaid = () => {
    if (!newRaidName || !newRaidDate || !newRraidTime) {
      setError('모든 정보를 입력해주세요.');
      return;
    }

    const raidDateTimeStr = `${newRaidDate}T${newRraidTime}:00`; 
    const newDate = new Date(raidDateTimeStr);

    if (isNaN(newDate.getTime())) { 
        setError('유효하지 않은 날짜 또는 시간 형식입니다. 올바른 날짜와 시간을 선택해주세요.');
        return;
    }
    
    const newRaid = {
      id: Date.now(), 
      name: newRaidName,
      dateTime: newDate.toISOString(), 
      party1: { dealers: [], support: null },
      party2: { dealers: [], support: null }
    };

    const updatedRaids = [...raids, newRaid];
    setRaids(updatedRaids);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lostarkRaids', JSON.stringify(updatedRaids));
    }
    
    setNewRaidName('');
    setNewRaidDate('');
    setNewRaidTime('');
    setShowCreateModal(false);
    setSelectedRaid(newRaid.id); 
    setError(''); 

    // 공격대 생성 후 상세 정보 화면으로 전환
    setShowRaidDetails(true); 

    // 공격대 생성 후 목록의 맨 아래로 스크롤 (DOM 업데이트 후 실행)
    setTimeout(() => {
        if (raidListRef.current) {
            raidListRef.current.scrollTop = raidListRef.current.scrollHeight;
        }
    }, 0);
  };

  // 공격대 삭제
  const deleteRaid = (raidId) => {
    const updatedRaids = raids.filter(raid => raid.id !== raidId);
    setRaids(updatedRaids);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lostarkRaids', JSON.stringify(updatedRaids));
    }
    if (selectedRaid === raidId) {
      // 삭제된 공격대가 선택된 공격대였다면, 다른 공격대를 선택하거나 선택 해제
      setSelectedRaid(updatedRaids.length > 0 ? updatedRaids[0].id : null);
      setShowRaidDetails(false); // 삭제 후 목록 화면으로 돌아가기
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e, character) => {
    e.dataTransfer.setData('text/plain', JSON.stringify(character));
    setDraggedCharacter(character); 
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = (e, partyNum, slot) => {
    e.preventDefault();
    const droppedCharacterData = e.dataTransfer.getData('text/plain');
    let droppedCharacter;
    try {
        droppedCharacter = JSON.parse(droppedCharacterData);
    } catch (error) {
        console.error("Failed to parse dragged character data:", error);
        return; 
    }


    if (!droppedCharacter || !selectedRaid) return;

    const updatedRaids = raids.map(raid => {
      if (raid.id === selectedRaid) {
        const updatedRaid = { ...raid };
        
        // 드롭된 캐릭터가 이미 다른 슬롯에 있다면 먼저 제거 (CharacterName으로 비교)
        ['party1', 'party2'].forEach(partyKey => {
          if (updatedRaid[partyKey].support?.CharacterName === droppedCharacter.CharacterName) {
            updatedRaid[partyKey].support = null;
          }
          updatedRaid[partyKey].dealers = updatedRaid[partyKey].dealers.filter(
            d => d.CharacterName !== droppedCharacter.CharacterName
          );
        });

        // 새 위치에 배치
        if (slot === 'support') {
          updatedRaid[`party${partyNum}`].support = droppedCharacter;
        } else { // 딜러 슬롯
          if (updatedRaid[`party${partyNum}`].dealers.length < 3) {
            updatedRaid[`party${partyNum}`].dealers.push(droppedCharacter);
          } else {
            setError('딜러 슬롯이 꽉 찼습니다. 기존 캐릭터를 먼저 제거해주세요.');
            return updatedRaid; 
          }
        }
        setError(''); 
        return updatedRaid;
      }
      return raid;
    });

    setRaids(updatedRaids);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lostarkRaids', JSON.stringify(updatedRaids));
    }
    setDraggedCharacter(null); 
  };

  // 캐릭터 제거 (슬롯에서)
  const removeCharacter = (partyNum, slot, index = null) => {
    const updatedRaids = raids.map(raid => {
      if (raid.id === selectedRaid) {
        const updatedRaid = { ...raid };
        if (slot === 'support') {
          updatedRaid[`party${partyNum}`].support = null;
        } else { // dealer
          updatedRaid[`party${partyNum}`].dealers.splice(index, 1);
        }
        return updatedRaid;
      }
      return raid;
    });

    setRaids(updatedRaids);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lostarkRaids', JSON.stringify(updatedRaids));
    }
  };

  const currentRaid = raids.find(raid => raid.id === selectedRaid);

  // 날짜 포맷팅 함수 (로컬 시간대로)
  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false 
    });
  };

  // 모달 오픈 시 현재 날짜/시간으로 초기값 설정
  useEffect(() => {
    if (showCreateModal && !newRaidDate && !newRraidTime) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      
      const hours = String(today.getHours()).padStart(2, '0');
      const minutes = String(today.getMinutes()).padStart(2, '0');

      setNewRaidDate(`${year}-${month}-${day}`);
      setNewRaidTime(`${hours}:${minutes}`);
    }
  }, [showCreateModal, newRaidDate, newRraidTime]); 

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 overflow-x-auto">
      <div className="min-w-[1024px] max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">로스트아크 공격대 관리</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-md flex items-center max-w-2xl mx-auto">
            <AlertCircle className="mr-2 flex-shrink-0" size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-6">
          {/* 좌측: 캐릭터 조회 */}
          <div className="w-1/2 bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Search className="mr-2" size={20} />
              캐릭터 조회
            </h2>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchCharacter()}
                placeholder="캐릭터명 입력"
                className="flex-1 px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                onClick={searchCharacter}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {loading ? '조회중...' : '조회'}
              </button>
            </div>

            {/* 캐릭터 목록 */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {characters.length === 0 && !loading && (
                <div className="text-center text-gray-500 py-8">
                  캐릭터를 검색해주세요
                </div>
              )}
              {characters.map((char, index) => (
                <div
                  key={`${char.CharacterName}-${index}`} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, char)} 
                  className="p-3 bg-gray-700 rounded-md cursor-move hover:bg-gray-600 transition-colors"
                >
                  <div className="font-semibold">{char.displayName || char.CharacterName}</div> 
                  <div className="text-sm text-gray-400">
                    Lv.{char.CharacterLevel} {char.CharacterClassName}
                  </div>
                  <div className="text-xs text-gray-500">
                    아이템 레벨: {char.ItemAvgLevel}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 우측: 공격대 관리 */}
          <div className="w-1/2 bg-gray-800 p-6 rounded-lg">
            {/* showRaidDetails 상태에 따라 목록 또는 상세 정보 표시 */}
            {!showRaidDetails ? (
              <>
                <h2 className="text-xl font-semibold mb-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="mr-2" size={20} />
                    공격대 목록
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md transition-colors flex items-center text-sm"
                  >
                    <Plus className="mr-1" size={16} />
                    공격대 만들기
                  </button>
                </h2>

                {/* 공격대 목록 */}
                <div ref={raidListRef} className="mb-4 space-y-2 max-h-[200px] overflow-y-auto">
                  {raids.map(raid => {
                    // 각 공격대의 현재 인원 계산
                    const totalMembers = 
                      raid.party1.dealers.length + (raid.party1.support ? 1 : 0) +
                      raid.party2.dealers.length + (raid.party2.support ? 1 : 0);
                    const isFull = totalMembers === 8;
                    const indicatorColor = isFull ? 'bg-green-500' : 'bg-red-500';

                    return (
                      <div
                        key={raid.id}
                        onClick={() => {
                            setSelectedRaid(raid.id);
                            setShowRaidDetails(true); 
                        }}
                        className={`p-3 rounded-md transition-colors cursor-pointer flex items-center justify-between ${
                          selectedRaid === raid.id
                            ? 'bg-blue-600'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        <div className="flex items-center">
                          {/* 모집 상태 시각화 */}
                          <div className={`w-3 h-3 rounded-full mr-2 ${indicatorColor}`}></div>
                          <div>
                            <div className="font-semibold">{raid.name}</div>
                            <div className="text-sm text-gray-300 flex items-center">
                              <Clock className="mr-1" size={14} />
                              {formatDateTime(raid.dateTime)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); 
                            deleteRaid(raid.id);
                          }}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {raids.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    공격대를 생성해주세요
                  </div>
                )}
              </>
            ) : (
              // 선택된 공격대 상세 정보
              currentRaid && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-4 flex items-center justify-between">
                    <button 
                      onClick={() => setShowRaidDetails(false)} 
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors flex items-center text-sm"
                    >
                      <ArrowLeft className="mr-1" size={16} />
                      목록으로 돌아가기
                    </button>
                    <div className="flex items-center">
                      <Users className="mr-2" size={20} />
                      공격대 상세
                    </div>
                  </h2>

                  <div className="bg-gray-700 p-3 rounded-md">
                    <h3 className="font-semibold mb-1">{currentRaid.name}</h3>
                    <div className="text-sm text-gray-400">
                      출발: {formatDateTime(currentRaid.dateTime)}
                    </div>
                  </div>

                  {/* 파티 구성 */}
                  {[1, 2].map(partyNum => (
                    <div key={partyNum} className="bg-gray-700 p-4 rounded-md">
                      <h3 className="font-semibold mb-3">{partyNum}파티</h3>
                      
                      {/* 딜러 슬롯 */}
                      <div className="mb-3">
                        <div className="text-sm text-gray-400 mb-2">딜러 (3명)</div>
                        <div className="grid grid-cols-3 gap-2">
                          {[0, 1, 2].map(index => {
                            const dealer = currentRaid[`party${partyNum}`].dealers[index];
                            return (
                              <div
                                key={index} 
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, partyNum, 'dealer')}
                                className="p-2 bg-gray-600 rounded border-2 border-dashed border-gray-500 min-h-[70px] relative"
                              >
                                {dealer ? (
                                  <>
                                    <div className="text-xs font-semibold">{dealer.displayName || dealer.CharacterName}</div>
                                    <div className="text-xs text-gray-400">{dealer.CharacterClassName}</div>
                                    {/* Lv.과 아이템 레벨 추가 */}
                                    <div className="text-xs text-gray-500">
                                      Lv.{dealer.CharacterLevel} / IL.{dealer.ItemAvgLevel}
                                    </div>
                                    <button
                                      onClick={() => removeCharacter(partyNum, 'dealer', index)}
                                      className="absolute top-1 right-1 text-red-400 hover:text-red-300 w-4 h-4 flex items-center justify-center"
                                    >
                                      ×
                                    </button>
                                  </>
                                ) : (
                                  <div className="text-xs text-gray-500 text-center mt-2">드래그하여 배치</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 서포터 슬롯 */}
                      <div>
                        <div className="text-sm text-gray-400 mb-2">서포터 (1명)</div>
                        <div
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, partyNum, 'support')}
                          className="p-2 bg-gray-600 rounded border-2 border-dashed border-gray-500 min-h-[70px] relative"
                        >
                          {currentRaid[`party${partyNum}`].support ? (
                            <>
                              <div className="text-xs font-semibold">
                                {currentRaid[`party${partyNum}`].support.displayName || currentRaid[`party${partyNum}`].support.CharacterName}
                              </div>
                              <div className="text-xs text-gray-400">
                                {currentRaid[`party${partyNum}`].support.CharacterClassName}
                              </div>
                              {/* Lv.과 아이템 레벨 추가 */}
                              <div className="text-xs text-gray-500">
                                Lv.{currentRaid[`party${partyNum}`].support.CharacterLevel} / IL.{currentRaid[`party${partyNum}`].support.ItemAvgLevel}
                              </div>
                              <button
                                onClick={() => removeCharacter(partyNum, 'support')}
                                className="absolute top-1 right-1 text-red-400 hover:text-red-300 w-4 h-4 flex items-center justify-center"
                              >
                                ×
                              </button>
                            </>
                          ) : (
                            <div className="text-xs text-gray-500 text-center mt-2">드래그하여 배치</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
            {/* 상세 정보가 없거나, 공격대가 선택되지 않았을 때의 메시지 */}
            {!showRaidDetails && raids.length > 0 && (
              <div className="text-center text-gray-500 py-8">
                공격대를 선택해주세요
              </div>
            )}
          </div>
        </div>

        {/* 공격대 생성 모달 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Calendar className="mr-2" size={20} />
                새 공격대 만들기
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="raidName" className="block text-sm font-medium mb-1">공격대 이름</label>
                  <input
                    id="raidName"
                    type="text"
                    value={newRaidName}
                    onChange={(e) => setNewRaidName(e.target.value)}
                    placeholder="예: 발탄 하드"
                    className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label htmlFor="raidDate" className="block text-sm font-medium mb-1">날짜</label>
                  <input
                    id="raidDate"
                    type="date"
                    value={newRaidDate}
                    onChange={(e) => setNewRaidDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-300"
                  />
                </div>
                
                <div>
                  <label htmlFor="raidTime" className="block text-sm font-medium mb-1">시간</label>
                  <input
                    id="raidTime"
                    type="time"
                    value={newRraidTime}
                    onChange={(e) => setNewRaidTime(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-300"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex gap-2">
                <button
                  onClick={createRaid}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                  만들기
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewRaidName('');
                    setNewRaidDate('');
                    setNewRaidTime('');
                    setError(''); 
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
