
import { ReactNode } from 'react';

interface SettingsSectionContainerProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

const SettingsSectionContainer = ({ children, title, description }: SettingsSectionContainerProps) => {
  return (
    <div className="flex-1 p-4 space-y-6">
      {title && (
        <div className="space-y-1">
          <h3 className="text-lg font-medium">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

export default SettingsSectionContainer;
export type { SettingsSectionContainerProps };
