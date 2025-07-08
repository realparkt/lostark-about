import React, { useState, useEffect, useRef } from 'react';
import { db, auth, appId } from './firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, getDocs } from 'firebase/firestore';

import CharacterSearch from './components/CharacterSearch';
import RaidList from './components/RaidList';
import RaidDetails from './components/RaidDetails';
// Modal imports...
import CreateRaidModal from './components/modals/CreateRaidModal';
import EditRaidModal from './components/modals/EditRaidModal';
import DeleteModal from './components/modals/DeleteModal';
import AdminPasswordModal from './components/modals/AdminPasswordModal';
import CannotDeleteModal from './components/modals/CannotDeleteModal';
import AssignModal from './components/modals/AssignModal';
import RaidSelectionModal from './components/modals/RaidSelectionModal';


import { Users, Plus, Loader, AlertCircle } from 'lucide-react';

const LOST_ARK_API_KEY = process.env.REACT_APP_LOSTARK_API_KEY;
const ADMIN_PASSWORD_APP = '221215';

export default function App() {
  const [characters, setCharacters] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [raids, setRaids] = useState([]);
  const [selectedRaidId, setSelectedRaidId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingRaid, setIsCreatingRaid] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdatingRaid, setIsUpdatingRaid] = useState(false);
  const [raidToEdit, setRaidToEdit] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showCannotDeleteModal, setShowCannotDeleteModal] = useState(false);
  const [characterToAssign, setCharacterToAssign] = useState(null);
  const [showRaidSelectionModal, setShowRaidSelectionModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const raidListRef = useRef(null);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        try { await signInAnonymously(auth); } 
        catch (err) { setError('Firebase 인증에 실패했습니다.'); }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (!isAuthReady || !db) return;
    const raidsCollectionRef = collection(db, `artifacts/${appId}/public/data/raids`);
    const q = query(raidsCollectionRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedRaids = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedRaids.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
        setRaids(fetchedRaids);
        if (!selectedRaidId && fetchedRaids.length > 0) {
            setSelectedRaidId(fetchedRaids[0].id);
        } else if (selectedRaidId && !fetchedRaids.some(raid => raid.id === selectedRaidId)) {
            setSelectedRaidId(fetchedRaids.length > 0 ? fetchedRaids[0].id : null);
        }
    }, () => setError('공격대 데이터를 불러오는 데 실패했습니다.'));
    return () => unsubscribe();
  }, [isAuthReady, db, selectedRaidId]);

  // --- API & Firestore Logic ---
  const handleSearchCharacter = async (characterName) => {
    if (!LOST_ARK_API_KEY) { setError('오류: 로스트아크 API 키가 설정되지 않았습니다.'); return; }
    if (!characterName) { setError('캐릭터명을 입력해주세요.'); return; }
    
    setSearchLoading(true); setError('');
    
    try {
      const siblingsUrl = `https://developer-lostark.game.onstove.com/characters/${encodeURIComponent(characterName)}/siblings`;
      const siblingsResponse = await fetch(siblingsUrl, { headers: { 'accept': 'application/json', 'authorization': `bearer ${LOST_ARK_API_KEY}` } });
      const siblingsData = await siblingsResponse.json();
      if (!siblingsResponse.ok) throw new Error(siblingsData.message || `API 오류: ${siblingsResponse.status}`);
      if (!siblingsData || siblingsData.length === 0) {
        setError('해당 캐릭터 또는 연관 캐릭터를 찾을 수 없습니다.');
        setCharacters([]);
        return;
      }

      const parsedData = siblingsData.map(char => ({ ...char, parsedIlvl: parseFloat(char.ItemAvgLevel.replace(/,/g, '')) }));
      const highestIlvlChar = parsedData.reduce((prev, current) => (prev.parsedIlvl > current.parsedIlvl) ? prev : current);
      const isSpecialAccount = highestIlvlChar.CharacterName === '호크준듀';
      const transformedCharacters = parsedData.map(char => ({
        ...char,
        displayName: char.CharacterName === highestIlvlChar.CharacterName ? char.CharacterName : `${char.CharacterName} (${highestIlvlChar.CharacterName})`,
        isSpecial: isSpecialAccount,
      }));
      transformedCharacters.sort((a, b) => b.parsedIlvl - a.parsedIlvl);
      setCharacters(transformedCharacters);

    } catch (err) {
      setError(`검색 실패: ${err.message}`);
      setCharacters([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchCharacterDetails = async (character) => {
    try {
      const armoryUrl = `https://developer-lostark.game.onstove.com/armories/characters/${encodeURIComponent(character.CharacterName)}?filters=profiles`;
      const response = await fetch(armoryUrl, { headers: { 'accept': 'application/json', 'authorization': `bearer ${LOST_ARK_API_KEY}` } });
      const data = await response.json();
      if (response.ok && data.ArmoryProfile) {
        return { ...character, CombatPower: data.ArmoryProfile.CombatPower, addedBy: userId };
      }
      return { ...character, CombatPower: 'N/A', addedBy: userId };
    } catch (err) {
      console.error("Failed to fetch character details:", err);
      return { ...character, CombatPower: 'N/A', addedBy: userId };
    }
  };

  const assignCharacter = async (raidId, partyNum, slot) => {
    if (!characterToAssign || !db) return;
    
    const characterWithDetails = await fetchCharacterDetails(characterToAssign);
    const raidDocRef = doc(db, `artifacts/${appId}/public/data/raids`, raidId);
    const currentRaidDoc = raids.find(r => r.id === raidId);
    if (!currentRaidDoc) return;

    if (currentRaidDoc.type === 'general') {
        // ... (General game assignment logic)
    } else {
        // ... (Raid assignment logic)
    }
  };

  // ... (rest of the handlers: create, edit, delete, etc.)

  const currentRaid = raids.find(r => r.id === selectedRaidId);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-100">about 공격대 관리</h1>
        {error && <div className="mb-4 p-3 bg-red-900/60 border border-red-600 rounded-md flex items-center max-w-2xl mx-auto text-sm shadow-lg"><AlertCircle className="mr-2 flex-shrink-0" size={16} /><span>{error}</span></div>}
        {!isAuthReady && <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-blue-500" size={40} /><span className="ml-3 text-lg text-gray-300">데이터베이스 연결 중...</span></div>}
        {isAuthReady && (
          <div className="flex flex-col lg:flex-row gap-6">
            <CharacterSearch onSearch={handleSearchCharacter} searchLoading={searchLoading} characters={characters} onAssignCharacter={setCharacterToAssign} />
            <div className="w-full lg:w-2/3 bg-gray-800 p-5 rounded-xl shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center text-gray-200"><Users className="mr-2" size={20} />공격대</h2>
                <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors flex items-center text-sm font-medium shadow-md"><Plus className="mr-1" size={16} />공격대 만들기</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div ref={raidListRef}><RaidList raids={raids} selectedRaidId={selectedRaidId} onSelectRaid={setSelectedRaidId} onDeleteClick={() => {}} /></div>
                <RaidDetails currentRaid={currentRaid} userId={userId} onEditClick={() => {}} onRemoveCharacterClick={() => {}} />
              </div>
            </div>
          </div>
        )}
        {/* All modals will be rendered here */}
      </div>
      <style>{`.animate-fade-in{animation:fadeIn .3s ease-out forwards}@keyframes fadeIn{from{opacity:0}to{opacity:1}}.custom-scrollbar::-webkit-scrollbar{width:8px}.custom-scrollbar::-webkit-scrollbar-track{background:transparent}.custom-scrollbar::-webkit-scrollbar-thumb{background:#4b5563;border-radius:10px}`}</style>
    </div>
  );
}