
import { useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, Download } from 'lucide-react';

const GraphVisualization = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // This would be replaced with actual graph visualization library
    // like Cytoscape.js or Vis.js in a real implementation
    const renderPlaceholderGraph = () => {
      if (!containerRef.current) return;
      
      const canvas = document.createElement('canvas');
      canvas.width = containerRef.current.clientWidth;
      canvas.height = containerRef.current.clientHeight;
      containerRef.current.appendChild(canvas);
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set styles
      ctx.fillStyle = 'hsl(217, 91%, 60%)'; // primary color
      ctx.strokeStyle = 'hsl(217, 19%, 27%)'; // border color
      
      // Draw nodes
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Center node
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Surrounding nodes
      const nodeCount = 8;
      const radius = 150;
      
      for (let i = 0; i < nodeCount; i++) {
        const angle = (i / nodeCount) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        // Draw connection line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw node
        ctx.beginPath();
        ctx.arc(x, y, 15 + Math.random() * 10, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${210 + i * 20}, 80%, 60%, 0.8)`;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'hsl(217, 19%, 27%)';
        ctx.stroke();
      }
      
      // Add some random connections between nodes
      for (let i = 0; i < 5; i++) {
        const startNode = Math.floor(Math.random() * nodeCount);
        let endNode = Math.floor(Math.random() * nodeCount);
        
        // Make sure we don't connect a node to itself
        while (endNode === startNode) {
          endNode = Math.floor(Math.random() * nodeCount);
        }
        
        const startAngle = (startNode / nodeCount) * Math.PI * 2;
        const endAngle = (endNode / nodeCount) * Math.PI * 2;
        
        const startX = centerX + Math.cos(startAngle) * radius;
        const startY = centerY + Math.sin(startAngle) * radius;
        
        const endX = centerX + Math.cos(endAngle) * radius;
        const endY = centerY + Math.sin(endAngle) * radius;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 3]);
        ctx.strokeStyle = 'hsla(217, 91%, 60%, 0.4)';
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };
    
    renderPlaceholderGraph();
    
    const handleResize = () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        renderPlaceholderGraph();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-medium">Knowledge Graph</h2>
        <p className="text-sm text-muted-foreground">
          Visualize connections between your notes.
        </p>
      </div>
      
      <div className="flex-1 relative">
        <div 
          ref={containerRef} 
          className="absolute inset-0 flex items-center justify-center animate-fade-in"
        />
        
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button className="w-10 h-10 rounded-lg glass flex items-center justify-center button-hover-effect focus-ring">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 rounded-lg glass flex items-center justify-center button-hover-effect focus-ring">
            <ZoomOut className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 rounded-lg glass flex items-center justify-center button-hover-effect focus-ring">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GraphVisualization;
