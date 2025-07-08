import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export default function AdminPasswordModal({ isOpen, onClose, onConfirm }) {
    const [password, setPassword] = useState('');
    const handleConfirm = () => { onConfirm(password); setPassword(''); };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm shadow-2xl transform scale-100 animate-scale-in border border-gray-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center"><ShieldCheck className="mr-2"/>관리자 확인</h3>
                <p className="text-gray-300 mb-4">삭제하려면 관리자 비밀번호를 입력하세요.</p>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleConfirm()} className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 border border-gray-600" placeholder="비밀번호 입력" />
                <div className="mt-6 flex gap-3">
                    <button onClick={handleConfirm} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors font-medium shadow-md">확인</button>
                    <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium shadow-md">취소</button>
                </div>
            </div>
        </div>
    );
}