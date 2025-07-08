import React from 'react';

export default function DeleteModal({ isOpen, onClose, onConfirm, subject }) {
    if (!isOpen) return null;
    const isRaid = subject?.type;
    const title = isRaid ? '공격대 삭제' : '캐릭터 제외';
    const message = isRaid ? '정말로 이 공격대를 삭제하시겠습니까?' : '정말로 이 캐릭터를 제외하시겠습니까?';
    const buttonText = isRaid ? '삭제' : '제외';

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm shadow-2xl transform scale-100 animate-scale-in border border-gray-700">
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-gray-300 mb-6">{message}<br/>이 작업은 되돌릴 수 없습니다.</p>
                <div className="flex gap-3">
                    <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors font-medium shadow-md">{buttonText}</button>
                    <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium shadow-md">취소</button>
                </div>
            </div>
        </div>
    );
}