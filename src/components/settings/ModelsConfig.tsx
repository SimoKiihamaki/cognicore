
import { Settings } from '@/lib/types';

interface ModelsConfigProps {
  settings: Settings;
  onUpdateSettings: (field: keyof Settings, value: any) => void;
}

const ModelsConfig = ({ settings, onUpdateSettings }: ModelsConfigProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium">Models</h3>
      
      <div className="glass p-4 rounded-lg space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="primaryModel">
            Primary Model
          </label>
          <input
            id="primaryModel"
            type="text"
            value={settings.primaryModelName}
            onChange={(e) => onUpdateSettings('primaryModelName', e.target.value)}
            className="w-full p-2 rounded-md border border-border bg-background"
            placeholder="Model name (e.g., Meta-Llama-3-8B-Instruct)"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Used for detailed interactions. Should match exactly the model name in LM Studio.
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="secondaryModel">
            Secondary Model
          </label>
          <input
            id="secondaryModel"
            type="text"
            value={settings.secondaryModelName}
            onChange={(e) => onUpdateSettings('secondaryModelName', e.target.value)}
            className="w-full p-2 rounded-md border border-border bg-background"
            placeholder="Model name (e.g., Phi-3-mini-4k-instruct)"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Used for rapid tasks. Should be a faster, lighter model.
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="embeddingModel">
            Embedding Model
          </label>
          <input
            id="embeddingModel"
            type="text"
            value={settings.embeddingModelName}
            onChange={(e) => onUpdateSettings('embeddingModelName', e.target.value)}
            className="w-full p-2 rounded-md border border-border bg-background"
            placeholder="Model name (e.g., Xenova/all-MiniLM-L6-v2)"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Used for creating note embeddings and calculating similarity.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModelsConfig;
