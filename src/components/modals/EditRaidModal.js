import React, { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';

export default function EditRaidModal({ isOpen, onClose, onUpdate, isUpdating, raidToEdit }) {
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    useEffect(() => {
        if (raidToEdit) {
            setName(raidToEdit.name);
            const raidDate = new Date(raidToEdit.dateTime);
            const offset = raidDate.getTimezoneOffset() * 60000;
            const localDate = new Date(raidDate.getTime() - offset);
            const [dateStr, timeStr] = localDate.toISOString().split('T');
            setDate(dateStr);
            setTime(timeStr.substring(0, 5));
        }
    }, [raidToEdit]);

    const handleSubmit = () => onUpdate({ name, date, time });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-2xl transform scale-100 animate-scale-in border border-gray-700">
                <h3 className="text-xl font-semibold mb-5 flex items-center"><Pencil className="mr-2" />공격대 정보 수정</h3>
                <div className="space-y-4">
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="공격대 이름" className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 border border-gray-600" />
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-300 border border-gray-600" />
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-3 py-2 bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-300 border border-gray-600" />
                </div>
                <div className="mt-6 flex gap-3">
                    <button onClick={handleSubmit} disabled={isUpdating} className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors font-medium shadow-md disabled:bg-gray-500 disabled:cursor-wait">{isUpdating ? '저장 중...' : '저장'}</button>
                    <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors font-medium shadow-md">취소</button>
                </div>
            </div>
        </div>
    );
}