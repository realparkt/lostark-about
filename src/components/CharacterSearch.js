import React, { useState } from 'react';
import { Search, Loader, UserPlus } from 'lucide-react';

const CharacterCard = ({ char, onAssign }) => (
  <div className="p-3 bg-gray-700/80 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-between shadow-sm border border-gray-700">
    <div>
      <div className="font-semibold flex items-center">
        {char.displayName}
        {char.isSpecial && <span className="ml-2" title="자칭 귀염둥이">🎀</span>}
      </div>
      <div className="text-sm text-gray-300">Lv.{char.CharacterLevel} {char.CharacterClassName}</div>
      <div className="text-xs text-gray-400">IL: {char.ItemAvgLevel}</div>
    </div>
    <button onClick={() => onAssign(char)} className="ml-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-sm flex items-center font-medium transition-colors shadow">
      <UserPlus size={16} className="mr-1" />
      추가
    </button>
  </div>
);

export default function CharacterSearch({ onSearch, searchLoading, characters, onAssignCharacter }) {
  const [characterName, setCharacterName] = useState('');
  const handleSearch = () => onSearch(characterName);

  return (
    <div className="w-full lg:w-1/3 bg-gray-800 p-5 rounded-xl shadow-2xl">
      <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-200"><Search className="mr-2" size={20} />캐릭터 조회</h2>
      <div className="flex gap-2 mb-4">
        <input type="text" value={characterName} onChange={(e) => setCharacterName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} placeholder="캐릭터명 입력" className="flex-1 px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 border border-gray-600" />
        <button onClick={handleSearch} disabled={searchLoading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed font-medium shadow-md">
          {searchLoading ? <Loader className="animate-spin" size={20} /> : '조회'}
        </button>
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {characters.length === 0 && !searchLoading && <div className="text-center text-gray-500 py-12">캐릭터를 검색해주세요.</div>}
        {characters.map((char, index) => <CharacterCard key={`${char.CharacterName}-${index}`} char={char} onAssign={onAssignCharacter} />)}
      </div>
    </div>
  );
}
