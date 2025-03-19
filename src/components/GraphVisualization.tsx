
import { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Download } from 'lucide-react';
import { useNotes } from '@/hooks/useNotes';
import { useFolders } from '@/hooks/useFolders';
import { Note, IndexedFile, Folder, GraphNode, GraphEdge } from '@/lib/types';
import { findSimilarContent } from '@/utils/noteOrganizer';

const GraphVisualization = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { notes, indexedFiles } = useNotes();
  const { folders } = useFolders();
  const [graphData, setGraphData] = useState<{nodes: GraphNode[], edges: GraphEdge[]}>({ nodes: [], edges: [] });
  
  useEffect(() => {
    // Build graph data from notes, indexed files and their connections
    const buildGraphData = async () => {
      const allItems = [...notes, ...indexedFiles];
      
      // Create nodes for all content items
      const nodes: GraphNode[] = [];
      
      // Add notes
      notes.forEach(note => {
        nodes.push({
          id: note.id,
          label: note.title || 'Untitled Note',
          data: note as any
        });
      });
      
      // Add indexed files
      indexedFiles.forEach(file => {
        nodes.push({
          id: file.id,
          label: file.filename || 'Unknown File',
          data: file as any
        });
      });
      
      // Generate edges based on content similarity
      const edges: GraphEdge[] = [];
      const processedPairs = new Set<string>();
      
      // For each item, find its connections
      for (const item of allItems) {
        const similarItems = findSimilarContent(item.id, allItems, 0.3);
        
        for (const similar of similarItems) {
          // Create a unique pair ID to avoid duplicate edges
          const pairId = [item.id, similar.id].sort().join('-');
          
          if (!processedPairs.has(pairId) && similar.similarity > 0.3) {
            processedPairs.add(pairId);
            
            edges.push({
              id: `${item.id}-${similar.id}`,
              source: item.id,
              target: similar.id,
              similarity: similar.similarity
            });
          }
        }
      }
      
      setGraphData({ nodes, edges });
    };
    
    buildGraphData();
  }, [notes, indexedFiles, folders]);
  
  useEffect(() => {
    // This would be replaced with actual graph visualization library
    // like Cytoscape.js or Vis.js in a real implementation
    const renderPlaceholderGraph = () => {
      if (!containerRef.current) return;
      
      const canvas = document.createElement('canvas');
      canvas.width = containerRef.current.clientWidth;
      canvas.height = containerRef.current.clientHeight;
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(canvas);
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Get available nodes to render
      const nodes = graphData.nodes.slice(0, Math.min(graphData.nodes.length, 12));
      const edges = graphData.edges;
      
      if (nodes.length === 0) {
        ctx.fillStyle = 'hsl(217, 19%, 60%)';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No content available to visualize', canvas.width / 2, canvas.height / 2);
        return;
      }
      
      // Set styles
      ctx.fillStyle = 'hsl(217, 91%, 60%)'; // primary color
      ctx.strokeStyle = 'hsl(217, 19%, 27%)'; // border color
      
      // Draw nodes
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) * 0.35;
      
      // Calculate node positions
      const nodePositions = nodes.map((node, i) => {
        const angle = (i / nodes.length) * Math.PI * 2;
        return {
          id: node.id,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          isNote: 'folderId' in (node.data || {}),
          label: node.label
        };
      });
      
      // Draw edges
      ctx.globalAlpha = 0.4;
      edges.forEach(edge => {
        const sourceNode = nodePositions.find(n => n.id === edge.source);
        const targetNode = nodePositions.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.lineWidth = Math.max(1, edge.similarity * 4);
          ctx.strokeStyle = `hsla(217, 91%, 60%, ${Math.min(1, edge.similarity + 0.2)})`;
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
      
      // Draw nodes
      nodePositions.forEach((node, i) => {
        const radius = node.isNote ? 25 : 20;
        
        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = node.isNote 
          ? `hsla(${210 + i * 20}, 80%, 60%, 0.8)` 
          : `hsla(${120 + i * 20}, 70%, 60%, 0.8)`;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'hsl(217, 19%, 27%)';
        ctx.stroke();
        
        // Draw node label
        ctx.fillStyle = 'hsl(217, 19%, 15%)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        
        // Truncate text if needed
        let label = node.label;
        if (label.length > 15) {
          label = label.substring(0, 12) + '...';
        }
        
        ctx.fillText(label, node.x, node.y + radius + 15);
        
        // Add icon to identify type
        ctx.fillStyle = 'white';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.isNote ? 'N' : 'F', node.x, node.y + 5);
      });
    };
    
    renderPlaceholderGraph();
    
    const handleResize = () => {
      renderPlaceholderGraph();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [graphData]);
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-medium">Knowledge Graph</h2>
        <p className="text-sm text-muted-foreground">
          Visualize connections between your notes and indexed files.
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
