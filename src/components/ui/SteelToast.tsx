import React from 'react';
import { X, MessageSquare, LifeBuoy, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export default function SteelToast() {
  const { activeToasts, removeToast } = useNotifications();

  if (activeToasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {activeToasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto
            w-85 bg-white border border-gray-200 shadow-lg rounded-xl overflow-hidden
            flex items-stretch animate-in slide-in-from-right duration-300
            ${toast.type === 'message' ? 'border-l-4 border-l-blue-500' : 
              toast.type === 'error' ? 'border-l-4 border-l-red-500' : 
              toast.type === 'success' ? 'border-l-4 border-l-emerald-500' :
              'border-l-4 border-l-amber-500'}
          `}
        >
          <div className="p-4 flex-1 flex items-start gap-3">
            <div className={`p-2.5 rounded-lg ${
              toast.type === 'message' ? 'bg-blue-50 text-blue-600' : 
              toast.type === 'error' ? 'bg-red-50 text-red-600' : 
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
              'bg-amber-50 text-amber-600'}`}>
              {toast.type === 'message' ? <MessageSquare size={18} /> : 
               toast.type === 'error' ? <AlertCircle size={18} /> : 
               toast.type === 'success' ? <CheckCircle2 size={18} /> :
               <LifeBuoy size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                {toast.type === 'message' ? 'New Message' : 
                 toast.type === 'error' ? 'Error' : 
                 toast.type === 'success' ? 'Success' :
                 'System Notification'}
              </div>
              <div className="text-sm text-gray-900 font-medium leading-tight truncate">
                {toast.message}
              </div>
            </div>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-4 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors border-l border-gray-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}
