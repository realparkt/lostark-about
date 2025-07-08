import React from 'react';

export default function RaidSelectionModal({ isOpen, onClose, onSelect, raids, character }) {
    if (!isOpen || !character) return null;

    const formatDateTime = (isoString) => new Date(isoString).toLocaleString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-2xl transform scale-100 animate-scale-in border border-gray-700">
                <h3 className="text-lg font-semibold mb-4"><span className="text-blue-300 font-bold">'{character.displayName}'</span>을(를) 할당할 공격대 선택</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {raids.map(raid => (
                        <button key={raid.id} onClick={() => onSelect(raid.id)} className="w-full text-left p-3 bg-gray-700 hover:bg-blue-800/60 rounded-md transition-colors shadow-sm border border-gray-600">
                            <div className="font-semibold">{raid.name}</div>
                            <div className="text-sm text-gray-300">{formatDateTime(raid.dateTime)}</div>
                        </button>
                    ))}
                </div>
                <button onClick={onClose} className="mt-6 w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium shadow-md">취소</button>
            </div>
        </div>
    );
}