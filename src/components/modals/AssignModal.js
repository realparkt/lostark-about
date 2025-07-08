import React from 'react';

export default function AssignModal({ isOpen, onClose, onAssign, character, raid }) {
    if (!isOpen || !character || !raid) return null;
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-2xl transform scale-100 animate-scale-in border border-gray-700">
                <h3 className="text-lg font-semibold mb-4 text-center"><span className="text-blue-300 font-bold">'{character.displayName}'</span> 할당</h3>
                <div className="space-y-4">
                    {[1, 2].map(partyNum => (
                        <div key={partyNum} className="bg-gray-700/80 p-3 rounded-md shadow-inner">
                            <h4 className="font-medium mb-2 text-center text-indigo-300">{partyNum}파티</h4>
                            <div className="flex gap-2">
                                <button onClick={() => onAssign(partyNum, 'dealer')} className="flex-1 px-3 py-2 bg-red-600/80 hover:bg-red-700/80 rounded-md text-sm font-medium shadow-sm disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors" disabled={raid[`party${partyNum}`].dealers.length >= 3}>딜러 ({raid[`party${partyNum}`].dealers.length}/3)</button>
                                <button onClick={() => onAssign(partyNum, 'support')} className="flex-1 px-3 py-2 bg-green-600/80 hover:bg-green-700/80 rounded-md text-sm font-medium shadow-sm disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors" disabled={!!raid[`party${partyNum}`].support}>서포터 ({raid[`party${partyNum}`].support ? '1/1' : '0/1'})</button>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={onClose} className="mt-6 w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium shadow-md">취소</button>
            </div>
        </div>
    );
}