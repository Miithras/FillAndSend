import React from 'react';

interface ToastProps {
  message: string;
  isErr?: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, isErr }) => {
  if (!message) return null;
  return (
    <div className={`toast ${isErr ? 'err' : ''}`}>
      {message}
    </div>
  );
};
