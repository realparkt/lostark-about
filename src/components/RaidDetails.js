import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

const PartySlot = ({ member, onRemove, type }) => (
  <div className={`p-2 bg-gray-700/50 rounded border border-dashed border-gray-600 min-h-[56px] relative flex items-center text-center`}>
    {member ? (
      <>
        <div className="w-full">
          <div className={`text-sm font-semibold flex items-center justify-center ${type === 'support' ? 'text-green-300' : type === 'dealer' ? 'text-red-300' : 'text-sky-300'}`}>
            <span>{member.displayName}</span>
            {member.isSpecial && <span className="ml-1.5" title="자칭 귀염둥이">🎀</span>}
          </div>
          <div className="text-xs text-gray-400">{member.CharacterClassName} | IL {member.ItemAvgLevel}</div>
        </div>
        <button onClick={onRemove} className="absolute top-1 right-1 text-red-400 hover:text-red-300 p-0.5 rounded-full bg-gray-800/50"><Trash2 size={12} /></button>
      </>
    ) : (
      <div className="w-full text-xs text-gray-500">{type} 슬롯</div>
    )}
  </div>
);

export default function RaidDetails({ currentRaid, userId, onEditClick, onRemoveCharacterClick }) {
  if (!currentRaid) {
    return <div className="flex items-center justify-center h-full text-gray-500">공격대를 선택하여 파티 구성을 확인하세요.</div>;
  }
  const formatDateTime = (isoString) => new Date(isoString).toLocaleString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg text-gray-200 truncate pr-2">{currentRaid.name}</h3>
        {userId === currentRaid.creatorId && <button onClick={() => onEditClick(currentRaid)} className="p-1.5 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors flex-shrink-0"><Pencil size={16} /></button>}
      </div>
      <div className="text-sm text-gray-400 mb-4">출발: {formatDateTime(currentRaid.dateTime)}</div>
      {currentRaid.type === 'general' ? (
        <div className="space-y-2">
          {Array.from({ length: currentRaid.size }).map((_, index) => {
            const member = currentRaid.participants?.[index];
            return <PartySlot key={index} member={member} onRemove={() => onRemoveCharacterClick(null, 'general', index)} type="참여자" />;
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {[1, 2].map(partyNum => (
            <div key={partyNum} className="bg-gray-800/70 p-3 rounded-md shadow-inner">
              <h3 className="font-semibold mb-2 text-indigo-300">{partyNum}파티</h3>
              <div className="space-y-2">
                <PartySlot member={currentRaid[`party${partyNum}`].support} onRemove={() => onRemoveCharacterClick(partyNum, 'support', null)} type="서포터" />
                {[0, 1, 2].map(index => <PartySlot key={index} member={currentRaid[`party${partyNum}`].dealers[index]} onRemove={() => onRemoveCharacterClick(partyNum, 'dealer', index)} type="딜러" />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}