import React, { useState, useEffect, useRef } from 'react';
import { Clock, Users, Search, AlertCircle, Trash2, Plus, Calendar, ArrowLeft, UserPlus } from 'lucide-react'; // UserPlus 아이콘 추가

// API 키를 환경 변수에서 불러옵니다.
const API_KEY = process.env.REACT_APP_LOSTARK_API_KEY; 

export default function RaidManager() {
  // 컴포넌트 렌더링 시작 로그 (매 렌더링마다 호출됨)
  console.log('RaidManager Component Rendered. Current API_KEY state:', API_KEY ? API_KEY.substring(0, 10) + '...' : 'NOT SET');

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
  // 드래그앤드롭 대신 클릭으로 캐릭터 할당을 위한 상태
  const [characterToAssign, setCharacterToAssign] = useState(null); 
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [showRaidDetails, setShowRaidDetails] = useState(false); 

  // useRef를 사용하여 공격대 목록 컨테이너에 접근
  const raidListRef = useRef(null); 

  // API 키 초기 확인 및 에러 메시지 설정
  useEffect(() => {
    console.log('useEffect [API_KEY check]: Triggered.');
    if (!API_KEY) {
      setError('오류: API 키가 설정되지 않았습니다. Vercel 환경 변수 (REACT_APP_LOSTARK_API_KEY)를 확인해주세요.');
      console.error('useEffect [API_KEY check]: API_KEY is undefined or empty!');
    } else {
      console.log('useEffect [API_KEY check]: API_KEY is set. Length:', API_KEY.length);
      // API 키의 시작과 끝 부분을 로깅하여 정확성 확인
      console.log('useEffect [API_KEY check]: API_KEY start:', API_KEY.substring(0, 5), 'end:', API_KEY.substring(API_KEY.length - 5));
    }
  }, []); 

  // 저장된 공격대 불러오기
  useEffect(() => {
    console.log('useEffect [Load saved raids]: Triggered.');
    if (typeof window !== 'undefined') {
      const savedRaids = localStorage.getItem('lostarkRaids');
      if (savedRaids) {
        try {
          const parsedRaids = JSON.parse(savedRaids);
          setRaids(parsedRaids);
          if (parsedRaids.length > 0) {
              setSelectedRaid(parsedRaids[0].id);
          }
          console.log('useEffect [Load saved raids]: Successfully loaded saved raids. Count:', parsedRaids.length);
        } catch (e) {
          console.error('useEffect [Load saved raids]: Failed to parse saved raids:', e);
        }
      } else {
        console.log('useEffect [Load saved raids]: No saved raids found.');
      }
    }
    setShowRaidDetails(false); 
  }, []); 

  // 공격대 출발 일시 24시간 이후 자동 삭제 기능
  useEffect(() => {
    console.log('useEffect [Expired raids check interval]: Setting up interval.');
    const checkExpiredRaids = () => {
      console.log('checkExpiredRaids: Running expired raids check.');
      const now = new Date();
      const filteredRaids = raids.filter(raid => {
        const raidDateTime = new Date(raid.dateTime);
        const twentyFourHoursAfterRaid = new Date(raidDateTime.getTime() + 24 * 60 * 60 * 1000); 
        return now < twentyFourHoursAfterRaid; 
      });
      
      if (filteredRaids.length !== raids.length) {
        console.log('checkExpiredRaids: Expired raids found. Removing...');
        setRaids(filteredRaids);
        if (typeof window !== 'undefined') {
          localStorage.setItem('lostarkRaids', JSON.stringify(filteredRaids));
        }
        if (selectedRaid && !filteredRaids.some(raid => raid.id === selectedRaid)) {
            setSelectedRaid(null);
            setShowRaidDetails(false); 
        }
        console.log('checkExpiredRaids: Expired raids removed. New raids count:', filteredRaids.length); 
      } else {
        console.log('checkExpiredRaids: No expired raids found.');
      }
    };

    const intervalId = setInterval(checkExpiredRaids, 60000); 
    return () => {
      console.log('useEffect [Expired raids check interval]: Cleaning up interval.');
      clearInterval(intervalId);
    };
  }, [raids, selectedRaid]); 

  // 캐릭터 검색
  const searchCharacter = async () => {
    console.log('searchCharacter: Function called.');
    if (!API_KEY) { 
      setError('오류: API 키가 설정되지 않았습니다. Vercel 환경 변수 (REACT_APP_LOSTARK_API_KEY)를 확인해주세요.');
      console.error('searchCharacter: API_KEY is missing, cannot proceed with fetch.');
      return;
    }

    if (!characterName) {
      setError('캐릭터명을 입력해주세요.');
      console.warn('searchCharacter: Character name is empty, cannot search.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const requestUrl = `https://developer-lostark.game.onstove.com/characters/${encodeURIComponent(characterName)}/siblings`; 
      console.log('searchCharacter: Attempting to fetch from URL:', requestUrl);
      console.log('searchCharacter: Authorization header (truncated):', `bearer ${API_KEY.substring(0,10)}...`);

      const response = await fetch(requestUrl, {
        headers: {
          'accept': 'application/json',
          'authorization': `bearer ${API_KEY}`
        }
      });

      console.log('searchCharacter: API Response received. Status:', response.status);

      const responseBodyText = await response.text(); 
      console.log('searchCharacter: Raw response text (truncated):', responseBodyText.substring(0, 500));

      let data;
      try {
        data = JSON.parse(responseBodyText); 
        console.log('searchCharacter: Successfully parsed JSON data. Data (truncated):', JSON.stringify(data).substring(0, 200) + '...');
      } catch (jsonError) {
        console.error('searchCharacter: JSON parsing failed!', jsonError);
        setError(`데이터 파싱 오류: 서버가 유효한 JSON을 반환하지 않았습니다. 응답 내용: ${responseBodyText.substring(0, 100)}...`);
        return; 
      }

      if (!response.ok) {
        console.error('searchCharacter: API Response NOT OK. HTTP Status:', response.status);
        
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
        if (responseBodyText.startsWith('<!doctype html>')) {
            errorMessage += ` (서버 응답: ${responseBodyText.substring(0, 100)}...)`;
        }
        throw new Error(errorMessage);
      }
      
      if (!data || data.length === 0) {
        setError('해당 캐릭터 또는 연관 캐릭터를 찾을 수 없습니다.');
        setCharacters([]);
        console.log('searchCharacter: No characters found in data.');
      } else {
        let highestIlvlChar = null;
        let highestIlvl = -1;
        
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

        const transformedCharacters = parsedData.map(char => {
            const mainCharName = highestIlvlChar ? highestIlvlChar.CharacterName : '';
            if (char.CharacterName === mainCharName) {
                return { ...char, displayName: char.CharacterName }; 
            } else {
                return { 
                    ...char, 
                    displayName: `${char.CharacterName} (${mainCharName})` 
                };
            }
        });

        transformedCharacters.sort((a, b) => b.parsedIlvl - a.parsedIlvl); 

        setCharacters(transformedCharacters);
        setError(''); 
        console.log('searchCharacter: Characters successfully processed and set. Count:', transformedCharacters.length);
      }
    } catch (err) {
      console.error('searchCharacter: Error during fetch or processing (outer catch):', err); 
      setError(err.message);
      setCharacters([]);
    } finally {
      setLoading(false);
      console.log('searchCharacter: Function finished.');
    }
  };

  // 공격대 생성
  const createRaid = () => {
    console.log('createRaid: Function called.');
    if (!newRaidName || !newRaidDate || !newRraidTime) {
      setError('모든 정보를 입력해주세요.');
      console.warn('createRaid: Missing raid creation info.');
      return;
    }

    const raidDateTimeStr = `${newRaidDate}T${newRraidTime}:00`; 
    const newDate = new Date(raidDateTimeStr);

    if (isNaN(newDate.getTime())) { 
        setError('유효하지 않은 날짜 또는 시간 형식입니다. 올바른 날짜와 시간을 선택해주세요.');
        console.error('createRaid: Invalid date/time format.');
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
      console.log('createRaid: Raid saved to localStorage.');
    }
    
    setNewRaidName('');
    setNewRaidDate('');
    setNewRaidTime('');
    setShowCreateModal(false);
    setSelectedRaid(newRaid.id); 
    setError(''); 

    setShowRaidDetails(true); 

    setTimeout(() => {
        if (raidListRef.current) {
            raidListRef.current.scrollTop = raidListRef.current.scrollHeight;
            console.log('createRaid: Scrolled raid list to bottom.');
        }
    }, 0);
    console.log('createRaid: Raid created and selected:', newRaid); 
  };

  // 공격대 삭제
  const deleteRaid = (raidId) => {
    console.log('deleteRaid: Function called for ID:', raidId);
    const updatedRaids = raids.filter(raid => raid.id !== raidId);
    setRaids(updatedRaids);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lostarkRaids', JSON.stringify(updatedRaids));
      console.log('deleteRaid: Raid removed from localStorage.');
    }
    if (selectedRaid === raidId) {
      setSelectedRaid(updatedRaids.length > 0 ? updatedRaids[0].id : null);
      setShowRaidDetails(false); 
    }
    console.log('deleteRaid: Raid deleted. Remaining raids:', updatedRaids.length); 
  };

  // 모바일용: 캐릭터를 선택하여 할당 모달 열기
  const handleSelectCharacterToAssign = (character) => {
    setCharacterToAssign(character);
    setShowAssignModal(true);
    console.log('handleSelectCharacterToAssign: Selected character for assignment:', character.displayName);
  };

  // 모바일용: 캐릭터를 파티에 할당
  const assignCharacterToParty = (partyNum, slot) => {
    if (!characterToAssign || !selectedRaid) return;

    console.log(`assignCharacterToParty: Assigning ${characterToAssign.displayName} to Party ${partyNum}, Slot ${slot}`);

    const updatedRaids = raids.map(raid => {
      if (raid.id === selectedRaid) {
        const updatedRaid = { ...raid };
        
        // 이미 배치된 캐릭터인지 확인하고 제거
        ['party1', 'party2'].forEach(partyKey => {
          if (updatedRaid[partyKey].support?.CharacterName === characterToAssign.CharacterName) {
            updatedRaid[partyKey].support = null;
            console.log('assignCharacterToParty: Removed from support slot in', partyKey);
          }
          updatedRaid[partyKey].dealers = updatedRaid[partyKey].dealers.filter(
            d => d.CharacterName !== characterToAssign.CharacterName
          );
          if (updatedRaid[partyKey].dealers.length < raid[partyKey].dealers.length) { 
            console.log('assignCharacterToParty: Removed from dealer slot in', partyKey);
          }
        });

        // 새 위치에 배치
        if (slot === 'support') {
          updatedRaid[`party${partyNum}`].support = characterToAssign;
          console.log('assignCharacterToParty: Added to support slot in party', partyNum);
        } else { // 딜러 슬롯
          if (updatedRaid[`party${partyNum}`].dealers.length < 3) {
            updatedRaid[`party${partyNum}`].dealers.push(characterToAssign);
            console.log('assignCharacterToParty: Added to dealer slot in party', partyNum);
          } else {
            setError('딜러 슬롯이 꽉 찼습니다. 기존 캐릭터를 먼저 제거해주세요.');
            console.warn('assignCharacterToParty: Dealer slot full in party', partyNum);
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
      console.log('assignCharacterToParty: Raid updated in localStorage.');
    }
    setCharacterToAssign(null); 
    setShowAssignModal(false); // 모달 닫기
    console.log('assignCharacterToParty: Assignment finished.');
  };

  // 캐릭터 제거 (슬롯에서)
  const removeCharacter = (partyNum, slot, index = null) => {
    console.log('removeCharacter: Called. Party:', partyNum, 'Slot:', slot, 'Index:', index);
    const updatedRaids = raids.map(raid => {
      if (raid.id === selectedRaid) {
        const updatedRaid = { ...raid };
        if (slot === 'support') {
          updatedRaid[`party${partyNum}`].support = null;
        } else { 
          updatedRaid[`party${partyNum}`].dealers.splice(index, 1);
        }
        return updatedRaid;
      }
      return raid;
    });

    setRaids(updatedRaids);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lostarkRaids', JSON.stringify(updatedRaids));
      console.log('removeCharacter: Raid updated in localStorage after removal.');
    }
    console.log('removeCharacter: Character removed from slot.');
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
      console.log('useEffect [Modal init]: Setting initial modal date/time.');
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
      {console.log('RaidManager: Rendering JSX output.')} 
      <div className="min-w-full md:min-w-[1024px] max-w-7xl mx-auto"> {/* min-w-full 추가 */}
        <h1 className="text-3xl font-bold mb-8 text-center">about 공격대 관리</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-md flex items-center max-w-full md:max-w-2xl mx-auto text-sm"> {/* max-w-full, text-sm 추가 */}
            <AlertCircle className="mr-2 flex-shrink-0" size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6"> {/* flex-col md:flex-row 추가 */}
          {/* 좌측: 캐릭터 조회 */}
          <div className="w-full md:w-1/2 bg-gray-800 p-6 rounded-lg"> {/* w-full md:w-1/2 추가 */}
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Search className="mr-2" size={20} />
              캐릭터 조회
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-2 mb-4"> {/* flex-col sm:flex-row 추가 */}
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchCharacter()}
                placeholder="캐릭터명 입력"
                className="flex-1 px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-base" {/* text-base 추가 */}
              />
              <button
                onClick={searchCharacter}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed text-base" {/* text-base 추가 */}
              >
                {loading ? '조회중...' : '조회'}
              </button>
            </div>

            {/* 캐릭터 목록 */}
            <div className="space-y-2 max-h-[400px] sm:max-h-[600px] overflow-y-auto"> {/* max-h 조정 */}
              {characters.length === 0 && !loading && (
                <div className="text-center text-gray-500 py-8">
                  캐릭터를 검색해주세요
                </div>
              )}
              {characters.map((char, index) => (
                <div
                  key={`${char.CharacterName}-${index}`} 
                  // draggable 속성 제거 (모바일 드래그앤드롭 대신 클릭 할당)
                  // onDragStart 속성 제거
                  className="p-3 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-base">{char.displayName || char.CharacterName}</div> {/* text-base 추가 */}
                    <div className="text-sm text-gray-400">
                      Lv.{char.CharacterLevel} {char.CharacterClassName}
                    </div>
                    <div className="text-xs text-gray-500">
                      아이템 레벨: {char.ItemAvgLevel}
                    </div>
                  </div>
                  {/* 모바일용: 파티에 추가 버튼 */}
                  {selectedRaid && ( /* 선택된 공격대가 있을 때만 버튼 표시 */
                    <button
                      onClick={() => handleSelectCharacterToAssign(char)}
                      className="ml-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded-md text-sm flex items-center"
                    >
                      <UserPlus size={16} className="mr-1" />
                      추가
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 우측: 공격대 관리 */}
          <div className="w-full md:w-1/2 bg-gray-800 p-6 rounded-lg"> {/* w-full md:w-1/2 추가 */}
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2"> {/* grid-cols-1 sm:grid-cols-3 추가 */}
                          {[0, 1, 2].map(index => {
                            const dealer = currentRaid[`party${partyNum}`].dealers[index];
                            return (
                              <div
                                key={index} 
                                // onDragOver={handleDragOver} // 드래그앤드롭 제거
                                // onDrop={(e) => handleDrop(e, partyNum, 'dealer')} // 드래그앤드롭 제거
                                className="p-2 bg-gray-600 rounded border-2 border-dashed border-gray-500 min-h-[70px] relative"
                              >
                                {dealer ? (
                                  <>
                                    <div className="text-xs font-semibold">{dealer.displayName || dealer.CharacterName}</div>
                                    <div className="text-xs text-gray-400">{dealer.CharacterClassName}</div>
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
                                  <div className="text-xs text-gray-500 text-center mt-2">클릭하여 추가</div> {/* 텍스트 변경 */}
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
                          // onDragOver={handleDragOver} // 드래그앤드롭 제거
                          // onDrop={(e) => handleDrop(e, partyNum, 'support')} // 드래그앤드롭 제거
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
                            <div className="text-xs text-gray-500 text-center mt-2">클릭하여 추가</div> {/* 텍스트 변경 */}
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

        {/* 캐릭터 할당 모달 */}
        {showAssignModal && characterToAssign && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-sm w-full"> {/* max-w-sm으로 줄임 */}
              <h3 className="text-xl font-semibold mb-4">
                '{characterToAssign.displayName || characterToAssign.CharacterName}' 할당
              </h3>
              <div className="space-y-4">
                {/* 파티 선택 */}
                {[1, 2].map(partyNum => (
                  <div key={partyNum} className="bg-gray-700 p-3 rounded-md">
                    <h4 className="font-medium mb-2">{partyNum}파티</h4>
                    <div className="flex gap-2">
                      {/* 딜러 슬롯 할당 버튼 */}
                      <button
                        onClick={() => assignCharacterToParty(partyNum, 'dealer')}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm"
                        disabled={currentRaid[`party${partyNum}`].dealers.length >= 3}
                      >
                        딜러로 추가 ({currentRaid[`party${partyNum}`].dealers.length}/3)
                      </button>
                      {/* 서포터 슬롯 할당 버튼 */}
                      <button
                        onClick={() => assignCharacterToParty(partyNum, 'support')}
                        className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm"
                        disabled={currentRaid[`party${partyNum}`].support !== null}
                      >
                        서포터로 추가 ({currentRaid[`party${partyNum}`].support ? '1/1' : '0/1'})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setCharacterToAssign(null);
                  setError('');
                }}
                className="mt-6 w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
