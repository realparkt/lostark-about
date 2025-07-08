import React, { useState, useEffect } from 'react';
import { Calendar, Gamepad2 } from 'lucide-react';

export default function CreateRaidModal({ isOpen, onClose, onCreate, isCreating }) {
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [type, setType] = useState('raid');
    const [size, setSize] = useState(8);

    useEffect(() => {
        if (isOpen) {
            const today = new Date();
            const offset = today.getTimezoneOffset() * 60000;
            const localDate = new Date(today.getTime() - offset);
            const [dateStr, timeStr] = localDate.toISOString().split('T');
            setDate(dateStr);
            setTime(timeStr.substring(0, 5));
        }
    }, [isOpen]);

    const handleSubmit = () => onCreate({ name, date, time, type, size });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-2xl transform scale-100 animate-scale-in border border-gray-700">
                <h3 className="text-xl font-semibold mb-5 flex items-center"><Calendar className="mr-2" />새 공격대 만들기</h3>
                <div className="space-y-4">
                    <div className="flex bg-gray-700 rounded-lg p-1">
                        <button onClick={() => setType('raid')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${type === 'raid' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>레이드 (8인)</button>
                        <button onClick={() => setType('general')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${type === 'general' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}><Gamepad2 size={16} className="inline-block mr-1"/>종합게임</button>
                    </div>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="공격대 이름 (예: 1막 하드)" className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 border border-gray-600" />
                    {type === 'general' && (
                        <div className="flex items-center gap-2">
                            <label htmlFor="raidSize" className="text-sm font-medium text-gray-300">인원수:</label>
                            <input type="number" id="raidSize" value={size} onChange={(e) => setSize(e.target.value)} min="1" max="20" className="w-20 px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 border border-gray-600" />
                        </div>
                    )}
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-300 border border-gray-600" />
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-300 border border-gray-600" />
                </div>
                <div className="mt-6 flex gap-3">
                    <button onClick={handleSubmit} disabled={isCreating} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors font-medium shadow-md disabled:bg-gray-500 disabled:cursor-wait">{isCreating ? '생성 중...' : '만들기'}</button>
                    <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium shadow-md">취소</button>
                </div>
            </div>
        </div>
    );
}