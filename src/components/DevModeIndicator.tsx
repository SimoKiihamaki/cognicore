import React from 'react';

const DevModeIndicator: React.FC = () => {
  // Only show in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 z-50 bg-yellow-600 text-white text-xs px-2 py-1 rounded-tr-md">
      DEV MODE
    </div>
  );
};

export default DevModeIndicator;
