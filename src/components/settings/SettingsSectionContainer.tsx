
import { ReactNode } from 'react';

interface SettingsSectionContainerProps {
  children: ReactNode;
}

const SettingsSectionContainer = ({ children }: SettingsSectionContainerProps) => {
  return (
    <div className="flex-1 p-4 space-y-6">
      {children}
    </div>
  );
};

export default SettingsSectionContainer;
