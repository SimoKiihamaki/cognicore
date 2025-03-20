
import { ReactNode } from 'react';

interface SettingsHeaderProps {
  title: string;
  description: string;
  icon: ReactNode;
}

const SettingsHeader = ({ title, description, icon }: SettingsHeaderProps) => {
  return (
    <div className="flex items-center gap-4 pb-4 border-b">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

export default SettingsHeader;
export type { SettingsHeaderProps };
