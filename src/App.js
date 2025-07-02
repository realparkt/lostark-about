import React, { useState, useEffect, useRef } from 'react';
import { Clock, Users, Search, AlertCircle, Trash2, Plus, Calendar, ArrowLeft, UserPlus } from 'lucide-react';

// API 키를 환경 변수에서 불러옵니다.
// 이 부분은 배포 환경에서 설정되어야 합니다. 로컬 개발 시 .env 파일을 사용하세요.
const API_KEY = process.env.REACT_APP_LOSTARK_API_KEY; 

export default function RaidManager() {
  // 컴포넌트 렌더링 시작 로그 (매 렌더링마다 호출됨)
  console.log('RaidManager 컴포넌트 렌더링됨. 현재 API_KEY 상태:', API_KEY ? API_KEY.substring(0, 10) + '...' : '설정되지 않음');

  // 상태 변수 정의
  const [characterName, setCharacterName] = useState(''); // 검색할 캐릭터 이름
  const [characters, setCharacters] = useState([]); // 검색된 캐릭터 목록
  const [loading, setLoading] = useState(false); // 로딩 상태
  const [error, setError] = useState(''); // 에러 메시지
  const [raids, setRaids] = useState([]); // 생성된 공격대 목록
  const [selectedRaid, setSelectedRaid] = useState(null); // 현재 선택된 공격대 ID (뷰잉/할당 대상)
  const [showCreateModal, setShowCreateModal] = useState(false); // 공격대 생성 모달 표시 여부
  const [newRaidName, setNewRaidName] = useState(''); // 새 공격대 이름
  const [newRaidDate, setNewRaidDate] = useState(''); // 새 공격대 날짜
  const [newRraidTime, setNewRaidTime] = useState(''); // 새 공격대 시간
  
  // 캐릭터 할당을 위한 상태 (클릭 할당)
  const [characterToAssign, setCharacterToAssign] = useState(null); // 할당할 캐릭터 정보
  const [showRaidSelectionModal, setShowRaidSelectionModal] = useState(false); // 공격대 선택 모달 표시 여부 (새로 추가)
  const [showAssignModal, setShowAssignModal] = useState(false); // 캐릭터 파티 할당 모달 표시 여부

  const [showRaidDetails, setShowRaidDetails] = useState(false); // 공격대 상세 정보 표시 여부 (모바일용)

  // useRef를 사용하여 공격대 목록 컨테이너에 접근
  const raidListRef = useRef(null); 

  // API 키 초기 확인 및 에러 메시지 설정
  useEffect(() => {
    console.log('useEffect [API_KEY 확인]: 실행됨.');
    if (!API_KEY) { 
      setError('오류: API 키가 설정되지 않았습니다. Vercel 환경 변수 (REACT_APP_LOSTARK_API_KEY)를 확인해주세요.');
      console.error('useEffect [API_KEY 확인]: API_KEY가 정의되지 않았거나 비어 있습니다!');
    } else {
      console.log('useEffect [API_KEY 확인]: API_KEY가 설정됨. 길이:', API_KEY.length);
      // API 키의 시작과 끝 부분을 로깅하여 정확성 확인 (보안을 위해 전체 키 로깅은 피함)
      console.log('useEffect [API_KEY 확인]: API_KEY 시작:', API_KEY.substring(0, 5), '끝:', API_KEY.substring(API_KEY.length - 5));
    }
  }, []); 

  // 저장된 공격대 불러오기
  useEffect(() => {
    console.log('useEffect [저장된 공격대 불러오기]: 실행됨.');
    // `window` 객체가 브라우저 환경에서만 접근 가능하도록 확인
    if (typeof window !== 'undefined') {
      const savedRaids = localStorage.getItem('lostarkRaids');
      if (savedRaids) {
        try {
          const parsedRaids = JSON.parse(savedRaids);
          setRaids(parsedRaids);
          // 저장된 공격대가 있다면 첫 번째 공격대를 기본으로 선택 (뷰잉 목적)
          if (parsedRaids.length > 0) {
              setSelectedRaid(parsedRaids[0].id);
          }
          console.log('useEffect [저장된 공격대 불러오기]: 저장된 공격대 성공적으로 불러옴. 개수:', parsedRaids.length);
        } catch (e) {
          console.error('useEffect [저장된 공격대 불러오기]: 저장된 공격대 파싱 실패:', e);
        }
      } else {
        console.log('useEffect [저장된 공격대 불러오기]: 저장된 공격대를 찾을 수 없습니다.');
      }
    }
    // 초기 로드 시에는 상세 정보를 숨김
    setShowRaidDetails(false); 
  }, []); 

  // 공격대 출발 일시 24시간 이후 자동 삭제 기능
  useEffect(() => {
    console.log('useEffect [만료된 공격대 확인 간격]: 간격 설정 중.');
    const checkExpiredRaids = () => {
      console.log('checkExpiredRaids: 만료된 공격대 확인 실행 중.');
      const now = new Date();
      const filteredRaids = raids.filter(raid => {
        const raidDateTime = new Date(raid.dateTime);
        // 공격대 출발 시간으로부터 24시간 이후를 계산
        const twentyFourHoursAfterRaid = new Date(raidDateTime.getTime() + 24 * 60 * 60 * 1000); 
        // 현재 시간이 24시간 이후보다 이전이면 유지
        return now < twentyFourHoursAfterRaid; 
      });
      
      // 만료된 공격대가 있어서 목록이 변경된 경우에만 상태 업데이트 및 저장
      if (filteredRaids.length !== raids.length) {
        console.log('checkExpiredRaids: 만료된 공격대를 찾았습니다. 삭제 중...');
        setRaids(filteredRaids);
        if (typeof window !== 'undefined') {
          localStorage.setItem('lostarkRaids', JSON.stringify(filteredRaids));
        }
        // 현재 선택된 공격대가 삭제된 경우, 선택을 해제하거나 다른 공격대로 변경
        if (selectedRaid && !filteredRaids.some(raid => raid.id === selectedRaid)) {
            setSelectedRaid(null);
            setShowRaidDetails(false); // 상세 정보도 숨김
        }
        console.log('checkExpiredRaids: 만료된 공격대 삭제됨. 새 공격대 개수:', filteredRaids.length); 
      } else {
        console.log('checkExpiredRaids: 만료된 공격대를 찾을 수 없습니다.');
      }
    };

    // 1분(60000ms)마다 만료된 공격대 확인
    const intervalId = setInterval(checkExpiredRaids, 60000); 
    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      console.log('useEffect [만료된 공격대 확인 간격]: 간격 정리 중.');
      clearInterval(intervalId);
    };
  }, [raids, selectedRaid]); // raids와 selectedRaid가 변경될 때마다 재실행

  // 캐릭터 검색 함수
  const searchCharacter = async () => {
    console.log('searchCharacter: 함수 호출됨.');
    if (!API_KEY) { 
      setError('오류: API 키가 설정되지 않았습니다. Vercel 환경 변수 (REACT_APP_LOSTARK_API_KEY)를 확인해주세요.');
      console.error('searchCharacter: API_KEY가 누락되어 가져오기를 진행할 수 없습니다.');
      return;
    }

    if (!characterName) {
      setError('캐릭터명을 입력해주세요.');
      console.warn('searchCharacter: 캐릭터 이름이 비어 있어 검색할 수 없습니다.');
      return;
    }

    setLoading(true); // 로딩 상태 시작
    setError(''); // 기존 에러 메시지 초기화
    
    try {
      // 로스트아크 API 엔드포인트
      const requestUrl = `https://developer-lostark.game.onstove.com/characters/${encodeURIComponent(characterName)}/siblings`; 
      console.log('searchCharacter: URL에서 가져오기 시도 중:', requestUrl);
      console.log('searchCharacter: 인증 헤더 (일부):', `bearer ${API_KEY.substring(0,10)}...`);

      const response = await fetch(requestUrl, {
        headers: {
          'accept': 'application/json',
          'authorization': `bearer ${API_KEY}` // API 키를 Authorization 헤더에 포함
        }
      });

      console.log('searchCharacter: API 응답 수신됨. 상태:', response.status);

      const responseBodyText = await response.text(); // 응답 본문을 텍스트로 먼저 읽음
      console.log('searchCharacter: 원시 응답 텍스트 (일부):', responseBodyText.substring(0, 500));

      let data;
      try {
        data = JSON.parse(responseBodyText); // 텍스트를 JSON으로 파싱
        console.log('searchCharacter: JSON 데이터 성공적으로 파싱됨. 데이터 (일부):', JSON.stringify(data).substring(0, 200) + '...');
      } catch (jsonError) {
        console.error('searchCharacter: JSON 파싱 실패!', jsonError);
        setError(`데이터 파싱 오류: 서버가 유효한 JSON을 반환하지 않았습니다. 응답 내용: ${responseBodyText.substring(0, 100)}...`);
        return; // 파싱 실패 시 함수 종료
      }

      if (!response.ok) { // HTTP 상태 코드가 200번대가 아닌 경우
        console.error('searchCharacter: API 응답이 OK가 아님. HTTP 상태:', response.status);
        
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
        // HTML 응답이 온 경우 (예: API 게이트웨이 오류) 추가 정보 제공
        if (responseBodyText.startsWith('<!doctype html>')) {
            errorMessage += ` (서버 응답: ${responseBodyText.substring(0, 100)}...)`;
        }
        throw new Error(errorMessage); // 에러 발생
      }
      
      if (!data || data.length === 0) {
        setError('해당 캐릭터 또는 연관 캐릭터를 찾을 수 없습니다.');
        setCharacters([]); // 캐릭터 목록 초기화
        console.log('searchCharacter: 데이터에서 캐릭터를 찾을 수 없습니다.');
      } else {
        let highestIlvlChar = null;
        let highestIlvl = -1;
        
        // 아이템 레벨을 숫자로 파싱하여 정렬을 위해 사용
        const parsedData = data.map(char => ({
          ...char,
          parsedIlvl: parseFloat(char.ItemAvgLevel.replace(/,/g, ''))
        }));

        // 가장 높은 아이템 레벨을 가진 캐릭터 찾기 (대표 캐릭터 표시용)
        parsedData.forEach(char => {
          if (char.parsedIlvl > highestIlvl) {
            highestIlvl = char.parsedIlvl;
            highestIlvlChar = char;
          }
        });

        // 대표 캐릭터 이름을 포함한 표시 이름 생성
        const transformedCharacters = parsedData.map(char => {
            const mainCharName = highestIlvlChar ? highestIlvlChar.CharacterName : '';
            if (char.CharacterName === mainCharName) {
                return { ...char, displayName: char.CharacterName }; // 대표 캐릭터는 본인 이름만 표시
            } else {
                return { 
                    ...char, 
                    displayName: `${char.CharacterName} (${mainCharName})` // 부캐는 (대표캐) 형식으로 표시
                };
            }
        });

        // 아이템 레벨 기준으로 내림차순 정렬
        transformedCharacters.sort((a, b) => b.parsedIlvl - a.parsedIlvl); 

        setCharacters(transformedCharacters); // 캐릭터 목록 상태 업데이트
        setError(''); // 에러 메시지 초기화
        console.log('searchCharacter: 캐릭터 성공적으로 처리 및 설정됨. 개수:', transformedCharacters.length);
      }
    } catch (err) {
      console.error('searchCharacter: 가져오기 또는 처리 중 오류 발생 (외부 catch):', err); 
      setError(err.message); // 에러 메시지 설정
      setCharacters([]); // 에러 발생 시 캐릭터 목록 초기화
    } finally {
      setLoading(false); // 로딩 상태 종료
      console.log('searchCharacter: 함수 종료.');
    }
  };

  // 공격대 생성 함수
  const createRaid = () => {
    console.log('createRaid: 함수 호출됨.');
    if (!newRaidName || !newRaidDate || !newRraidTime) {
      setError('모든 정보를 입력해주세요.');
      console.warn('createRaid: 공격대 생성 정보가 누락되었습니다.');
      return;
    }

    // 날짜와 시간을 결합하여 ISO 문자열 생성
    const raidDateTimeStr = `${newRaidDate}T${newRraidTime}:00`; 
    const newDate = new Date(raidDateTimeStr);

    // 유효하지 않은 날짜/시간 형식 검사
    if (isNaN(newDate.getTime())) { 
        setError('유효하지 않은 날짜 또는 시간 형식입니다. 올바른 날짜와 시간을 선택해주세요.');
        console.error('createRaid: 유효하지 않은 날짜/시간 형식.');
        return;
    }
    
    // 새 공격대 객체 생성
    const newRaid = {
      id: Date.now(), // 고유 ID (현재 타임스탬프 사용)
      name: newRaidName,
      dateTime: newDate.toISOString(), // ISO 형식으로 저장
      party1: { dealers: [], support: null }, // 1파티 딜러/서포터 초기화
      party2: { dealers: [], support: null }  // 2파티 딜러/서포터 초기화
    };

    const updatedRaids = [...raids, newRaid]; // 기존 공격대 목록에 새 공격대 추가
    setRaids(updatedRaids); // 공격대 목록 상태 업데이트
    // 로컬 스토리지에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('lostarkRaids', JSON.stringify(updatedRaids));
      console.log('createRaid: 공격대 로컬 스토리지에 저장됨.');
    }
    
    // 모달 입력 필드 초기화 및 모달 닫기
    setNewRaidName('');
    setNewRaidDate('');
    setNewRaidTime('');
    setShowCreateModal(false);
    setSelectedRaid(newRaid.id); // 새로 생성된 공격대를 선택 (뷰잉 목적)
    setError(''); // 에러 메시지 초기화

    setShowRaidDetails(true); // 새 공격대 생성 후 바로 상세 정보 표시

    // 공격대 목록을 가장 아래로 스크롤하여 새로 생성된 공격대가 보이도록 함
    setTimeout(() => {
        if (raidListRef.current) {
            raidListRef.current.scrollTop = raidListRef.current.scrollHeight;
            console.log('createRaid: 공격대 목록을 맨 아래로 스크롤함.');
        }
    }, 0);
    console.log('createRaid: 공격대 생성 및 선택됨:', newRaid); 
  };

  // 공격대 삭제 함수
  const deleteRaid = (raidId) => {
    console.log('deleteRaid: ID:', raidId, '에 대해 함수 호출됨.');
    const updatedRaids = raids.filter(raid => raid.id !== raidId); // 해당 ID의 공격대 제거
    setRaids(updatedRaids); // 공격대 목록 상태 업데이트
    // 로컬 스토리지에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('lostarkRaids', JSON.stringify(updatedRaids));
      console.log('deleteRaid: 공격대 로컬 스토리지에서 제거됨.');
    }
    // 삭제된 공격대가 현재 선택된 공격대였다면, 선택 해제 또는 다른 공격대 선택
    if (selectedRaid === raidId) {
      setSelectedRaid(updatedRaids.length > 0 ? updatedRaids[0].id : null);
      setShowRaidDetails(false); // 상세 정보 숨김
    }
    console.log('deleteRaid: 공격대 삭제됨. 남은 공격대:', updatedRaids.length); 
  };

  // 캐릭터를 선택하여 공격대 선택 모달 열기 (기존 handleSelectCharacterToAssign 변경)
  const handleSelectCharacterToAssign = (character) => {
    setCharacterToAssign(character); // 할당할 캐릭터 설정
    setShowRaidSelectionModal(true); // 공격대 선택 모달 열기
    console.log('handleSelectCharacterToAssign: 할당할 캐릭터 선택됨. 공격대 선택 모달 열기:', character.displayName);
  };

  // 공격대 선택 모달에서 공격대를 선택했을 때 호출되는 함수 (새로 추가)
  const handleRaidSelectedForAssignment = (raidId) => {
    setSelectedRaid(raidId); // 할당할 공격대를 selectedRaid로 설정
    setShowRaidSelectionModal(false); // 공격대 선택 모달 닫기
    setShowAssignModal(true); // 파티 할당 모달 열기
    setError(''); // 에러 메시지 초기화
    console.log('handleRaidSelectedForAssignment: 할당할 공격대 선택됨:', raidId);
  };

  // 캐릭터를 파티에 할당
  const assignCharacterToParty = (partyNum, slot) => {
    // 할당할 캐릭터가 없거나 선택된 공격대가 없으면 함수 종료
    if (!characterToAssign || !selectedRaid) return;

    console.log(`assignCharacterToParty: ${characterToAssign.displayName}를 ${partyNum}파티, ${slot} 슬롯에 할당 중`);

    const updatedRaids = raids.map(raid => {
      if (raid.id === selectedRaid) { // 현재 선택된 공격대인 경우에만 업데이트
        const updatedRaid = { ...raid };
        
        // 이미 배치된 캐릭터인지 확인하고 기존 위치에서 제거
        ['party1', 'party2'].forEach(partyKey => {
          // 서포터 슬롯에서 제거
          if (updatedRaid[partyKey].support?.CharacterName === characterToAssign.CharacterName) {
            updatedRaid[partyKey].support = null;
            console.log('assignCharacterToParty: 서포터 슬롯에서 제거됨:', partyKey);
          }
          // 딜러 슬롯에서 제거
          updatedRaid[partyKey].dealers = updatedRaid[partyKey].dealers.filter(
            d => d.CharacterName !== characterToAssign.CharacterName
          );
          if (updatedRaid[partyKey].dealers.length < raid[partyKey].dealers.length) { 
            console.log('assignCharacterToParty: 딜러 슬롯에서 제거됨:', partyKey);
          }
        });

        // 새 위치에 캐릭터 배치
        if (slot === 'support') {
          updatedRaid[`party${partyNum}`].support = characterToAssign;
          console.log('assignCharacterToParty: 서포터 슬롯에 추가됨. 파티:', partyNum);
        } else { // 딜러 슬롯
          if (updatedRaid[`party${partyNum}`].dealers.length < 3) { // 딜러 슬롯이 3명 미만일 경우에만 추가
            updatedRaid[`party${partyNum}`].dealers.push(characterToAssign);
            console.log('assignCharacterToParty: 딜러 슬롯에 추가됨. 파티:', partyNum);
          } else {
            setError('딜러 슬롯이 꽉 찼습니다. 기존 캐릭터를 먼저 제거해주세요.');
            console.warn('assignCharacterToParty: 파티', partyNum, '의 딜러 슬롯이 가득 찼습니다.');
            return updatedRaid; // 변경 없이 현재 공격대 반환
          }
        }
        setError(''); // 에러 메시지 초기화
        return updatedRaid; // 업데이트된 공격대 반환
      }
      return raid; // 선택되지 않은 공격대는 그대로 반환
    });

    setRaids(updatedRaids); // 공격대 목록 상태 업데이트
    // 로컬 스토리지에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('lostarkRaids', JSON.stringify(updatedRaids));
      console.log('assignCharacterToParty: 공격대 로컬 스토리지에 업데이트됨.');
    }
    setCharacterToAssign(null); // 할당할 캐릭터 초기화
    setShowAssignModal(false); // 파티 할당 모달 닫기
    console.log('assignCharacterToParty: 할당 완료.');
  };

  // 캐릭터 제거 (슬롯에서)
  const removeCharacter = (partyNum, slot, index = null) => {
    console.log('removeCharacter: 호출됨. 파티:', partyNum, '슬롯:', slot, '인덱스:', index);
    const updatedRaids = raids.map(raid => {
      if (raid.id === selectedRaid) { // 현재 선택된 공격대인 경우에만 업데이트
        const updatedRaid = { ...raid };
        if (slot === 'support') {
          updatedRaid[`party${partyNum}`].support = null; // 서포터 제거
        } else { // 딜러 슬롯
          updatedRaid[`party${partyNum}`].dealers.splice(index, 1); // 해당 인덱스의 딜러 제거
        }
        return updatedRaid; // 업데이트된 공격대 반환
      }
      return raid; // 선택되지 않은 공격대는 그대로 반환
    });

    setRaids(updatedRaids); // 공격대 목록 상태 업데이트
    // 로컬 스토리지에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('lostarkRaids', JSON.stringify(updatedRaids));
      console.log('removeCharacter: 제거 후 공격대 로컬 스토리지에 업데이트됨.');
    }
    console.log('removeCharacter: 캐릭터가 슬롯에서 제거됨.');
  };

  // 현재 선택된 공격대 정보 가져오기
  const currentRaid = raids.find(raid => raid.id === selectedRaid);

  // 날짜 포맷팅 함수 (로컬 시간대로)
  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    // 한국어 로케일로 월, 일, 시간, 분 표시 (24시간 형식)
    return date.toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false 
    });
  };

  // 공격대 생성 모달 오픈 시 현재 날짜/시간으로 초기값 설정
  useEffect(() => {
    if (showCreateModal && !newRaidDate && !newRraidTime) {
      console.log('useEffect [모달 초기화]: 초기 모달 날짜/시간 설정 중.');
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 +1
      const day = String(today.getDate()).padStart(2, '0');
      
      const hours = String(today.getHours()).padStart(2, '0');
      const minutes = String(today.getMinutes()).padStart(2, '0');

      setNewRaidDate(`${year}-${month}-${day}`);
      setNewRaidTime(`${hours}:${minutes}`);
    }
  }, [showCreateModal, newRaidDate, newRraidTime]); // 모달이 열리고 날짜/시간이 비어있을 때만 실행

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 overflow-x-auto font-inter"> {/* Inter 폰트 적용 */}
      {console.log('RaidManager: JSX 출력 렌더링 중.')} 
      <div className="min-w-full md:min-w-[1024px] max-w-7xl mx-auto"> {/* 최소 너비 및 중앙 정렬 */}
        <h1 className="text-3xl font-bold mb-8 text-center">어바웃 공격대 관리</h1>
        
        {/* 에러 메시지 표시 */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-md flex items-center max-w-full md:max-w-2xl mx-auto text-sm">
            <AlertCircle className="mr-2 flex-shrink-0" size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6"> {/* 모바일에서는 세로, 데스크탑에서는 가로 정렬 */}
          {/* 좌측: 캐릭터 조회 섹션 */}
          <div className="w-full md:w-1/2 bg-gray-800 p-6 rounded-lg shadow-lg"> {/* 너비 설정 및 그림자 추가 */}
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Search className="mr-2" size={20} />
              캐릭터 조회
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-2 mb-4"> {/* 입력 필드와 버튼 정렬 */}
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchCharacter()} // Enter 키로 검색
                placeholder="캐릭터명 입력"
                className="flex-1 px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-base placeholder-gray-400" 
              />
              <button
                onClick={searchCharacter}
                disabled={loading} // 로딩 중일 때 버튼 비활성화
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed text-base font-medium" 
              >
                {loading ? '조회중...' : '조회'}
              </button>
            </div>

            {/* 캐릭터 목록 */}
            <div className="space-y-2 max-h-[400px] sm:max-h-[600px] overflow-y-auto pr-2 custom-scrollbar"> {/* 스크롤바 및 최대 높이 설정 */}
              {characters.length === 0 && !loading && (
                <div className="text-center text-gray-500 py-8">
                  캐릭터를 검색해주세요
                </div>
              )}
              {characters.map((char, index) => (
                <div
                  key={`${char.CharacterName}-${index}`} 
                  className="p-3 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors flex items-center justify-between shadow-sm"
                >
                  <div>
                    <div className="font-semibold text-base">{char.displayName || char.CharacterName}</div> 
                    <div className="text-sm text-gray-400">
                      Lv.{char.CharacterLevel} {char.CharacterClassName}
                    </div>
                    <div className="text-xs text-gray-500">
                      아이템 레벨: {char.ItemAvgLevel}
                    </div>
                  </div>
                  {/* 파티에 추가 버튼 (이제 항상 표시) */}
                  <button
                    onClick={() => handleSelectCharacterToAssign(char)}
                    className="ml-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded-md text-sm flex items-center font-medium"
                  >
                    <UserPlus size={16} className="mr-1" />
                    추가
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 우측: 공격대 관리 섹션 */}
          <div className="w-full md:w-1/2 bg-gray-800 p-6 rounded-lg shadow-lg"> 
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
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md transition-colors flex items-center text-sm font-medium"
                  >
                    <Plus className="mr-1" size={16} />
                    공격대 만들기
                  </button>
                </h2>

                {/* 공격대 목록 */}
                <div ref={raidListRef} className="mb-4 space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
                            setSelectedRaid(raid.id); // 공격대 선택
                            setShowRaidDetails(true); // 상세 정보 표시
                        }}
                        className={`p-3 rounded-md transition-colors cursor-pointer flex items-center justify-between shadow-sm ${
                          selectedRaid === raid.id
                            ? 'bg-blue-600' // 선택된 공격대 강조
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${indicatorColor}`}></div> {/* 인원 충족 여부 표시 */}
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
                            e.stopPropagation(); // 이벤트 버블링 방지 (공격대 선택 방지)
                            deleteRaid(raid.id); // 공격대 삭제
                          }}
                          className="text-red-400 hover:text-red-300 p-1 rounded-full transition-colors"
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
              // 선택된 공격대 상세 정보 표시
              currentRaid && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold mb-4 flex items-center justify-between">
                    <button 
                      onClick={() => setShowRaidDetails(false)} // 목록으로 돌아가기
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors flex items-center text-sm font-medium"
                    >
                      <ArrowLeft className="mr-1" size={16} />
                      목록으로 돌아가기
                    </button>
                    <div className="flex items-center">
                      <Users className="mr-2" size={20} />
                      공격대 상세
                    </div>
                  </h2>

                  {/* 현재 공격대 정보 요약 */}
                  <div className="bg-gray-700 p-3 rounded-md shadow-inner">
                    <h3 className="font-semibold mb-1">{currentRaid.name}</h3>
                    <div className="text-sm text-gray-400">
                      출발: {formatDateTime(currentRaid.dateTime)}
                    </div>
                  </div>

                  {/* 파티 구성 섹션 */}
                  {[1, 2].map(partyNum => (
                    <div key={partyNum} className="bg-gray-700 p-4 rounded-md shadow-md">
                      <h3 className="font-semibold mb-3">{partyNum}파티</h3>
                      
                      {/* 딜러 슬롯 */}
                      <div className="mb-3">
                        <div className="text-sm text-gray-400 mb-2">딜러 (3명)</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2"> {/* 반응형 그리드 */}
                          {[0, 1, 2].map(index => {
                            const dealer = currentRaid[`party${partyNum}`].dealers[index];
                            return (
                              <div
                                key={index} 
                                className="p-2 bg-gray-600 rounded border-2 border-dashed border-gray-500 min-h-[70px] relative flex flex-col justify-center items-center text-center"
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
                                      className="absolute top-1 right-1 text-red-400 hover:text-red-300 w-4 h-4 flex items-center justify-center rounded-full bg-gray-700/50"
                                    >
                                      ×
                                    </button>
                                  </>
                                ) : (
                                  <div className="text-xs text-gray-500">클릭하여 추가</div> 
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
                          className="p-2 bg-gray-600 rounded border-2 border-dashed border-gray-500 min-h-[70px] relative flex flex-col justify-center items-center text-center"
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
                                className="absolute top-1 right-1 text-red-400 hover:text-red-300 w-4 h-4 flex items-center justify-center rounded-full bg-gray-700/50"
                              >
                                ×
                              </button>
                            </>
                          ) : (
                            <div className="text-xs text-gray-500">클릭하여 추가</div> 
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
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in"> {/* 모달 배경 및 애니메이션 */}
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full shadow-2xl transform scale-100 animate-scale-in">
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
                    className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400"
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
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md transition-colors font-medium shadow-md"
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
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium shadow-md"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 새로 추가된 공격대 선택 모달 */}
        {showRaidSelectionModal && characterToAssign && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full shadow-2xl transform scale-100 animate-scale-in">
              <h3 className="text-xl font-semibold mb-4">
                '{characterToAssign.displayName || characterToAssign.CharacterName}'을(를) 할당할 공격대 선택
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {raids.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    생성된 공격대가 없습니다. 먼저 공격대를 만들어주세요.
                  </div>
                ) : (
                  raids.map(raid => (
                    <button
                      key={raid.id}
                      onClick={() => handleRaidSelectedForAssignment(raid.id)}
                      className="w-full text-left p-3 bg-gray-700 hover:bg-blue-600 rounded-md transition-colors shadow-sm"
                    >
                      <div className="font-semibold">{raid.name}</div>
                      <div className="text-sm text-gray-300 flex items-center">
                        <Clock className="mr-1" size={14} />
                        {formatDateTime(raid.dateTime)}
                      </div>
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={() => {
                  setShowRaidSelectionModal(false);
                  setCharacterToAssign(null);
                  setError('');
                }}
                className="mt-6 w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium shadow-md"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 캐릭터 할당 모달 (기존 모달) */}
        {showAssignModal && characterToAssign && currentRaid && ( // currentRaid가 유효한지 확인
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 p-6 rounded-lg max-w-sm w-full shadow-2xl transform scale-100 animate-scale-in">
              <h3 className="text-xl font-semibold mb-4">
                '{characterToAssign.displayName || characterToAssign.CharacterName}'을(를) '{currentRaid.name}'에 할당
              </h3>
              <div className="space-y-4">
                {/* 파티 선택 버튼 */}
                {[1, 2].map(partyNum => (
                  <div key={partyNum} className="bg-gray-700 p-3 rounded-md shadow-inner">
                    <h4 className="font-medium mb-2">{partyNum}파티</h4>
                    <div className="flex flex-col sm:flex-row gap-2"> {/* 버튼 정렬 */}
                      {/* 딜러 슬롯 할당 버튼 */}
                      <button
                        onClick={() => assignCharacterToParty(partyNum, 'dealer')}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium shadow-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
                        disabled={currentRaid[`party${partyNum}`].dealers.length >= 3}
                      >
                        딜러로 추가 ({currentRaid[`party${partyNum}`].dealers.length}/3)
                      </button>
                      {/* 서포터 슬롯 할당 버튼 */}
                      <button
                        onClick={() => assignCharacterToParty(partyNum, 'support')}
                        className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-sm font-medium shadow-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
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
                className="mt-6 w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium shadow-md"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Tailwind CSS 애니메이션을 위한 스타일 */}
      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        /* 커스텀 스크롤바 스타일 */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #374151; /* gray-700 */
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #6b7280; /* gray-500 */
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af; /* gray-400 */
        }
      `}</style>
    </div>
  );
}
