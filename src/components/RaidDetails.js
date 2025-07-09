
import React from 'react';
import { Pencil, Trash2, Swords, RefreshCw, Share2 } from 'lucide-react';

const PartySlot = ({ member, onRemove, role, label }) => {
  const itemLevel = member ? Math.floor(parseFloat(String(member.ItemAvgLevel).replace(/,/g, ''))) : 0;
  const colorClass = {
    support: 'text-pink-400',
    dealer: 'text-green-300',
    general: 'text-sky-300'
  };

  return (
    <div className={`p-2 bg-gray-700/50 rounded border border-dashed border-gray-600 min-h-[56px] relative flex items-center text-center`}>
      {member ? (
        <>
          <div className="w-full">
            <div className={`text-sm font-semibold flex items-center justify-center ${colorClass[role]}`}>
              <span>{member.displayName}</span>
              {member.isSpecial && <span className="ml-1.5" title="자칭 귀염둥이">🎀</span>}
            </div>
            <div className="text-xs text-gray-400">
              {member.CharacterClassName}({itemLevel})
              {member.CombatPower && ` / 전투력 ${member.CombatPower}`}
            </div>
          </div>
          <button onClick={onRemove} className="absolute top-1 right-1 text-red-400 hover:text-red-300 p-0.5 rounded-full bg-gray-800/50"><Trash2 size={12} /></button>
        </>
      ) : (
        <div className="w-full text-xs text-gray-500">{label} 슬롯</div>
      )}
    </div>
  );
};

const calculateAverageCombatPowerDetails = (raid) => {
  if (!raid) return 'N/A';
  let members = [];
  if (raid.type === 'general') members = raid.participants || [];
  else members = [...(raid.party1?.dealers || []), raid.party1?.support, ...(raid.party2?.dealers || []), raid.party2?.support].filter(Boolean);
  const validMembers = members.filter(m => m && m.CombatPower && m.CombatPower !== 'N/A');
  if (validMembers.length === 0) return 'N/A';
  const totalPower = validMembers.reduce((sum, member) => sum + (isNaN(parseFloat(String(member.CombatPower).replace(/,/g, ''))) ? 0 : parseFloat(String(member.CombatPower).replace(/,/g, ''))), 0);
  const averagePower = totalPower / validMembers.length;
  return averagePower.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function RaidDetails({ currentRaid, userId, onEditClick, onRemoveCharacterClick, onSyncCombatPower, isSyncing, onShareClick }) {
  if (!currentRaid) {
    return <div className="flex items-center justify-center h-full text-gray-500">공격대를 선택하여 파티 구성을 확인하세요.</div>;
  }
  const formatDateTime = (isoString) => new Date(isoString).toLocaleString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  const avgCombatPower = calculateAverageCombatPowerDetails(currentRaid);

  return (
    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-lg text-gray-200 truncate pr-2">{currentRaid.name}</h3>
        <div className="flex items-center gap-2">
            <button onClick={() => onShareClick(currentRaid)} className="p-1.5 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors flex-shrink-0"><Share2 size={16} /></button>
            {userId === currentRaid.creatorId && <button onClick={() => onEditClick(currentRaid)} className="p-1.5 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors flex-shrink-0"><Pencil size={16} /></button>}
        </div>
      </div>
      <div className="text-sm text-gray-400 mb-2">출발: {formatDateTime(currentRaid.dateTime)}</div>
      <div className="text-sm text-amber-400 mb-4 flex items-center justify-between">
        <div className="flex items-center">
            <Swords size={14} className="mr-1.5" />
            평균 전투력: {avgCombatPower}
        </div>
        {userId === currentRaid.creatorId && (
            <button onClick={() => onSyncCombatPower(currentRaid)} disabled={isSyncing} className="p-1.5 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-50">
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            </button>
        )}
      </div>
      
      {currentRaid.type === 'general' ? (
        <div className="space-y-2">
          {Array.from({ length: currentRaid.size }).map((_, index) => {
            const member = currentRaid.participants?.[index];
            return <PartySlot key={index} member={member} onRemove={() => onRemoveCharacterClick(null, 'general', index)} role="general" label="참여자" />;
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {[1, 2].map(partyNum => (
            <div key={partyNum} className="bg-gray-800/70 p-3 rounded-md shadow-inner">
              <h3 className="font-semibold mb-2 text-indigo-300">{partyNum}파티</h3>
              <div className="space-y-2">
                <PartySlot member={currentRaid[`party${partyNum}`].support} onRemove={() => onRemoveCharacterClick(partyNum, 'support', null)} role="support" label="서포터" />
                {[0, 1, 2].map(index => <PartySlot key={index} member={currentRaid[`party${partyNum}`].dealers[index]} onRemove={() => onRemoveCharacterClick(partyNum, 'dealer', index)} role="dealer" label="딜러" />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}