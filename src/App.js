import React, { useState, useEffect, useRef } from 'react';
import { Clock, Users, Search, AlertCircle, Trash2, Plus, Calendar, ArrowLeft, UserPlus, Loader, Pencil, ShieldCheck } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, getDocs } from 'firebase/firestore';

// Vercel 환경 변수에서 값들을 직접 가져옵니다.
const LOST_ARK_API_KEY = process.env.REACT_APP_LOSTARK_API_KEY; 

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const ADMIN_PASSWORD = '221215';

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
  const [newRaidTime, setNewRaidTime] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [characterToAssign, setCharacterToAssign] = useState(null);
  const [showRaidSelectionModal, setShowRaidSelectionModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRaidDetails, setShowRaidDetails] = useState(false);

  // 삭제 및 수정 모달 상태 추가
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [raidToDelete, setRaidToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [raidToEdit, setRaidToEdit] = useState(null);
  const [editedRaidName, setEditedRaidName] = useState('');
  const [editedRaidDate, setEditedRaidDate] = useState('');
  const [editedRaidTime, setEditedRaidTime] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');


  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const raidListRef = useRef(null); 

  useEffect(() => {
    // 환경 변수에서 Firebase 설정 값들이 모두 있는지 확인합니다.
    const isFirebaseConfigValid = Object.values(firebaseConfig).every(value => value);
    
    if (!isFirebaseConfigValid) {
        // 내부 미리보기 환경을 위한 대체 로직 (Vercel 배포 시에는 무시됨)
        const internalConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
        try {
            const internalConfig = JSON.parse(internalConfigStr);
            if (Object.values(internalConfig).every(v => v)) {
                initializeApp(internalConfig);
            } else {
                throw new Error("Internal config is also invalid.");
            }
        } catch (e) {
            console.error('Firebase config is missing from environment variables.');
            setError('Firebase 설정이 누락되었습니다. Vercel 환경 변수를 확인해주세요.');
            return;
        }
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
        } else {
          try {
            const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
            if (initialAuthToken) {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
            } else {
              await signInAnonymously(firebaseAuth);
            }
          } catch (authError) {
            console.error('Firebase: Auth failed:', authError);
            setError('Firebase 인증에 실패했습니다.');
          }
        }
        if (!isAuthReady) {
            setIsAuthReady(true);
        }
      });

      return () => unsubscribe();
    } catch (initError) {
      console.error('Firebase initialization failed:', initError);
      setError('Firebase 초기화 중 오류가 발생했습니다.');
    }
  }, []);

  useEffect(() => {
    if (!LOST_ARK_API_KEY) { 
      setError('오류: 로스트아크 API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
    }
  }, []);

  useEffect(() => {
    if (!db || !isAuthReady || !userId) return;
    
    const appId = firebaseConfig.appId || 'default-app-id';
    const raidsCollectionRef = collection(db, `artifacts/${appId}/public/data/raids`);
    const q = query(raidsCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRaids = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedRaids.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
      setRaids(fetchedRaids);

      if (selectedRaid && !fetchedRaids.some(raid => raid.id === selectedRaid)) {
        setSelectedRaid(fetchedRaids.length > 0 ? fetchedRaids[0].id : null);
        setShowRaidDetails(false);
      } else if (!selectedRaid && fetchedRaids.length > 0) {
        setSelectedRaid(fetchedRaids[0].id);
      }
    }, (err) => {
      console.error('Firestore: Error fetching raid data:', err);
      setError('공격대 데이터를 불러오는 데 실패했습니다.');
    });

    return () => unsubscribe();
  }, [db, isAuthReady, userId]);

  useEffect(() => {
    const checkExpiredRaids = async () => {
      if (!db || !isAuthReady || !userId) return;

      const now = new Date();
      const appId = firebaseConfig.appId || 'default-app-id';
      const raidsCollectionRef = collection(db, `artifacts/${appId}/public/data/raids`);
      
      try {
        const snapshot = await getDocs(raidsCollectionRef);
        const raidsToDelete = [];
        snapshot.forEach(doc => {
          const raid = doc.data();
          if(raid.dateTime) {
            const raidDateTime = new Date(raid.dateTime);
            const twentyFourHoursAfterRaid = new Date(raidDateTime.getTime() + 24 * 60 * 60 * 1000); 
            if (now >= twentyFourHoursAfterRaid) raidsToDelete.push(doc.id);
          }
        });

        if (raidsToDelete.length > 0) {
          const deletePromises = raidsToDelete.map(raidId => 
            deleteDoc(doc(db, `artifacts/${appId}/public/data/raids`, raidId))
          );
          await Promise.all(deletePromises);
        }
      } catch (err) {
        console.error("Error checking for expired raids:", err);
      }
    };

    const intervalId = setInterval(checkExpiredRaids, 60 * 60 * 1000);
    checkExpiredRaids();
    return () => clearInterval(intervalId);
  }, [db, isAuthReady, userId]);

  const searchCharacter = async () => {
    if (!LOST_ARK_API_KEY) { 
      setError('오류: 로스트아크 API 키가 설정되지 않았습니다.');
      return;
    }
    if (!characterName) {
      setError('캐릭터명을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const requestUrl = `https://developer-lostark.game.onstove.com/characters/${encodeURIComponent(characterName)}/siblings`; 
      const response = await fetch(requestUrl, {
        headers: {
          'accept': 'application/json',
          'authorization': `bearer ${LOST_ARK_API_KEY}` 
        }
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || `API 오류: ${response.status}`);
      
      if (!data || data.length === 0) {
        setError('해당 캐릭터 또는 연관 캐릭터를 찾을 수 없습니다.');
        setCharacters([]);
      } else {
        const parsedData = data.map(char => ({
          ...char,
          parsedIlvl: parseFloat(char.ItemAvgLevel.replace(/,/g, ''))
        }));
        const highestIlvlChar = parsedData.reduce((prev, current) => (prev.parsedIlvl > current.parsedIlvl) ? prev : current);
        
        const isSpecialAccount = highestIlvlChar.CharacterName === '호크준듀';

        const transformedCharacters = parsedData.map(char => ({
            ...char, 
            displayName: char.CharacterName === highestIlvlChar.CharacterName 
              ? char.CharacterName 
              : `${char.CharacterName} (${highestIlvlChar.CharacterName})`,
            isSpecial: isSpecialAccount,
        }));
        transformedCharacters.sort((a, b) => b.parsedIlvl - a.parsedIlvl); 
        setCharacters(transformedCharacters);
        setError(''); 
      }
    } catch (err) {
      console.error('Character search failed:', err); 
      setError(`검색 실패: ${err.message}`);
      setCharacters([]);
    } finally {
      setLoading(false);
    }
  };

  const createRaid = async () => {
    if (isCreating) return;

    if (!newRaidName || !newRaidDate || !newRaidTime) {
      setError('모든 정보를 입력해주세요.');
      return;
    }
    if (!db || !userId) {
      setError('데이터베이스 연결이 준비되지 않았습니다.');
      return;
    }

    setIsCreating(true);
    setError('');

    const raidDateTimeStr = `${newRaidDate}T${newRaidTime}:00`;
    const newDate = new Date(raidDateTimeStr);

    if (isNaN(newDate.getTime())) { 
        setError('유효하지 않은 날짜 또는 시간 형식입니다.');
        setIsCreating(false);
        return;
    }
    
    const newRaidData = {
      name: newRaidName,
      dateTime: newDate.toISOString(), 
      party1: { dealers: [], support: null },
      party2: { dealers: [], support: null },
      creatorId: userId,
      createdAt: new Date().toISOString()
    };

    try {
      const appId = firebaseConfig.appId || 'default-app-id';
      const raidsCollectionRef = collection(db, `artifacts/${appId}/public/data/raids`);
      const docRef = await addDoc(raidsCollectionRef, newRaidData);
      
      setNewRaidName('');
      setNewRaidDate('');
      setNewRaidTime('');
      setShowCreateModal(false); 
      setSelectedRaid(docRef.id);
      setShowRaidDetails(true); 

      setTimeout(() => {
          if (raidListRef.current) {
              raidListRef.current.scrollTop = raidListRef.current.scrollHeight;
          }
      }, 0);
    } catch (e) {
      console.error('Failed to create raid:', e);
      setError('공격대 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClick = (raid) => {
    if (!raid) return;
    setRaidToDelete(raid);
    if (userId === raid.creatorId) {
      setShowDeleteConfirm(true);
    } else {
      setShowAdminPasswordModal(true);
    }
  };

  const confirmDeleteRaid = async () => {
    if (!db || !raidToDelete) return;
    try {
      const appId = firebaseConfig.appId || 'default-app-id';
      await deleteDoc(doc(db, `artifacts/${appId}/public/data/raids`, raidToDelete.id));
    } catch (e) {
      console.error('Failed to delete raid:', e);
      setError('공격대 삭제에 실패했습니다.');
    } finally {
      setShowDeleteConfirm(false);
      setShowAdminPasswordModal(false);
      setRaidToDelete(null);
      setAdminPasswordInput('');
    }
  };

  const handleAdminDelete = () => {
    if (adminPasswordInput === ADMIN_PASSWORD) {
      confirmDeleteRaid();
    } else {
      setError('관리자 비밀번호가 올바르지 않습니다.');
      setAdminPasswordInput('');
    }
  };
  
  const handleEditClick = (raid) => {
    if (!raid) return;
    setRaidToEdit(raid);
    setEditedRaidName(raid.name);
    const raidDate = new Date(raid.dateTime);
    const offset = raidDate.getTimezoneOffset() * 60000;
    const localDate = new Date(raidDate.getTime() - offset);
    const [date, time] = localDate.toISOString().split('T');
    setEditedRaidDate(date);
    setEditedRaidTime(time.substring(0, 5));
    setShowEditModal(true);
  };

  const handleUpdateRaid = async () => {
    if (!raidToEdit || isUpdating) return;

    if (!editedRaidName || !editedRaidDate || !editedRaidTime) {
      setError('모든 정보를 입력해주세요.');
      return;
    }

    setIsUpdating(true);
    setError('');

    const raidDateTimeStr = `${editedRaidDate}T${editedRaidTime}:00`;
    const newDate = new Date(raidDateTimeStr);

    if (isNaN(newDate.getTime())) {
      setError('유효하지 않은 날짜 또는 시간 형식입니다.');
      setIsUpdating(false);
      return;
    }

    const appId = firebaseConfig.appId || 'default-app-id';
    const raidDocRef = doc(db, `artifacts/${appId}/public/data/raids`, raidToEdit.id);

    try {
      await updateDoc(raidDocRef, {
        name: editedRaidName,
        dateTime: newDate.toISOString(),
      });
      setShowEditModal(false);
      setRaidToEdit(null);
    } catch (e) {
      console.error('Failed to update raid:', e);
      setError('공격대 정보 업데이트에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectCharacterToAssign = (character) => {
    if (raids.length === 0) {
      setError('할당할 공격대가 없습니다. 먼저 공격대를 만들어주세요.');
      return;
    }
    setCharacterToAssign(character);
    setShowRaidSelectionModal(true);
  };

  const handleRaidSelectedForAssignment = (raidId) => {
    setSelectedRaid(raidId);
    setShowRaidSelectionModal(false);
    setShowAssignModal(true);
    setError(''); 
  };

  const assignCharacterToParty = async (partyNum, slot) => {
    if (!characterToAssign || !selectedRaid || !db) return;

    const appId = firebaseConfig.appId || 'default-app-id';
    const raidDocRef = doc(db, `artifacts/${appId}/public/data/raids`, selectedRaid);
    
    const currentRaidDoc = raids.find(r => r.id === selectedRaid);
    if (!currentRaidDoc) {
      setError('선택된 공격대를 찾을 수 없습니다.');
      return;
    }

    const updatedRaid = JSON.parse(JSON.stringify(currentRaidDoc));
    const getCharMainName = (char) => char.displayName.includes('(') ? char.displayName.split('(')[1].replace(')', '') : char.CharacterName;
    const assignedCharMainName = getCharMainName(characterToAssign);
    const isFamilyAlreadyInRaid = Object.values(updatedRaid.party1).flat().concat(Object.values(updatedRaid.party2).flat())
      .filter(Boolean)
      .some(member => getCharMainName(member) === assignedCharMainName);

    if (isFamilyAlreadyInRaid) {
      setError(`'${assignedCharMainName}' 계정의 캐릭터는 이미 이 공격대에 할당되어 있습니다.`);
      setShowAssignModal(false);
      setCharacterToAssign(null);
      return;
    }
      
    ['party1', 'party2'].forEach(partyKey => {
      if (updatedRaid[partyKey].support?.CharacterName === characterToAssign.CharacterName) {
        updatedRaid[partyKey].support = null;
      }
      updatedRaid[partyKey].dealers = updatedRaid[partyKey].dealers.filter(d => d.CharacterName !== characterToAssign.CharacterName);
    });

    const targetParty = updatedRaid[`party${partyNum}`];
    if (slot === 'support') {
      if (targetParty.support) {
        setError('서포터 슬롯이 이미 채워져 있습니다.');
        return;
      }
      targetParty.support = characterToAssign;
    } else {
      if (targetParty.dealers.length >= 3) {
        setError('딜러 슬롯이 꽉 찼습니다.');
        return;
      }
      targetParty.dealers.push(characterToAssign);
    }
    setError(''); 

    try {
      await updateDoc(raidDocRef, { party1: updatedRaid.party1, party2: updatedRaid.party2 });
      setCharacterToAssign(null); 
      setShowAssignModal(false); 
    } catch (e) {
      console.error('Failed to assign character:', e);
      setError('캐릭터 할당에 실패했습니다.');
    }
  };

  const removeCharacter = async (partyNum, slot, index = null) => {
    if (!selectedRaid || !db) return;

    const appId = firebaseConfig.appId || 'default-app-id';
    const raidDocRef = doc(db, `artifacts/${appId}/public/data/raids`, selectedRaid);
    
    const currentRaidDoc = raids.find(r => r.id === selectedRaid);
    if (!currentRaidDoc) {
      setError('선택된 공격대를 찾을 수 없습니다.');
      return;
    }
    
    const updatedRaid = JSON.parse(JSON.stringify(currentRaidDoc));
    const targetParty = updatedRaid[`party${partyNum}`];

    if (slot === 'support') {
      targetParty.support = null;
    } else if (index !== null) {
      targetParty.dealers.splice(index, 1);
    }

    try {
      await updateDoc(raidDocRef, { party1: updatedRaid.party1, party2: updatedRaid.party2 });
    } catch (e) {
      console.error('Failed to remove character:', e);
      setError('캐릭터 제거에 실패했습니다.');
    }
  };

  const currentRaid = raids.find(raid => raid.id === selectedRaid);

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  useEffect(() => {
    if (showCreateModal) {
      const today = new Date();
      const offset = today.getTimezoneOffset() * 60000;
      const localDate = new Date(today.getTime() - offset);
      const [date, time] = localDate.toISOString().split('T');
      setNewRaidDate(date);
      setNewRaidTime(time.substring(0, 5));
    }
  }, [showCreateModal]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-100">about 공격대 관리</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/60 border border-red-600 rounded-md flex items-center max-w-2xl mx-auto text-sm shadow-lg">
            <AlertCircle className="mr-2 flex-shrink-0" size={16} />
            <span>{error}</span>
          </div>
        )}

        {!isAuthReady && (
          <div className="flex justify-center items-center h-64">
            <Loader className="animate-spin text-blue-500" size={40} />
            <span className="ml-3 text-lg text-gray-300">데이터베이스 연결 중...</span>
          </div>
        )}

        {isAuthReady && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-1/3 bg-gray-800 p-5 rounded-xl shadow-2xl">
              <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-200">
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
                  className="flex-1 px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 border border-gray-600" 
                />
                <button
                  onClick={searchCharacter}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed font-medium shadow-md" 
                >
                  {loading ? <Loader className="animate-spin" size={20}/> : '조회'}
                </button>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {characters.length === 0 && !loading && (
                  <div className="text-center text-gray-500 py-12">
                    캐릭터를 검색해주세요.
                  </div>
                )}
                {characters.map((char, index) => (
                  <div
                    key={`${char.CharacterName}-${index}`} 
                    className="p-3 bg-gray-700/80 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-between shadow-sm border border-gray-700"
                  >
                    <div>
                      <div className="font-semibold flex items-center">
                        {char.displayName}
                        {char.isSpecial && <span className="ml-2" title="자칭 귀염둥이">🎀</span>}
                      </div> 
                      <div className="text-sm text-gray-300">
                        Lv.{char.CharacterLevel} {char.CharacterClassName}
                      </div>
                      <div className="text-xs text-gray-400">
                        IL: {char.ItemAvgLevel}
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectCharacterToAssign(char)}
                      className="ml-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-sm flex items-center font-medium transition-colors shadow"
                    >
                      <UserPlus size={16} className="mr-1" />
                      추가
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full lg:w-2/3 bg-gray-800 p-5 rounded-xl shadow-2xl"> 
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center text-gray-200">
                  <Users className="mr-2" size={20} />
                  공격대
                </h2>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors flex items-center text-sm font-medium shadow-md"
                >
                  <Plus className="mr-1" size={16} />
                  공격대 만들기
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div ref={raidListRef} className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {raids.length === 0 && (
                    <div className="text-center text-gray-500 py-12">
                      공격대를 생성해주세요.
                    </div>
                  )}
                  {raids.map(raid => {
                    const totalMembers = 
                      raid.party1.dealers.length + (raid.party1.support ? 1 : 0) +
                      raid.party2.dealers.length + (raid.party2.support ? 1 : 0);
                    const isFull = totalMembers === 8;
                    const indicatorColor = isFull ? 'bg-green-500' : 'bg-yellow-500';

                    return (
                      <div
                        key={raid.id}
                        onClick={() => setSelectedRaid(raid.id)}
                        className={`p-3 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-between shadow-md border-2 ${
                          selectedRaid === raid.id
                            ? 'bg-blue-900/50 border-blue-500'
                            : 'bg-gray-700/80 border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center overflow-hidden mr-2">
                          <div className={`w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0 ${indicatorColor}`}></div>
                          <div className="truncate">
                            <div className="font-semibold truncate">{raid.name}</div>
                            <div className="text-sm text-gray-300 flex items-center">
                              <Clock className="mr-1.5" size={14} />
                              {formatDateTime(raid.dateTime)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-mono text-gray-400">{totalMembers}/8</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(raid); }}
                            className="text-gray-400 hover:text-red-400 p-1.5 rounded-full bg-gray-800/50 hover:bg-gray-700 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                  {!currentRaid && (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      공격대를 선택하여 파티 구성을 확인하세요.
                    </div>
                  )}
                  {currentRaid && (
                    <>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg text-gray-200 truncate pr-2">{currentRaid.name}</h3>
                        {userId === currentRaid.creatorId && (
                          <button
                            onClick={() => handleEditClick(currentRaid)}
                            className="p-1.5 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors flex-shrink-0"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 mb-4">
                        출발: {formatDateTime(currentRaid.dateTime)}
                      </div>
                      <div className="space-y-4">
                        {[1, 2].map(partyNum => (
                          <div key={partyNum} className="bg-gray-800/70 p-3 rounded-md shadow-inner">
                            <h3 className="font-semibold mb-2 text-indigo-300">{partyNum}파티</h3>
                            <div className="space-y-2">
                              <div className="p-2 bg-gray-700/50 rounded border border-dashed border-gray-600 min-h-[56px] relative flex items-center text-center">
                                {currentRaid[`party${partyNum}`].support ? (
                                  <>
                                    <div className="w-full">
                                      <div className="text-sm font-semibold text-green-300 flex items-center justify-center">
                                        <span>{currentRaid[`party${partyNum}`].support.displayName}</span>
                                        {currentRaid[`party${partyNum}`].support.isSpecial && <span className="ml-1.5" title="자칭 귀염둥이">🎀</span>}
                                      </div>
                                      <div className="text-xs text-gray-400">{currentRaid[`party${partyNum}`].support.CharacterClassName} | IL {currentRaid[`party${partyNum}`].support.ItemAvgLevel}</div>
                                    </div>
                                    <button onClick={() => removeCharacter(partyNum, 'support')} className="absolute top-1 right-1 text-red-400 hover:text-red-300 p-0.5 rounded-full bg-gray-800/50">
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                ) : ( <div className="w-full text-xs text-gray-500">서포터 슬롯</div> )}
                              </div>
                              {[0, 1, 2].map(index => {
                                const dealer = currentRaid[`party${partyNum}`].dealers[index];
                                return (
                                  <div key={index} className="p-2 bg-gray-700/50 rounded border border-dashed border-gray-600 min-h-[56px] relative flex items-center text-center">
                                    {dealer ? (
                                      <>
                                        <div className="w-full">
                                          <div className="text-sm font-semibold text-red-300 flex items-center justify-center">
                                            <span>{dealer.displayName}</span>
                                            {dealer.isSpecial && <span className="ml-1.5" title="자칭 귀염둥이">🎀</span>}
                                          </div>
                                          <div className="text-xs text-gray-400">{dealer.CharacterClassName} | IL {dealer.ItemAvgLevel}</div>
                                        </div>
                                        <button onClick={() => removeCharacter(partyNum, 'dealer', index)} className="absolute top-1 right-1 text-red-400 hover:text-red-300 p-0.5 rounded-full bg-gray-800/50">
                                          <Trash2 size={12} />
                                        </button>
                                      </>
                                    ) : ( <div className="w-full text-xs text-gray-500">딜러 슬롯</div> )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-2xl transform scale-100 animate-scale-in border border-gray-700">
              <h3 className="text-xl font-semibold mb-5 flex items-center"><Calendar className="mr-2" />새 공격대 만들기</h3>
              <div className="space-y-4">
                <input type="text" value={newRaidName} onChange={(e) => setNewRaidName(e.target.value)} placeholder="공격대 이름 (예: 1막 하드)" className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 border border-gray-600" />
                <input type="date" value={newRaidDate} onChange={(e) => setNewRaidDate(e.target.value)} className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-300 border border-gray-600" />
                <input type="time" value={newRaidTime} onChange={(e) => setNewRaidTime(e.target.value)} className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-300 border border-gray-600" />
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={createRaid} disabled={isCreating} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors font-medium shadow-md disabled:bg-gray-500 disabled:cursor-wait">
                  {isCreating ? '생성 중...' : '만들기'}
                </button>
                <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium shadow-md">취소</button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && raidToEdit && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-2xl transform scale-100 animate-scale-in border border-gray-700">
              <h3 className="text-xl font-semibold mb-5 flex items-center"><Pencil className="mr-2" />공격대 정보 수정</h3>
              <div className="space-y-4">
                <input type="text" value={editedRaidName} onChange={(e) => setEditedRaidName(e.target.value)} placeholder="공격대 이름" className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 border border-gray-600" />
                <input type="date" value={editedRaidDate} onChange={(e) => setEditedRaidDate(e.target.value)} className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-300 border border-gray-600" />
                <input type="time" value={editedRaidTime} onChange={(e) => setEditedRaidTime(e.target.value)} className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-300 border border-gray-600" />
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={handleUpdateRaid} disabled={isUpdating} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors font-medium shadow-md disabled:bg-gray-500 disabled:cursor-wait">
                  {isUpdating ? '저장 중...' : '저장'}
                </button>
                <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium shadow-md">취소</button>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm shadow-2xl transform scale-100 animate-scale-in border border-gray-700">
              <h3 className="text-lg font-semibold mb-2">공격대 삭제</h3>
              <p className="text-gray-300 mb-6">정말로 이 공격대를 삭제하시겠습니까?<br/>이 작업은 되돌릴 수 없습니다.</p>
              <div className="flex gap-3">
                <button onClick={confirmDeleteRaid} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors font-medium shadow-md">삭제</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium shadow-md">취소</button>
              </div>
            </div>
          </div>
        )}

        {showAdminPasswordModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm shadow-2xl transform scale-100 animate-scale-in border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center"><ShieldCheck className="mr-2"/>관리자 확인</h3>
              <p className="text-gray-300 mb-4">삭제하려면 관리자 비밀번호를 입력하세요.</p>
              <input 
                type="password"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdminDelete()}
                className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 border border-gray-600"
                placeholder="비밀번호 입력"
              />
              <div className="mt-6 flex gap-3">
                <button onClick={handleAdminDelete} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors font-medium shadow-md">확인</button>
                <button onClick={() => { setShowAdminPasswordModal(false); setAdminPasswordInput(''); setError(''); }} className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium shadow-md">취소</button>
              </div>
            </div>
          </div>
        )}

        {showRaidSelectionModal && characterToAssign && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-2xl transform scale-100 animate-scale-in border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">
                <span className="text-blue-300 font-bold">'{characterToAssign.displayName}'</span>을(를) 할당할 공격대 선택
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {raids.map(raid => (
                  <button key={raid.id} onClick={() => handleRaidSelectedForAssignment(raid.id)} className="w-full text-left p-3 bg-gray-700 hover:bg-blue-800/60 rounded-md transition-colors shadow-sm border border-gray-600">
                    <div className="font-semibold">{raid.name}</div>
                    <div className="text-sm text-gray-300">{formatDateTime(raid.dateTime)}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowRaidSelectionModal(false)} className="mt-6 w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium shadow-md">취소</button>
            </div>
          </div>
        )}

        {showAssignModal && characterToAssign && currentRaid && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-2xl transform scale-100 animate-scale-in border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-center">
                <span className="text-blue-300 font-bold">'{characterToAssign.displayName}'</span> 할당
              </h3>
              <div className="space-y-4">
                {[1, 2].map(partyNum => (
                  <div key={partyNum} className="bg-gray-700/80 p-3 rounded-md shadow-inner">
                    <h4 className="font-medium mb-2 text-center text-indigo-300">{partyNum}파티</h4>
                    <div className="flex gap-2">
                      <button onClick={() => assignCharacterToParty(partyNum, 'dealer')} className="flex-1 px-3 py-2 bg-red-600/80 hover:bg-red-700/80 rounded-md text-sm font-medium shadow-sm disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors" disabled={currentRaid[`party${partyNum}`].dealers.length >= 3}>
                        딜러 ({currentRaid[`party${partyNum}`].dealers.length}/3)
                      </button>
                      <button onClick={() => assignCharacterToParty(partyNum, 'support')} className="flex-1 px-3 py-2 bg-green-600/80 hover:bg-green-700/80 rounded-md text-sm font-medium shadow-sm disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors" disabled={!!currentRaid[`party${partyNum}`].support}>
                        서포터 ({currentRaid[`party${partyNum}`].support ? '1/1' : '0/1'})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowAssignModal(false)} className="mt-6 w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium shadow-md">취소</button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scale-in { animation: scaleIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(0.8);
        }
      `}</style>
    </div>
  )
}