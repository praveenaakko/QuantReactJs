


import React from 'react';
import type { NotificationMessage } from '../types';
import { NotificationType } from '../types';

interface NotificationProps {
  notification: NotificationMessage;
}

export const Notification: React.FC<NotificationProps> = ({ notification }) => {
  const baseClasses = 'px-6 py-3 rounded-lg font-greycliff text-sm z-50 shadow-lg animate-fade-in-right';
  const typeClasses = {
    [NotificationType.SUCCESS]: 'bg-green-500 text-white',
    [NotificationType.ERROR]: 'bg-red-500 text-white',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[notification.type]}`}>
      {notification.message}
    </div>
  );
};

// Add keyframes for animation in a style tag or tailwind.config.js if needed
// For simplicity in this single file structure, you might add this to your index.html style tag
/*
@keyframes fade-in-right {
  0% {
    opacity: 0;
    transform: translateX(20px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}
.animate-fade-in-right {
  animation: fade-in-right 0.3s ease-out forwards;
}
*/
