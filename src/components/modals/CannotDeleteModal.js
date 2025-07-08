import React from 'react';

export default function CannotDeleteModal({ isOpen, onClose, onAdminDelete }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm shadow-2xl transform scale-100 animate-scale-in border border-gray-700">
                <h3 className="text-lg font-semibold mb-2">삭제 권한 없음</h3>
                <p className="text-gray-300 mb-6">본인이 추가한 캐릭터만 제외할 수 있습니다.</p>
                <div className="flex flex-col gap-3">
                    <button onClick={onAdminDelete} className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors font-medium shadow-md">관리자 권한으로 삭제</button>
                    <button onClick={onClose} className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium shadow-md">확인</button>
                </div>
            </div>
        </div>
    );
}