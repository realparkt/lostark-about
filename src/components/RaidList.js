import React from 'react';
import { Clock, Trash2, Gamepad2 } from 'lucide-react';

const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
};

export default function RaidList({ raids, selectedRaidId, onSelectRaid, onDeleteClick }) {
  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
      {raids.length === 0 && <div className="text-center text-gray-500 py-12">공격대를 생성해주세요.</div>}
      {raids.map(raid => {
        const totalMembers = raid.type === 'general' ? (raid.participants?.length || 0) : ((raid.party1?.dealers.length || 0) + (raid.party1?.support ? 1 : 0) + (raid.party2?.dealers.length || 0) + (raid.party2?.support ? 1 : 0));
        const maxMembers = raid.size || 8;
        const isFull = totalMembers === maxMembers;
        const indicatorColor = isFull ? 'bg-green-500' : 'bg-yellow-500';

        return (
          <div key={raid.id} onClick={() => onSelectRaid(raid.id)} className={`p-3 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-between shadow-md border-2 ${selectedRaidId === raid.id ? 'bg-blue-900/50 border-blue-500' : 'bg-gray-700/80 border-gray-700 hover:border-gray-600'}`}>
            <div className="flex items-center overflow-hidden mr-2">
              <div className={`w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0 ${indicatorColor}`}></div>
              <div className="truncate">
                <div className="font-semibold truncate flex items-center">
                  {raid.type === 'general' && <Gamepad2 size={16} className="mr-1.5 text-cyan-400"/>}
                  {raid.name}
                </div>
                <div className="text-sm text-gray-300 flex items-center"><Clock className="mr-1.5" size={14} />{formatDateTime(raid.dateTime)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-mono text-gray-400">{totalMembers}/{maxMembers}</span>
              <button onClick={(e) => { e.stopPropagation(); onDeleteClick(raid); }} className="text-gray-400 hover:text-red-400 p-1.5 rounded-full bg-gray-800/50 hover:bg-gray-700 transition-colors"><Trash2 size={16} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}