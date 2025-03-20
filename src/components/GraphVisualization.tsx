import { useEffect, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Download, Filter, RefreshCw } from 'lucide-react';
import { useNotes } from '@/hooks/useNotes';
import { useFolders } from '@/hooks/useFolders';
import { useToast } from '@/components/ui/use-toast';
import { Note, IndexedFile, Folder, GraphNode, GraphEdge } from '@/lib/types';
import { findSimilarContent } from '@/utils/noteOrganizer';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useEmbeddings } from '@/hooks/useEmbeddings';
import CytoscapeComponent from 'react-cytoscapejs';
import cytoscape from 'cytoscape';
import cola from 'cytoscape-cola';

// Register the cola layout extension
cytoscape.use(cola);

const GraphVisualization = () => {
  const [cyRef, setCyRef] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notes, indexedFiles } = useNotes();
  const { folders } = useFolders();
  const { toast } = useToast();
  const { processAllContent, isProcessing } = useEmbeddings();
  const [graphData, setGraphData] = useState<{nodes: any[], edges: any[]}>({ nodes: [], edges: [] });
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
  const [loading, setLoading] = useState(true);

  // Track performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState({
    nodeCount: 0,
    edgeCount: 0,
    processingTimeMs: 0
  });
  
  // Build graph data from notes, indexed files and their connections
  const buildGraphData = useCallback(async () => {
    setLoading(true);
    const startTime = performance.now();
    
    try {
      // Filter to only include items with embeddings to avoid unnecessary processing
      const itemsWithEmbeddings = [...notes, ...indexedFiles].filter(
        item => item.embeddings && item.embeddings.length > 0
      );
      
      // Include all items if there are fewer than 50 total items, even without embeddings
      // This ensures the graph isn't empty when users are just getting started
      const allItems = itemsWithEmbeddings.length < 10 && (notes.length + indexedFiles.length) < 50
        ? [...notes, ...indexedFiles]
        : itemsWithEmbeddings;
      
      // Create nodes for all content items
      const nodes: any[] = [];
      
      // Add notes with optimization for large datasets
      notes.forEach(note => {
        const hasEmbeddings = note.embeddings && note.embeddings.length > 0;
        
        // For large datasets, only include items with embeddings
        if (hasEmbeddings || notes.length + indexedFiles.length < 50) {
          nodes.push({
            data: {
              id: note.id,
              label: note.title || 'Untitled Note',
              type: 'note',
              hasEmbeddings,
              // Only include minimal data for large graphs to reduce memory usage
              content: nodes.length > 200 ? { id: note.id, title: note.title } : note
            }
          });
        }
      });
      
      // Add indexed files
      indexedFiles.forEach(file => {
        const hasEmbeddings = file.embeddings && file.embeddings.length > 0;
        
        // For large datasets, only include items with embeddings
        if (hasEmbeddings || notes.length + indexedFiles.length < 50) {
          nodes.push({
            data: {
              id: file.id,
              label: file.filename || 'Unknown File',
              type: 'file',
              hasEmbeddings,
              // Only include minimal data for large graphs
              content: nodes.length > 200 ? { id: file.id, filename: file.filename } : file
            }
          });
        }
      });
      
      // For very large datasets, use web workers or batched processing
      const isLargeDataset = allItems.length > 500;
      
      // Generate edges based on content similarity
      const edges: any[] = [];
      const processedPairs = new Set<string>();
      
      // For large datasets, limit the number of connections per node to improve performance
      const maxConnectionsPerNode = isLargeDataset ? 5 : 20;
      
      // For each item, find its connections with optimized approach
      for (const item of allItems) {
        if (!item.embeddings || item.embeddings.length === 0) continue;
        
        // Use optimized similarity search for large datasets
        const similarItems = findSimilarContent(
          item.id, 
          allItems, 
          similarityThreshold,
          maxConnectionsPerNode
        );
        
        // Limit the number of connections for large datasets
        const limitedSimilarItems = isLargeDataset 
          ? similarItems.slice(0, maxConnectionsPerNode) 
          : similarItems;
        
        for (const similar of limitedSimilarItems) {
          // Create a unique pair ID to avoid duplicate edges
          const pairId = [item.id, similar.id].sort().join('-');
          
          if (!processedPairs.has(pairId) && similar.similarity >= similarityThreshold) {
            processedPairs.add(pairId);
            
            edges.push({
              data: {
                id: `${item.id}-${similar.id}`,
                source: item.id,
                target: similar.id,
                weight: similar.similarity,
                similarity: similar.similarity
              }
            });
          }
        }
      }
      
      // Store performance metrics
      const endTime = performance.now();
      setPerformanceMetrics({
        nodeCount: nodes.length,
        edgeCount: edges.length,
        processingTimeMs: Math.round(endTime - startTime)
      });
      
      // Set graph data
      setGraphData({ nodes, edges });
      
      // Show performance toast for large datasets
      if (nodes.length > 200) {
        toast({
          title: "Graph Generated",
          description: `${nodes.length} nodes and ${edges.length} connections in ${Math.round((endTime - startTime))}ms`,
        });
      }
    } catch (error) {
      console.error('Error building graph data:', error);
      toast({
        title: 'Graph Error',
        description: 'Failed to build the knowledge graph.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [notes, indexedFiles, similarityThreshold, toast]);
  
  // Initialize graph data when component mounts or data changes
  useEffect(() => {
    buildGraphData();
  }, [buildGraphData]);
  
  // Handle graph events and styling after Cytoscape is initialized
  useEffect(() => {
    if (!cyRef) return;
    
    // Set up Cytoscape event handlers
    cyRef.on('tap', 'node', (event: any) => {
      const node = event.target;
      console.log('Clicked node:', node.id(), node.data());
      // Handle node selection (could navigate to note editor, etc.)
    });
    
    // Define visual styles
    cyRef.style([
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'text-wrap': 'ellipsis',
          'text-max-width': '80px',
          'background-color': '#5a67d8',
          'color': '#ffffff',
          'font-size': '10px',
          'width': '30px',
          'height': '30px'
        }
      },
      {
        selector: 'node[type="note"]',
        style: {
          'background-color': '#5a67d8', // Indigo for notes
          'shape': 'round-rectangle'
        }
      },
      {
        selector: 'node[type="file"]',
        style: {
          'background-color': '#38a169', // Green for files
          'shape': 'diamond'
        }
      },
      {
        selector: 'node[hasEmbeddings = false]',
        style: {
          'border-width': '2px',
          'border-style': 'dashed',
          'border-color': '#e53e3e',
          'opacity': '0.7'
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 'data(weight)',
          'line-color': '#a0aec0',
          'opacity': '0.7',
          'curve-style': 'bezier'
        }
      },
      {
        selector: 'edge[similarity >= 0.7]',
        style: {
          'line-color': '#3182ce' // Strong connections
        }
      },
      {
        selector: ':selected',
        style: {
          'background-color': '#ed8936',
          'line-color': '#ed8936',
          'border-width': '2px',
          'border-color': '#dd6b20'
        }
      }
    ]);
    
    // Performance optimization measures for large datasets
    const nodeCount = graphData.nodes.length;
    
    // Apply appropriate layout based on graph size
    if (nodeCount <= 100) {
      // For small graphs, use cola which gives nice results
      cyRef.layout({
        name: 'cola',
        animate: true,
        randomize: true,
        nodeDimensionsIncludeLabels: true,
        refresh: 1,
        maxSimulationTime: 4000,
        fit: true,
        padding: 30
      }).run();
    } else if (nodeCount <= 500) {
      // For medium graphs, use faster cose layout with limited iterations
      cyRef.layout({
        name: 'cose',
        animate: true,
        nodeDimensionsIncludeLabels: true,
        refresh: 20,
        idealEdgeLength: 100,
        nodeOverlap: 20,
        numIter: 1000, // Limit iterations for larger graphs
        fit: true,
        padding: 30
      }).run();
    } else {
      // For very large graphs, use simple circle layout (much faster)
      cyRef.layout({
        name: 'circle',
        animate: false,
        nodeDimensionsIncludeLabels: true,
        fit: true,
        padding: 30
      }).run();
      
      // Show warning for very large graphs
      toast({
        title: "Large Graph Detected",
        description: `${nodeCount} nodes may impact performance. Consider increasing the similarity threshold.`,
        variant: "destructive"
      });
    }
    
    // Add visual hints for large graphs
    if (nodeCount > 200) {
      // Reduce rendering quality for better performance
      cyRef.userZoomingEnabled(true);
      cyRef.userPanningEnabled(true);
      
      // Use simpler node style for large graphs
      cyRef.style()
        .selector('node')
        .style({
          'label': nodeCount > 500 ? '' : 'data(label)', // Remove labels for very large graphs
          'text-max-width': '60px',
          'font-size': '8px'
        })
        .update();
    }
    
  }, [cyRef, graphData]);
  
  // Handle zoom operations
  const handleZoomIn = () => {
    if (cyRef) {
      cyRef.zoom(cyRef.zoom() * 1.2);
      cyRef.center();
    }
  };
  
  const handleZoomOut = () => {
    if (cyRef) {
      cyRef.zoom(cyRef.zoom() / 1.2);
      cyRef.center();
    }
  };
  
  // Handle download as PNG
  const handleDownload = () => {
    if (cyRef) {
      const png = cyRef.png({
        output: 'blob',
        scale: 2,
        bg: '#1a202c',
        full: true
      });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(png);
      link.download = 'knowledge-graph.png';
      link.click();
    }
  };
  
  // Handle threshold change
  const handleThresholdChange = (value: number[]) => {
    setSimilarityThreshold(value[0]);
  };
  
  // Handle generating embeddings for all content
  const handleGenerateEmbeddings = () => {
    processAllContent();
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-medium">Knowledge Graph</h2>
        <p className="text-sm text-muted-foreground">
          Visualize connections between your notes and indexed files.
        </p>
        
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Similarity Threshold</span>
                <span className="text-xs text-muted-foreground">{(similarityThreshold * 100).toFixed(0)}%</span>
              </div>
              <Slider
                onValueChange={handleThresholdChange}
                defaultValue={[similarityThreshold]}
                max={1}
                min={0}
                step={0.05}
                className="w-full"
              />
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={buildGraphData}
              disabled={loading}
              className="flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateEmbeddings}
              disabled={isProcessing}
              className="flex items-center gap-1"
            >
              <Filter className="w-4 h-4" />
              <span>Generate Embeddings</span>
            </Button>
          </div>
          
          {/* Graph metrics display */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <div className="bg-muted/50 px-2 py-1 rounded-md">
              <span className="font-medium">Nodes:</span> {performanceMetrics.nodeCount}
            </div>
            <div className="bg-muted/50 px-2 py-1 rounded-md">
              <span className="font-medium">Connections:</span> {performanceMetrics.edgeCount}
            </div>
            {performanceMetrics.processingTimeMs > 0 && (
              <div className="bg-muted/50 px-2 py-1 rounded-md">
                <span className="font-medium">Processing time:</span> {performanceMetrics.processingTimeMs}ms
              </div>
            )}
            <div className="bg-muted/50 px-2 py-1 rounded-md">
              <span className="font-medium">Items with embeddings:</span> {
                [...notes, ...indexedFiles].filter(item => item.embeddings && item.embeddings.length > 0).length
              }/{notes.length + indexedFiles.length}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-muted-foreground">Loading graph...</span>
          </div>
        ) : (
          <CytoscapeComponent
            elements={[...graphData.nodes, ...graphData.edges]}
            style={{ width: '100%', height: '100%' }}
            stylesheet={[]}
            layout={{
              name: graphData.nodes.length > 100 
                ? (graphData.nodes.length > 500 ? 'circle' : 'cose') 
                : 'cola',
              animate: graphData.nodes.length <= 500,
              refresh: graphData.nodes.length > 100 ? 10 : 1,
              maxSimulationTime: graphData.nodes.length > 300 ? 2000 : 3000,
              fit: true,
              padding: 30
            }}
            cy={(cy: any) => setCyRef(cy)}
            wheelSensitivity={0.2}
            minZoom={0.1}
            maxZoom={3}
            motionBlur={false}
            pixelRatio={1.0}
          />
        )}
        
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button 
            className="w-10 h-10 rounded-lg glass flex items-center justify-center button-hover-effect focus-ring"
            onClick={handleZoomIn}
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button 
            className="w-10 h-10 rounded-lg glass flex items-center justify-center button-hover-effect focus-ring"
            onClick={handleZoomOut}
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button 
            className="w-10 h-10 rounded-lg glass flex items-center justify-center button-hover-effect focus-ring"
            onClick={handleDownload}
            aria-label="Download graph as PNG"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GraphVisualization;
