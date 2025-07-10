// --- src/App.js ---

import React, { useState, useEffect, useRef } from 'react';
import { db, auth, appId } from './firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, getDocs } from 'firebase/firestore';

import CharacterSearch from './components/CharacterSearch';
import RaidList from './components/RaidList';
import RaidDetails from './components/RaidDetails';
import CreateRaidModal from './components/modals/CreateRaidModal';
import EditRaidModal from './components/modals/EditRaidModal';
import DeleteModal from './components/modals/DeleteModal';
import AdminPasswordModal from './components/modals/AdminPasswordModal';
import CannotDeleteModal from './components/modals/CannotDeleteModal';
import AssignModal from './components/modals/AssignModal';
import RaidSelectionModal from './components/modals/RaidSelectionModal';

import { Users, Plus, Loader, AlertCircle } from 'lucide-react';

const LOST_ARK_API_KEY = process.env.REACT_APP_LOSTARK_API_KEY;
const ADMIN_PASSWORD = '221215';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  const raidListRef = useRef(null);

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

  useEffect(() => {
    const checkExpiredRaids = async () => {
      if (!db || !isAuthReady || !userId) return;
      const now = new Date();
      const raidsCollectionRef = collection(db, `artifacts/${appId}/public/data/raids`);
      try {
        const snapshot = await getDocs(raidsCollectionRef);
        const raidsToDelete = [];
        snapshot.forEach(doc => {
          const raid = doc.data();
          if(raid.dateTime) {
            const twoHoursAfterRaid = new Date(new Date(raid.dateTime).getTime() + 2 * 60 * 60 * 1000); 
            if (now >= twoHoursAfterRaid) raidsToDelete.push(doc.id);
          }
        });
        if (raidsToDelete.length > 0) {
          const deletePromises = raidsToDelete.map(raidId => deleteDoc(doc(db, `artifacts/${appId}/public/data/raids`, raidId)));
          await Promise.all(deletePromises);
        }
      } catch (err) { console.error("Error checking for expired raids:", err); }
    };
    const intervalId = setInterval(checkExpiredRaids, 60 * 60 * 1000);
    checkExpiredRaids();
    return () => clearInterval(intervalId);
  }, [isAuthReady, db, userId]);

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
      const transformedCharacters = parsedData.map(char => ({ ...char, displayName: char.CharacterName === highestIlvlChar.CharacterName ? char.CharacterName : `${char.CharacterName} (${highestIlvlChar.CharacterName})`, isSpecial: isSpecialAccount }));
      transformedCharacters.sort((a, b) => b.parsedIlvl - a.parsedIlvl);
      setCharacters(transformedCharacters);
    } catch (err) { setError(`검색 실패: ${err.message}`); setCharacters([]); } finally { setSearchLoading(false); }
  };
  
  const handleCreateRaid = async ({ name, date, time, type, size }) => {
    if (isCreatingRaid) return;
    if (!name || !date || !time) { setError('모든 정보를 입력해주세요.'); return; }
    setIsCreatingRaid(true); setError('');
    const raidDateTimeStr = `${date}T${time}:00`;
    const newDate = new Date(raidDateTimeStr);
    if (isNaN(newDate.getTime())) { setError('유효하지 않은 날짜/시간'); setIsCreatingRaid(false); return; }
    let newRaidData = { name, dateTime: newDate.toISOString(), creatorId: userId, createdAt: new Date().toISOString(), type };
    if (type === 'raid') newRaidData = { ...newRaidData, party1: { dealers: [], support: null }, party2: { dealers: [], support: null }, size: 8 };
    else newRaidData = { ...newRaidData, participants: [], size: Number(size) || 4 };
    try {
      const raidsCollectionRef = collection(db, `artifacts/${appId}/public/data/raids`);
      const docRef = await addDoc(raidsCollectionRef, newRaidData);
      setShowCreateModal(false); setSelectedRaidId(docRef.id);
    } catch (e) { setError('공격대 생성 실패'); } finally { setIsCreatingRaid(false); }
  };

  const handleEditRaid = (raid) => { setRaidToEdit(raid); setShowEditModal(true); };

  const handleUpdateRaid = async ({ name, date, time }) => {
    if (!raidToEdit || isUpdatingRaid) return;
    if (!name || !date || !time) { setError('모든 정보를 입력해주세요.'); return; }
    setIsUpdatingRaid(true); setError('');
    const raidDateTimeStr = `${date}T${time}:00`;
    const newDate = new Date(raidDateTimeStr);
    if (isNaN(newDate.getTime())) { setError('유효하지 않은 날짜 또는 시간 형식입니다.'); setIsUpdatingRaid(false); return; }
    const raidDocRef = doc(db, `artifacts/${appId}/public/data/raids`, raidToEdit.id);
    try {
      await updateDoc(raidDocRef, { name, dateTime: newDate.toISOString() });
      setShowEditModal(false); setRaidToEdit(null);
    } catch (e) { setError('공격대 정보 업데이트에 실패했습니다.'); } finally { setIsUpdatingRaid(false); }
  };

  const handleDeleteRaidClick = (raid) => {
    setSubjectToDelete({ type: 'raid', data: raid });
    if (userId === raid.creatorId) setShowDeleteModal(true);
    else setShowAdminModal(true);
  };

  const handleRemoveCharacterClick = (partyNum, slot, index) => {
    const currentRaid = raids.find(r => r.id === selectedRaidId);
    if (!currentRaid) return;
    let characterData;
    if (currentRaid.type === 'general') characterData = currentRaid.participants[index];
    else characterData = slot === 'support' ? currentRaid[`party${partyNum}`].support : currentRaid[`party${partyNum}`].dealers[index];
    if (!characterData) return;
    setSubjectToDelete({ type: 'character', data: { partyNum, slot, index, addedBy: characterData.addedBy } });
    if (userId === characterData.addedBy) setShowDeleteModal(true);
    else setShowCannotDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!subjectToDelete) return;
    const db = getFirestore();
    if (subjectToDelete.type === 'raid') {
        const raidDocRef = doc(db, `artifacts/${appId}/public/data/raids`, subjectToDelete.data.id);
        try { await deleteDoc(raidDocRef); } catch (e) { setError('공격대 삭제에 실패했습니다.'); }
    } else {
        const { partyNum, slot, index } = subjectToDelete.data;
        const raidDocRef = doc(db, `artifacts/${appId}/public/data/raids`, selectedRaidId);
        const currentRaidDoc = raids.find(r => r.id === selectedRaidId);
        const updatedRaid = JSON.parse(JSON.stringify(currentRaidDoc));
        try {
            if (updatedRaid.type === 'general') {
                updatedRaid.participants.splice(index, 1);
                await updateDoc(raidDocRef, { participants: updatedRaid.participants });
            } else {
                const targetParty = updatedRaid[`party${partyNum}`];
                if (slot === 'support') targetParty.support = null;
                else if (index !== null) targetParty.dealers.splice(index, 1);
                await updateDoc(raidDocRef, { party1: updatedRaid.party1, party2: updatedRaid.party2 });
            }
        } catch(e) { setError('캐릭터 제외에 실패했습니다.'); }
    }
    setShowDeleteModal(false); setSubjectToDelete(null);
  };
  
  const handleAdminConfirm = (password) => {
    if (password === ADMIN_PASSWORD) {
        confirmDelete();
        setShowAdminModal(false);
    } else {
        setError('관리자 비밀번호가 올바르지 않습니다.');
    }
  };

  const handleAssignCharacter = (character) => {
    setCharacterToAssign(character);
    setShowRaidSelectionModal(true);
  };

  const handleRaidSelectedForAssignment = (raidId) => {
    const raid = raids.find(r => r.id === raidId);
    if (!raid) return;
    if (raid.type === 'general') {
      assignCharacter(raidId, null, 'general');
    } else {
      setSelectedRaidId(raidId);
      setShowAssignModal(true);
    }
    setShowRaidSelectionModal(false);
  };
  
  const assignCharacter = async (raidId, partyNum, slot) => {
    if (!characterToAssign) return;
    const db = getFirestore();
    const characterWithDetails = await fetchCharacterDetails(characterToAssign);
    const raidDocRef = doc(db, `artifacts/${appId}/public/data/raids`, raidId);
    const currentRaidDoc = raids.find(r => r.id === raidId);
    if (!currentRaidDoc) return;
    const updatedRaid = JSON.parse(JSON.stringify(currentRaidDoc));
    const getCharMainName = (char) => char.displayName.includes('(') ? char.displayName.split('(')[1].replace(')', '') : char.CharacterName;
    const assignedCharMainName = getCharMainName(characterWithDetails);
    const isFamilyAlreadyInRaid = (raidType) => {
        if (raidType === 'general') return updatedRaid.participants.some(member => getCharMainName(member) === assignedCharMainName);
        return Object.values(updatedRaid.party1).flat().concat(Object.values(updatedRaid.party2).flat()).filter(Boolean).some(member => getCharMainName(member) === assignedCharMainName);
    };
    if (isFamilyAlreadyInRaid(currentRaidDoc.type)) { setError(`'${assignedCharMainName}' 계정의 캐릭터는 이미 이 파티에 할당되어 있습니다.`); return; }
    if (currentRaidDoc.type === 'general') {
        if (updatedRaid.participants.length >= updatedRaid.size) { setError('자리가 꽉 찼습니다.'); return; }
        updatedRaid.participants.push(characterWithDetails);
        await updateDoc(raidDocRef, { participants: updatedRaid.participants });
    } else {
        ['party1', 'party2'].forEach(partyKey => {
            if (updatedRaid[partyKey].support?.CharacterName === characterWithDetails.CharacterName) updatedRaid[partyKey].support = null;
            updatedRaid[partyKey].dealers = updatedRaid[partyKey].dealers.filter(d => d.CharacterName !== characterWithDetails.CharacterName);
        });
        const targetParty = updatedRaid[`party${partyNum}`];
        if (slot === 'support') {
            if (targetParty.support) { setError('서포터 슬롯이 이미 채워져 있습니다.'); return; }
            targetParty.support = characterWithDetails;
        } else {
            if (targetParty.dealers.length >= 3) { setError('딜러 슬롯이 꽉 찼습니다.'); return; }
            targetParty.dealers.push(characterWithDetails);
        }
        await updateDoc(raidDocRef, { party1: updatedRaid.party1, party2: updatedRaid.party2 });
    }
    setCharacterToAssign(null);
    setShowAssignModal(false);
  };

  const fetchCharacterDetails = async (character) => {
    try {
      const armoryUrl = `https://developer-lostark.game.onstove.com/armories/characters/${encodeURIComponent(character.CharacterName)}?filters=profiles`;
      const response = await fetch(armoryUrl, { headers: { 'accept': 'application/json', 'authorization': `bearer ${LOST_ARK_API_KEY}` } });
      const data = await response.json();
      if (response.ok && data.ArmoryProfile) return { ...character, CombatPower: data.ArmoryProfile.CombatPower, addedBy: userId };
      return { ...character, CombatPower: 'N/A', addedBy: userId };
    } catch (err) { return { ...character, CombatPower: 'N/A', addedBy: userId }; }
  };

  const handleSyncCombatPower = async (raidToSync) => {
    if (!raidToSync || isSyncing) return;
    setIsSyncing(true); setError('');
    let members = [];
    if (raidToSync.type === 'general') members = raidToSync.participants || [];
    else members = [...(raidToSync.party1?.dealers || []), raidToSync.party1?.support, ...(raidToSync.party2?.dealers || []), raidToSync.party2?.support].filter(Boolean);
    const membersToUpdate = members.filter(m => m && !m.CombatPower);
    if (membersToUpdate.length === 0) { setIsSyncing(false); return; }
    try {
      const updatedMembersPromises = membersToUpdate.map(member => fetchCharacterDetails(member));
      const fetchedMembers = await Promise.all(updatedMembersPromises);
      const fetchedMembersMap = new Map(fetchedMembers.map(m => [m.CharacterName, m]));
      const updatedRaid = JSON.parse(JSON.stringify(raidToSync));
      const updateMember = (m) => fetchedMembersMap.get(m.CharacterName) || m;
      if (updatedRaid.type === 'general') updatedRaid.participants = updatedRaid.participants.map(updateMember);
      else {
        updatedRaid.party1.dealers = updatedRaid.party1.dealers.map(updateMember);
        if (updatedRaid.party1.support) updatedRaid.party1.support = updateMember(updatedRaid.party1.support);
        updatedRaid.party2.dealers = updatedRaid.party2.dealers.map(updateMember);
        if (updatedRaid.party2.support) updatedRaid.party2.support = updateMember(updatedRaid.party2.support);
      }
      const db = getFirestore();
      const raidDocRef = doc(db, `artifacts/${appId}/public/data/raids`, raidToSync.id);
      await updateDoc(raidDocRef, updatedRaid);
    } catch (err) { setError('전투력 동기화 중 오류가 발생했습니다.'); } finally { setIsSyncing(false); }
  };
  
  const currentRaid = raids.find(r => r.id === selectedRaidId);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-100">about 공격대 관리</h1>
        {error && <div className="mb-4 p-3 bg-red-900/60 border border-red-600 rounded-md flex items-center max-w-2xl mx-auto text-sm shadow-lg"><AlertCircle className="mr-2 flex-shrink-0" size={16} /><span>{error}</span></div>}
        {!isAuthReady && <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-blue-500" size={40} /><span className="ml-3 text-lg text-gray-300">데이터베이스 연결 중...</span></div>}
        {isAuthReady && (
          <div className="flex flex-col lg:flex-row gap-6">
            <CharacterSearch onSearch={handleSearchCharacter} searchLoading={searchLoading} characters={characters} onAssignCharacter={handleAssignCharacter} />
            <div className="w-full lg:w-2/3 bg-gray-800 p-5 rounded-xl shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center text-gray-200"><Users className="mr-2" size={20} />공격대</h2>
                <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors flex items-center text-sm font-medium shadow-md"><Plus className="mr-1" size={16} />공격대 만들기</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div ref={raidListRef}><RaidList raids={raids} selectedRaidId={selectedRaidId} onSelectRaid={setSelectedRaidId} onDeleteClick={handleDeleteRaidClick} /></div>
                <RaidDetails currentRaid={currentRaid} userId={userId} onEditClick={handleEditRaid} onRemoveCharacterClick={handleRemoveCharacterClick} onSyncCombatPower={handleSyncCombatPower} isSyncing={isSyncing} />
              </div>
            </div>
          </div>
        )}
        <CreateRaidModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreateRaid} isCreating={isCreatingRaid} />
        <EditRaidModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} onUpdate={handleUpdateRaid} isUpdating={isUpdatingRaid} raidToEdit={raidToEdit} />
        <DeleteModal isOpen={showDeleteModal} onClose={() => {setShowDeleteModal(false); setSubjectToDelete(null);}} onConfirm={confirmDelete} subject={subjectToDelete} />
        <AdminPasswordModal isOpen={showAdminModal} onClose={() => setShowAdminModal(false)} onConfirm={handleAdminConfirm} />
        <CannotDeleteModal isOpen={showCannotDeleteModal} onClose={() => setShowCannotDeleteModal(false)} onAdminDelete={() => { setShowCannotDeleteModal(false); setShowAdminModal(true); }} />
        <RaidSelectionModal isOpen={showRaidSelectionModal} onClose={() => setShowRaidSelectionModal(false)} onSelect={handleRaidSelectedForAssignment} raids={raids} character={characterToAssign} />
        <AssignModal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} onAssign={(partyNum, slot) => assignCharacter(selectedRaidId, partyNum, slot)} character={characterToAssign} raid={currentRaid} />
      </div>
      <style>{`.animate-fade-in{animation:fadeIn .3s ease-out forwards}@keyframes fadeIn{from{opacity:0}to{opacity:1}}.custom-scrollbar::-webkit-scrollbar{width:8px}.custom-scrollbar::-webkit-scrollbar-track{background:transparent}.custom-scrollbar::-webkit-scrollbar-thumb{background:#4b5563;border-radius:10px}`}</style>
    </div>
  );
}
