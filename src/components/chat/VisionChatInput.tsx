import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Card, 
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Image, Upload, X, Loader2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getLMStudioService } from '@/api/lmStudioApi';

interface VisionChatInputProps {
  onMessageSent: (message: string, aiResponse: string) => void;
  isLoading?: boolean;
}

const VisionChatInput: React.FC<VisionChatInputProps> = ({ 
  onMessageSent,
  isLoading = false
}) => {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Open file selection dialog
  const handleSelectImages = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Only accept image files
    const validImageFiles = selectedFiles.filter(file => 
      file.type.startsWith('image/')
    );
    
    // Create preview URLs for selected images
    const newPreviewUrls = validImageFiles.map(file => URL.createObjectURL(file));
    
    // Update state
    setImages(prev => [...prev, ...validImageFiles]);
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    
    // Reset input value to allow selecting the same files again
    e.target.value = '';
  };

  // Remove an image from the selection
  const handleRemoveImage = (index: number) => {
    // Release object URL to prevent memory leaks
    URL.revokeObjectURL(imagePreviewUrls[index]);
    
    // Remove image from arrays
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Send message with images
  const handleSendMessage = async () => {
    if (!prompt.trim() && images.length === 0) return;
    
    try {
      setProcessing(true);
      setError(null);
      
      const lmStudioService = getLMStudioService();
      
      // Check if vision is supported
      if (!lmStudioService.config.supportsVision) {
        throw new Error(
          'Vision capabilities not supported by the selected model. ' +
          'Please select a model that supports vision, such as Gemma 3, LLaVA, or Claude 3.'
        );
      }
      
      // Send vision request
      const response = await lmStudioService.sendVisionRequest(
        prompt,
        images,
        true // Use primary model
      );
      
      // Clean up image preview URLs
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      
      // Call callback with message and response
      onMessageSent(
        `${prompt} ${images.length > 0 ? `[${images.length} image(s)]` : ''}`,
        response
      );
      
      // Reset form
      setPrompt('');
      setImages([]);
      setImagePreviewUrls([]);
    } catch (error) {
      console.error('Error sending vision request:', error);
      setError(error instanceof Error ? error.message : String(error));
      
      toast({
        variant: 'destructive',
        title: 'Error sending vision request',
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Vision Chat</CardTitle>
        <CardDescription>
          Send images with your questions to get detailed responses
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Image previews */}
        {imagePreviewUrls.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3">
            {imagePreviewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img 
                  src={url} 
                  alt={`Preview ${index}`} 
                  className="h-28 w-28 object-cover rounded-md border border-border" 
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-80 hover:opacity-100"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Text input */}
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask a question about your images..."
          className="resize-none mb-2"
          rows={3}
          disabled={processing || isLoading}
        />
        
        {/* Error message */}
        {error && (
          <div className="text-sm text-destructive mt-1 mb-2 flex items-start gap-2">
            <Info size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectImages}
            disabled={processing || isLoading}
          >
            <Image size={16} className="mr-2" />
            Add Image
          </Button>
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />
        </div>
        
        <Button
          type="button"
          onClick={handleSendMessage}
          disabled={(!prompt.trim() && images.length === 0) || processing || isLoading}
        >
          {(processing || isLoading) && <Loader2 size={16} className="mr-2 animate-spin" />}
          Send
        </Button>
      </CardFooter>
    </Card>
  );
};

export default VisionChatInput;