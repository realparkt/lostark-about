import React, { useState, useEffect, useRef } from 'react';
import { Clock, Users, Search, AlertCircle, Trash2, Plus, Calendar, ArrowLeft, UserPlus, Loader } from 'lucide-react'; // Loader 아이콘 추가

// Firebase 관련 import
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, getDocs } from 'firebase/firestore'; // getDocs 추가

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
  const [newRaidDate, setNewRaidDate] = ''; // 새 공격대 날짜
  const [newRraidTime, setNewRaidTime] = useState(''); // 새 공격대 시간
  
  // 캐릭터 할당을 위한 상태 (클릭 할당)
  const [characterToAssign, setCharacterToAssign] = useState(null); // 할당할 캐릭터 정보
  const [showRaidSelectionModal, setShowRaidSelectionModal] = useState(false); // 공격대 선택 모달 표시 여부
  const [showAssignModal, setShowAssignModal] = useState(false); // 캐릭터 파티 할당 모달 표시 여부

  const [showRaidDetails, setShowRaidDetails] = useState(false); // 공격대 상세 정보 표시 여부 (모바일용)

  // Firebase 관련 상태
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // 인증 준비 완료 상태

  // useRef를 사용하여 공격대 목록 컨테이너에 접근
  const raidListRef = useRef(null); 

  // Firebase 초기화 및 인증
  useEffect(() => {
    console.log('useEffect [Firebase 초기화 및 인증]: 실행됨.');
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

    if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
      console.error('Firebase config is missing or empty.');
      setError('Firebase 설정이 누락되었습니다. 앱을 초기화할 수 없습니다.');
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);
      setDb(firestore);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          console.log('Firebase: 사용자 로그인됨. UID:', user.uid);
        } else {
          console.log('Firebase: 사용자가 로그인되어 있지 않음. 익명 로그인 시도 중...');
          try {
            const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
            if (initialAuthToken) {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
              setUserId(firebaseAuth.currentUser.uid);
              console.log('Firebase: 커스텀 토큰으로 로그인 성공. UID:', firebaseAuth.currentUser.uid);
            } else {
              await signInAnonymously(firebaseAuth);
              setUserId(firebaseAuth.currentUser.uid);
              console.log('Firebase: 익명 로그인 성공. UID:', firebaseAuth.currentUser.uid);
            }
          } catch (anonError) {
            console.error('Firebase: 익명 로그인 또는 커스텀 토큰 로그인 실패:', anonError);
            setError('Firebase 인증에 실패했습니다. 앱을 사용할 수 없습니다.');
          }
        }
        setIsAuthReady(true); // 인증 준비 완료
      });

      return () => {
        unsubscribe(); // 컴포넌트 언마운트 시 리스너 해제
        console.log('Firebase: onAuthStateChanged 리스너 해제됨.');
      };
    } catch (initError) {
      console.error('Firebase 초기화 실패:', initError);
      setError('Firebase 초기화 중 오류가 발생했습니다. 개발자 도구를 확인해주세요.');
    }
  }, []);

  // API 키 초기 확인 및 에러 메시지 설정
  useEffect(() => {
    console.log('useEffect [API_KEY 확인]: 실행됨.');
    if (!API_KEY) { 
      setError('오류: API 키가 설정되지 않았습니다. Vercel 환경 변수 (REACT_APP_LOSTARK_API_KEY)를 확인해주세요.');
      console.error('useEffect [API_KEY 확인]: API_KEY가 정의되지 않았거나 비어 있습니다!');
    } else {
      console.log('useEffect [API_KEY 확인]: API_KEY가 설정됨. 길이:', API_KEY.length);
      console.log('useEffect [API_KEY 확인]: API_KEY 시작:', API_KEY.substring(0, 5), '끝:', API_KEY.substring(API_KEY.length - 5));
    }
  }, []); 

  // Firestore에서 공격대 데이터 실시간 불러오기
  useEffect(() => {
    if (!db || !isAuthReady || !userId) {
      console.log('useEffect [Firestore 공격대 불러오기]: DB, 인증 또는 사용자 ID가 준비되지 않아 스킵.');
      return;
    }

    console.log('useEffect [Firestore 공격대 불러오기]: Firestore에서 공격대 데이터 불러오기 시작. User ID:', userId);
    
    // 공개 데이터 경로: /artifacts/{appId}/public/data/raids
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const raidsCollectionRef = collection(db, `artifacts/${appId}/public/data/raids`);
    
    // 생성 날짜 기준으로 정렬 (Firestore orderBy는 인덱스 필요, 여기서는 데이터 가져온 후 JS에서 정렬)
    const q = query(raidsCollectionRef); // orderBy 제거, JS에서 정렬

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRaids = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // JavaScript에서 dateTime 기준으로 정렬 (최신 생성된 공격대가 아래로)
      fetchedRaids.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

      setRaids(fetchedRaids);
      console.log('Firestore: 공격대 데이터 실시간 업데이트됨. 개수:', fetchedRaids.length);

      // 선택된 공격대가 삭제되었거나 없어진 경우 처리
      if (selectedRaid && !fetchedRaids.some(raid => raid.id === selectedRaid)) {
        setSelectedRaid(fetchedRaids.length > 0 ? fetchedRaids[0].id : null);
        setShowRaidDetails(false);
      } else if (!selectedRaid && fetchedRaids.length > 0) {
        // 선택된 공격대가 없고, 새 공격대가 추가된 경우 첫 번째 공격대 선택
        setSelectedRaid(fetchedRaids[0].id);
      }

    }, (err) => {
      console.error('Firestore: 공격대 데이터 불러오기 오류:', err);
      setError('공격대 데이터를 불러오는 데 실패했습니다.');
    });

    return () => {
      unsubscribe(); // 컴포넌트 언마운트 시 리스너 해제
      console.log('Firestore: 공격대 onSnapshot 리스너 해제됨.');
    };
  }, [db, isAuthReady, userId, selectedRaid]); // db, isAuthReady, userId가 변경될 때마다 재실행

  // 공격대 출발 일시 24시간 이후 자동 삭제 기능 (Firestore 데이터 기반)
  useEffect(() => {
    console.log('useEffect [만료된 공격대 확인 간격]: 간격 설정 중.');
    const checkExpiredRaids = async () => {
      if (!db || !isAuthReady || !userId) return;

      console.log('checkExpiredRaids: 만료된 공격대 확인 실행 중.');
      const now = new Date();
      
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const raidsCollectionRef = collection(db, `artifacts/${appId}/public/data/raids`);

      // Firestore에서 모든 공격대를 가져와서 만료 여부 확인
      // orderBy를 사용하지 않으므로 모든 문서를 가져와서 클라이언트에서 필터링
      const snapshot = await getDocs(raidsCollectionRef);
      const raidsToDelete = [];

      snapshot.forEach(doc => {
        const raid = doc.data();
        const raidDateTime = new Date(raid.dateTime);
        const twentyFourHoursAfterRaid = new Date(raidDateTime.getTime() + 24 * 60 * 60 * 1000); 
        if (now >= twentyFourHoursAfterRaid) {
          raidsToDelete.push(doc.id);
        }
      });

      if (raidsToDelete.length > 0) {
        console.log('checkExpiredRaids: 만료된 공격대를 찾았습니다. 삭제 중:', raidsToDelete);
        for (const raidId of raidsToDelete) {
          await deleteDoc(doc(db, `artifacts/${appId}/public/data/raids`, raidId));
        }
        console.log('checkExpiredRaids: 만료된 공격대 삭제 완료.');
      } else {
        console.log('checkExpiredRaids: 만료된 공격대를 찾을 수 없습니다.');
      }
    };

    const intervalId = setInterval(checkExpiredRaids, 60000); // 1분마다 실행
    return () => {
      console.log('useEffect [만료된 공격대 확인 간격]: 간격 정리 중.');
      clearInterval(intervalId);
    };
  }, [db, isAuthReady, userId]); // db, isAuthReady, userId가 변경될 때마다 재실행

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
      const requestUrl = `https://developer-lostark.game.onstove.com/characters/${encodeURIComponent(characterName)}/siblings`; 
      console.log('searchCharacter: URL에서 가져오기 시도 중:', requestUrl);
      console.log('searchCharacter: 인증 헤더 (일부):', `bearer ${API_KEY.substring(0,10)}...`);

      const response = await fetch(requestUrl, {
        headers: {
          'accept': 'application/json',
          'authorization': `bearer ${API_KEY}` 
        }
      });

      console.log('searchCharacter: API 응답 수신됨. 상태:', response.status);

      const responseBodyText = await response.text(); 
      console.log('searchCharacter: 원시 응답 텍스트 (일부):', responseBodyText.substring(0, 500));

      let data;
      try {
        data = JSON.parse(responseBodyText); 
        console.log('searchCharacter: JSON 데이터 성공적으로 파싱됨. 데이터 (일부):', JSON.stringify(data).substring(0, 200) + '...');
      } catch (jsonError) {
        console.error('searchCharacter: JSON 파싱 실패!', jsonError);
        setError(`데이터 파싱 오류: 서버가 유효한 JSON을 반환하지 않았습니다. 응답 내용: ${responseBodyText.substring(0, 100)}...`);
        return; 
      }

      if (!response.ok) { 
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
        if (responseBodyText.startsWith('<!doctype html>')) {
            errorMessage += ` (서버 응답: ${responseBodyText.substring(0, 100)}...)`;
        }
        throw new Error(errorMessage);
      }
      
      if (!data || data.length === 0) {
        setError('해당 캐릭터 또는 연관 캐릭터를 찾을 수 없습니다.');
        setCharacters([]);
        console.log('searchCharacter: 데이터에서 캐릭터를 찾을 수 없습니다.');
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
        console.log('searchCharacter: 캐릭터 성공적으로 처리 및 설정됨. 개수:', transformedCharacters.length);
      }
    } catch (err) {
      console.error('searchCharacter: 가져오기 또는 처리 중 오류 발생 (외부 catch):', err); 
      setError(err.message);
      setCharacters([]);
    } finally {
      setLoading(false);
      console.log('searchCharacter: 함수 종료.');
    }
  };

  // 공격대 생성 함수 (Firestore 연동)
  const createRaid = async () => {
    console.log('createRaid: 함수 호출됨.');
    if (!newRaidName || !newRaidDate || !newRraidTime) {
      setError('모든 정보를 입력해주세요.');
      console.warn('createRaid: 공격대 생성 정보가 누락되었습니다.');
      return;
    }
    if (!db || !userId) {
      setError('데이터베이스 연결 또는 사용자 인증이 준비되지 않았습니다.');
      console.error('createRaid: DB 또는 userId가 준비되지 않았습니다.');
      return;
    }

    const raidDateTimeStr = `${newRaidDate}T${newRraidTime}:00`; 
    const newDate = new Date(raidDateTimeStr);

    if (isNaN(newDate.getTime())) { 
        setError('유효하지 않은 날짜 또는 시간 형식입니다. 올바른 날짜와 시간을 선택해주세요.');
        console.error('createRaid: 유효하지 않은 날짜/시간 형식.');
        return;
    }
    
    const newRaidData = {
      name: newRaidName,
      dateTime: newDate.toISOString(), 
      party1: { dealers: [], support: null },
      party2: { dealers: [], support: null },
      creatorId: userId, // 생성자 ID 추가
      createdAt: new Date().toISOString() // 생성 시간 추가 (정렬용)
    };

    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const raidsCollectionRef = collection(db, `artifacts/${appId}/public/data/raids`);
      const docRef = await addDoc(raidsCollectionRef, newRaidData);
      console.log('createRaid: 공격대 Firestore에 추가됨. ID:', docRef.id);
      
      // Firestore onSnapshot이 raids 상태를 업데이트할 것이므로, 여기서는 UI 초기화만
      setNewRaidName('');
      setNewRaidDate('');
      setNewRaidTime('');
      setShowCreateModal(false);
      setError(''); 

      // 새로 생성된 공격대가 목록에 추가되면 onSnapshot에 의해 selectedRaid가 자동으로 설정될 수 있음
      // 하지만 명시적으로 설정하여 UI 흐름을 부드럽게 함
      setSelectedRaid(docRef.id);
      setShowRaidDetails(true); 

      setTimeout(() => {
          if (raidListRef.current) {
              raidListRef.current.scrollTop = raidListRef.current.scrollHeight;
              console.log('createRaid: 공격대 목록을 맨 아래로 스크롤함.');
          }
      }, 0);
    } catch (e) {
      console.error('createRaid: Firestore에 공격대 추가 실패:', e);
      setError('공격대 생성에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 공격대 삭제 함수 (Firestore 연동)
  const deleteRaid = async (raidId) => {
    console.log('deleteRaid: 함수 호출됨. ID:', raidId);
    if (!db || !userId) {
      setError('데이터베이스 연결 또는 사용자 인증이 준비되지 않았습니다.');
      console.error('deleteRaid: DB 또는 userId가 준비되지 않았습니다.');
      return;
    }

    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      await deleteDoc(doc(db, `artifacts/${appId}/public/data/raids`, raidId));
      console.log('deleteRaid: 공격대 Firestore에서 삭제됨. ID:', raidId);
      // onSnapshot이 raids 상태를 업데이트할 것이므로, 별도의 setRaids 호출 불필요
    } catch (e) {
      console.error('deleteRaid: Firestore에서 공격대 삭제 실패:', e);
      setError('공격대 삭제에 실패했습니다.');
    }
  };

  // 캐릭터를 선택하여 공격대 선택 모달 열기
  const handleSelectCharacterToAssign = (character) => {
    if (raids.length === 0) {
      setError('캐릭터를 할당할 공격대가 없습니다. 먼저 공격대를 만들어주세요.');
      return;
    }
    setCharacterToAssign(character);
    setShowRaidSelectionModal(true);
    console.log('handleSelectCharacterToAssign: 할당할 캐릭터 선택됨. 공격대 선택 모달 열기:', character.displayName);
  };

  // 공격대 선택 모달에서 공격대를 선택했을 때 호출되는 함수
  const handleRaidSelectedForAssignment = (raidId) => {
    setSelectedRaid(raidId); // 할당할 공격대를 selectedRaid로 설정
    setShowRaidSelectionModal(false); // 공격대 선택 모달 닫기
    setShowAssignModal(true); // 파티 할당 모달 열기
    setError(''); 
    console.log('handleRaidSelectedForAssignment: 할당할 공격대 선택됨:', raidId);
  };

  // 캐릭터를 파티에 할당 (Firestore 연동)
  const assignCharacterToParty = async (partyNum, slot) => {
    if (!characterToAssign || !selectedRaid || !db || !userId) {
      console.warn('assignCharacterToParty: 필수 데이터 누락 또는 DB/인증 미준비.');
      return;
    }

    console.log(`assignCharacterToParty: ${characterToAssign.displayName}를 ${partyNum}파티, ${slot} 슬롯에 할당 중`);

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const raidDocRef = doc(db, `artifacts/${appId}/public/data/raids`, selectedRaid);

    try {
      // 현재 공격대 문서 가져오기 (최신 상태 확인)
      const currentRaidDoc = raids.find(r => r.id === selectedRaid);
      if (!currentRaidDoc) {
        setError('선택된 공격대를 찾을 수 없습니다.');
        return;
      }

      const updatedRaid = { ...currentRaidDoc };
      
      // --- 새롭게 추가된 로직: 동일 캐릭터 계정(패밀리) 중복 체크 ---
      // 할당하려는 캐릭터의 메인 캐릭터 이름(또는 본인 이름) 추출
      const assignedCharMainName = characterToAssign.displayName.includes('(')
        ? characterToAssign.displayName.split('(')[1].replace(')', '')
        : characterToAssign.CharacterName;

      let isFamilyAlreadyInRaid = false;
      // 파티 1 딜러 체크
      for (const dealer of updatedRaid.party1.dealers) {
        const existingCharMainName = dealer.displayName.includes('(')
          ? dealer.displayName.split('(')[1].replace(')', '')
          : dealer.CharacterName;
        if (existingCharMainName === assignedCharMainName) {
          isFamilyAlreadyInRaid = true;
          break;
        }
      }
      // 파티 1 서포터 체크
      if (!isFamilyAlreadyInRaid && updatedRaid.party1.support) {
        const existingCharMainName = updatedRaid.party1.support.displayName.includes('(')
          ? updatedRaid.party1.support.displayName.split('(')[1].replace(')', '')
          : updatedRaid.party1.support.CharacterName;
        if (existingCharMainName === assignedCharMainName) {
          isFamilyAlreadyInRaid = true;
        }
      }
      // 파티 2 딜러 체크
      if (!isFamilyAlreadyInRaid) {
        for (const dealer of updatedRaid.party2.dealers) {
          const existingCharMainName = dealer.displayName.includes('(')
            ? dealer.displayName.split('(')[1].replace(')', '')
            : dealer.CharacterName;
          if (existingCharMainName === assignedCharMainName) {
            isFamilyAlreadyInRaid = true;
            break;
          }
        }
      }
      // 파티 2 서포터 체크
      if (!isFamilyAlreadyInRaid && updatedRaid.party2.support) {
        const existingCharMainName = updatedRaid.party2.support.displayName.includes('(')
          ? updatedRaid.party2.support.displayName.split('(')[1].replace(')', '')
          : updatedRaid.party2.support.CharacterName;
        if (existingCharMainName === assignedCharMainName) {
          isFamilyAlreadyInRaid = true;
        }
      }

      if (isFamilyAlreadyInRaid) {
        setError(`'${assignedCharMainName}' 계정의 캐릭터는 이미 이 공격대에 할당되어 있습니다.`);
        console.warn('assignCharacterToParty: 동일 계정 캐릭터 중복 할당 시도.');
        setCharacterToAssign(null); // 모달 닫기 전에 캐릭터 할당 해제
        setShowAssignModal(false);
        return; // 할당 중단
      }
      // --- 중복 체크 끝 ---
      
      // 이미 배치된 캐릭터인지 확인하고 기존 위치에서 제거 (이전 로직 그대로 유지)
      ['party1', 'party2'].forEach(partyKey => {
        if (updatedRaid[partyKey].support?.CharacterName === characterToAssign.CharacterName) {
          updatedRaid[partyKey].support = null;
        }
        updatedRaid[partyKey].dealers = updatedRaid[partyKey].dealers.filter(
          d => d.CharacterName !== characterToAssign.CharacterName
        );
      });

      // 새 위치에 캐릭터 배치 (이전 로직 그대로 유지)
      if (slot === 'support') {
        if (updatedRaid[`party${partyNum}`].support !== null) {
          setError('서포터 슬롯이 이미 채워져 있습니다. 기존 캐릭터를 먼저 제거해주세요.');
          return;
        }
        updatedRaid[`party${partyNum}`].support = characterToAssign;
      } else { // 딜러 슬롯
        if (updatedRaid[`party${partyNum}`].dealers.length >= 3) {
          setError('딜러 슬롯이 꽉 찼습니다. 기존 캐릭터를 먼저 제거해주세요.');
          return;
        }
        updatedRaid[`party${partyNum}`].dealers.push(characterToAssign);
      }
      setError(''); 

      // Firestore 문서 업데이트
      await updateDoc(raidDocRef, {
        party1: updatedRaid.party1,
        party2: updatedRaid.party2
      });
      console.log('assignCharacterToParty: Firestore 문서 업데이트 완료.');

      setCharacterToAssign(null); 
      setShowAssignModal(false); 
    } catch (e) {
      console.error('assignCharacterToParty: Firestore 문서 업데이트 실패:', e);
      setError('캐릭터 할당에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 캐릭터 제거 (슬롯에서) (Firestore 연동)
  const removeCharacter = async (partyNum, slot, index = null) => {
    console.log('removeCharacter: 호출됨. 파티:', partyNum, '슬롯:', slot, '인덱스:', index);
    if (!selectedRaid || !db || !userId) {
      console.warn('removeCharacter: 필수 데이터 누락 또는 DB/인증 미준비.');
      return;
    }

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const raidDocRef = doc(db, `artifacts/${appId}/public/data/raids`, selectedRaid);

    try {
      // 현재 공격대 문서 가져오기 (최신 상태 확인)
      const currentRaidDoc = raids.find(r => r.id === selectedRaid);
      if (!currentRaidDoc) {
        setError('선택된 공격대를 찾을 수 없습니다.');
        return;
      }

      const updatedRaid = { ...currentRaidDoc };
      if (slot === 'support') {
        updatedRaid[`party${partyNum}`].support = null;
      } else { 
        updatedRaid[`party${partyNum}`].dealers.splice(index, 1);
      }

      // Firestore 문서 업데이트
      await updateDoc(raidDocRef, {
        party1: updatedRaid.party1,
        party2: updatedRaid.party2
      });
      console.log('removeCharacter: Firestore 문서 업데이트 완료.');
    } catch (e) {
      console.error('removeCharacter: Firestore에서 캐릭터 제거 실패:', e);
      setError('캐릭터 제거에 실패했습니다.');
    }
  };

  // 현재 선택된 공격대 정보 가져오기
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

  // 공격대 생성 모달 오픈 시 현재 날짜/시간으로 초기값 설정
  useEffect(() => {
    if (showCreateModal && !newRaidDate && !newRraidTime) {
      console.log('useEffect [모달 초기화]: 초기 모달 날짜/시간 설정 중.');
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
    <div className="min-h-screen bg-gray-900 text-white p-4 overflow-x-auto font-inter">
      {console.log('RaidManager: JSX 출력 렌더링 중.')} 
      <div className="min-w-full md:min-w-[1024px] max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">어바웃 공격대 관리</h1>
        
        {/* 사용자 ID 표시 (멀티유저 앱 필수) */}
        {userId && (
          <div className="text-center text-gray-400 text-sm mb-4">
            현재 사용자 ID: <span className="font-mono text-blue-300">{userId}</span>
          </div>
        )}

        {/* 에러 메시지 표시 */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-md flex items-center max-w-full md:max-w-2xl mx-auto text-sm">
            <AlertCircle className="mr-2 flex-shrink-0" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Firebase 인증 준비 중 로딩 스피너 */}
        {!isAuthReady && (
          <div className="flex justify-center items-center h-48">
            <Loader className="animate-spin text-blue-500" size={32} />
            <span className="ml-2 text-lg">데이터 로딩 중...</span>
          </div>
        )}

        {isAuthReady && ( // Firebase 인증 준비 완료 후 앱 콘텐츠 렌더링
          <div className="flex flex-col md:flex-row gap-6">
            {/* 좌측: 캐릭터 조회 섹션 */}
            <div className="w-full md:w-1/2 bg-gray-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Search className="mr-2" size={20} />
                캐릭터 조회
              </h2>
              
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchCharacter()}
                  placeholder="캐릭터명 입력"
                  className="flex-1 px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-base placeholder-gray-400" 
                />
                <button
                  onClick={searchCharacter}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed text-base font-medium" 
                >
                  {loading ? '조회중...' : '조회'}
                </button>
              </div>

              {/* 캐릭터 목록 */}
              <div className="space-y-2 max-h-[400px] sm:max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
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
                              setSelectedRaid(raid.id);
                              setShowRaidDetails(true);
                          }}
                          className={`p-3 rounded-md transition-colors cursor-pointer flex items-center justify-between shadow-sm ${
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
                        onClick={() => setShowRaidDetails(false)}
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
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
        )}

        {/* 공격대 생성 모달 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
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

        {/* 공격대 선택 모달 */}
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

        {/* 캐릭터 할당 모달 */}
        {showAssignModal && characterToAssign && currentRaid && (
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
                    <div className="flex flex-col sm:flex-row gap-2">
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
