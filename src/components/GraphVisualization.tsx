import { useEffect, useRef, useState } from 'react';
import cytoscape, { EdgeSingular } from 'cytoscape';
import { useNotes } from '@/hooks/useNotes';
import { useFolders } from '@/hooks/useFolders';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import databaseService, { STORE_NAMES } from '@/services/database/databaseService';
import { Embedding, Note, Tag } from '@/lib/types';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/providers/NotificationsProvider';
import { extractConcepts } from '@/utils/nlp';

// Import Cytoscape layouts and extensions
let coseBilkent: any;
try {
  coseBilkent = require('cytoscape-cose-bilkent');
  // Register the layout extension
  cytoscape.use(coseBilkent);
} catch (error) {
  console.warn('Could not load cytoscape-cose-bilkent:', error);
}

interface GraphVisualizationProps {
  threshold: number;
  layout: string;
  searchTerm: string;
  graphType: 'knowledge' | 'folder';
  focusedNode?: string | null;
  onNodeSelect?: (id: string | null) => void;
  isLoading?: boolean;
}

interface GraphNode {
  id: string;
  label: string;
  type: 'note' | 'folder' | 'tag' | 'concept';
  data?: any;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  label?: string;
}

interface ConceptNode extends GraphNode {
  type: 'concept';
  frequency: number;
  noteIds: string[];
}

interface TagNode extends GraphNode {
  type: 'tag';
  noteIds: string[];
}

const GraphVisualization = ({
  threshold = 0.7,
  layout = 'force-directed',
  searchTerm = '',
  graphType = 'knowledge',
  focusedNode,
  onNodeSelect,
  isLoading = false
}: GraphVisualizationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const { notes } = useNotes();
  const { folderTree, folders } = useFolders();
  const [error, setError] = useState<string | null>(null);
  const [internalLoading, setInternalLoading] = useState(true);
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  
  // Store graph data in state to avoid scope issues
  const [graphData, setGraphData] = useState<{
    nodes: GraphNode[];
    edges: GraphEdge[];
  }>({ nodes: [], edges: [] });
  
  // Calculate similarities between notes
  const calculateSimilarities = async (notes: Note[]): Promise<GraphEdge[]> => {
    try {
      const edges: GraphEdge[] = [];
      
      // Get all embeddings from the database
      const embeddings = await databaseService.getAll(STORE_NAMES.EMBEDDINGS);
      
      if (embeddings.length === 0) {
        console.warn('No embeddings found in the database');
        return [];
      }
      
      // Group embeddings by note ID
      const noteEmbeddings: Record<string, number[][]> = {};
      for (const embedding of embeddings) {
        const { noteId, vector } = embedding as { noteId: string; vector: number[] };
        if (!noteEmbeddings[noteId]) {
          noteEmbeddings[noteId] = [];
        }
        noteEmbeddings[noteId].push(vector);
      }
      
      // Calculate similarities between notes with embeddings
      const noteIds = Object.keys(noteEmbeddings);
      for (let i = 0; i < noteIds.length; i++) {
        const noteA = noteIds[i];
        
        for (let j = i + 1; j < noteIds.length; j++) {
          const noteB = noteIds[j];
          
          // Calculate average similarity between all embeddings of the two notes
          let totalSimilarity = 0;
          let comparisonCount = 0;
          
          for (const vectorA of noteEmbeddings[noteA]) {
            for (const vectorB of noteEmbeddings[noteB]) {
              const similarity = cosineSimilarity(vectorA, vectorB);
              totalSimilarity += similarity;
              comparisonCount++;
            }
          }
          
          const avgSimilarity = comparisonCount > 0 ? totalSimilarity / comparisonCount : 0;
          
          // Add edge if similarity is above threshold
          if (avgSimilarity >= threshold) {
            edges.push({
              source: noteA,
              target: noteB,
              weight: avgSimilarity
            });
          }
        }
      }
      
      return edges;
    } catch (error) {
      console.error('Error calculating similarities:', error);
      setError('Failed to calculate note similarities');
      return [];
    }
  };
  
  // Calculate folder relationships
  const calculateFolderRelationships = (): GraphEdge[] => {
    const edges: GraphEdge[] = [];
    
    // Add edges between parent and child folders
    for (const folder of folders) {
      if (folder.parentId) {
        edges.push({
          source: folder.parentId,
          target: folder.id,
          weight: 1,
          label: 'contains'
        });
      }
    }
    
    // Add edges between folders and notes
    for (const note of notes) {
      if (note.folderId) {
        edges.push({
          source: note.folderId,
          target: note.id,
          weight: 1,
          label: 'contains'
        });
      }
    }
    
    return edges;
  };
  
  // Cosine similarity between two vectors
  const cosineSimilarity = (a: number[], b: number[]): number => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return similarity;
  };

  // Extract concepts from notes
  const extractNoteConcepts = async (notes: Note[]): Promise<ConceptNode[]> => {
    const conceptsMap = new Map<string, { frequency: number; noteIds: string[] }>();
    
    for (const note of notes) {
      const concepts = await extractConcepts(note.content);
      
      for (const concept of concepts) {
        const existing = conceptsMap.get(concept);
        if (existing) {
          existing.frequency++;
          existing.noteIds.push(note.id);
        } else {
          conceptsMap.set(concept, {
            frequency: 1,
            noteIds: [note.id]
          });
        }
      }
    }
    
    // Convert to nodes, filtering out low-frequency concepts
    return Array.from(conceptsMap.entries())
      .filter(([_, data]) => data.frequency >= 2) // Only show concepts that appear in multiple notes
      .map(([concept, data]) => ({
        id: `concept-${concept}`,
        label: concept,
        type: 'concept' as const,
        frequency: data.frequency,
        noteIds: data.noteIds
      }));
  };
  
  // Extract tags from notes
  const extractNoteTags = (notes: Note[]): TagNode[] => {
    const tagsMap = new Map<string, string[]>();
    
    for (const note of notes) {
      if (note.tags) {
        for (const tag of note.tags) {
          const existing = tagsMap.get(tag);
          if (existing) {
            existing.push(note.id);
          } else {
            tagsMap.set(tag, [note.id]);
          }
        }
      }
    }
    
    return Array.from(tagsMap.entries()).map(([tag, noteIds]) => ({
      id: `tag-${tag}`,
      label: tag,
      type: 'tag' as const,
      noteIds
    }));
  };

  // Update graph when props change
  useEffect(() => {
    const updateGraph = async () => {
      if (!containerRef.current || !cyRef.current) return;
      
      setInternalLoading(true);
      
      try {
        // Get nodes and edges based on graph type
        let graphNodes: GraphNode[] = [];
        let graphEdges: GraphEdge[] = [];
        
        // Create nodes from notes
        const noteNodes = notes.map(note => ({
          id: note.id,
          label: note.title || 'Untitled',
          type: 'note' as const,
          data: note
        }));
        
        if (graphType === 'knowledge') {
          // Extract concepts and tags
          const conceptNodes = await extractNoteConcepts(notes);
          const tagNodes = extractNoteTags(notes);
          
          // Add all nodes
          graphNodes = [...noteNodes, ...conceptNodes, ...tagNodes];
          
          // Add edges based on semantic similarity
          const similarityEdges = await calculateSimilarities(notes);
          
          // Add edges between notes and concepts
          const conceptEdges = conceptNodes.flatMap(concept => 
            concept.noteIds.map(noteId => ({
              source: concept.id,
              target: noteId,
              weight: 0.5 as number,
              label: 'mentions'
            }))
          );
          
          // Add edges between notes and tags
          const tagEdges = tagNodes.flatMap(tag => 
            tag.noteIds.map(noteId => ({
              source: tag.id,
              target: noteId,
              weight: 0.3 as number,
              label: 'tagged'
            }))
          );
          
          graphEdges = [...similarityEdges, ...conceptEdges, ...tagEdges];
        } else if (graphType === 'folder') {
          // Add folder nodes
          const folderNodes = folders.map(folder => ({
            id: folder.id,
            label: folder.name,
            type: 'folder' as const,
            data: folder
          }));
          
          graphNodes = [...noteNodes, ...folderNodes];
          
          // Add edges based on folder hierarchy
          graphEdges = calculateFolderRelationships();
        }
        
        // Filter nodes and edges based on search term
        if (searchTerm) {
          const filteredNodeIds = new Set<string>();
          
          // Add nodes that match search term
          graphNodes.forEach(node => {
            if (node.label.toLowerCase().includes(searchTerm.toLowerCase())) {
              filteredNodeIds.add(node.id);
            }
            
            // For notes, also search content
            if (node.type === 'note' && node.data.content && 
                node.data.content.toLowerCase().includes(searchTerm.toLowerCase())) {
              filteredNodeIds.add(node.id);
            }
          });
          
          // Add connected nodes (extend search to include direct connections)
          graphEdges.forEach(edge => {
            if (filteredNodeIds.has(edge.source)) {
              filteredNodeIds.add(edge.target);
            }
            if (filteredNodeIds.has(edge.target)) {
              filteredNodeIds.add(edge.source);
            }
          });
          
          // Filter nodes and edges
          graphNodes = graphNodes.filter(node => filteredNodeIds.has(node.id));
          graphEdges = graphEdges.filter(edge => 
            filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
          );
        }
        
        // If no nodes, show empty state
        if (graphNodes.length === 0) {
          setError('No matching nodes found');
          setInternalLoading(false);
          return;
        }
        
        // Focus on specific node if requested
        if (focusedNode) {
          const focusedNodeExists = graphNodes.some(node => node.id === focusedNode);
          
          if (!focusedNodeExists) {
            // Node not in current view, add warning
            setError(`Focused node not found in current view`);
          } else {
            // Filter to include only the focused node and its direct connections
            const connectedNodeIds = new Set<string>([focusedNode]);
            
            graphEdges.forEach(edge => {
              if (edge.source === focusedNode) {
                connectedNodeIds.add(edge.target);
              }
              if (edge.target === focusedNode) {
                connectedNodeIds.add(edge.source);
              }
            });
            
            graphNodes = graphNodes.filter(node => connectedNodeIds.has(node.id));
            graphEdges = graphEdges.filter(edge => 
              connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target)
            );
          }
        }
        
        // Update graph data state
        setGraphData({ nodes: graphNodes, edges: graphEdges });
        
        // Create cytoscape instance
        cyRef.current = cytoscape({
          container: containerRef.current,
          elements: {
            nodes: graphNodes.map(node => ({
              data: {
                id: node.id,
                label: node.label,
                type: node.type,
                ...node.data
              }
            })),
            edges: graphEdges.map(edge => ({
              data: {
                source: edge.source,
                target: edge.target,
                weight: edge.weight,
                label: edge.label || ''
              }
            }))
          },
          style: [
            // Node styles
            {
              selector: 'node',
              style: {
                'label': 'data(label)',
                'text-valign': 'center',
                'text-halign': 'center',
                'font-size': '12px',
                'width': '30px',
                'height': '30px',
                'background-color': (ele) => {
                  switch (ele.data('type')) {
                    case 'note': return '#3b82f6';
                    case 'concept': return '#10b981';
                    case 'tag': return '#8b5cf6';
                    case 'folder': return '#f59e0b';
                    default: return '#6b7280';
                  }
                }
              }
            },
            // Edge styles
            {
              selector: 'edge',
              style: {
                'width': (ele) => {
                  const weight = parseFloat(ele.data('weight'));
                  return Math.max(1, weight * 3);
                },
                'line-color': '#ccc',
                'curve-style': 'bezier',
                'label': 'data(label)',
                'font-size': '10px',
                'text-rotation': 'autorotate',
                'text-margin-y': -5
              }
            }
          ]
        });
        
        // Apply layout
        applyLayout(layout);
        
        // Clear error
        setError(null);
      } catch (error) {
        console.error('Error updating graph:', error);
        setError('Failed to update graph visualization');
      } finally {
        setInternalLoading(false);
      }
    };
    
    updateGraph();
  }, [notes, folders, threshold, layout, searchTerm, graphType, focusedNode]);
  
  // Initialize cytoscape and set up event listeners
  useEffect(() => {
    // This effect needs to run after the graph has been created and cyRef.current is not null
    if (!cyRef.current) return;
    
    try {
      // Add event listeners
      cyRef.current.on('tap', 'node', function(evt) {
        const node = evt.target;
        
        if (onNodeSelect) {
          onNodeSelect(node.id());
        }
        
        if (node.data('type') === 'note') {
          // Navigate to editor when note is clicked
          navigate(`/editor/${node.id()}`);
        }
      });
    } catch (error) {
      console.error('Error setting up Cytoscape event listeners:', error);
    }
    
    // Clean up on unmount
    return () => {
      if (cyRef.current) {
        try {
          cyRef.current.destroy();
        } catch (e) {
          console.error('Error destroying Cytoscape instance:', e);
        }
        cyRef.current = null;
      }
    };
  }, [graphData, navigate, onNodeSelect]); // Re-run this effect when graphData changes
  
  // Apply layout
  const applyLayout = (layoutName: string) => {
    if (!cyRef.current) return;
    
    let layoutConfig: any;
    
    switch (layoutName) {
      case 'force-directed':
        layoutConfig = {
          name: 'cose-bilkent',
          animate: true,
          nodeDimensionsIncludeLabels: true,
          randomize: true,
          idealEdgeLength: 100,
          edgeElasticity: 0.45,
          nestingFactor: 0.1,
          gravity: 0.25,
          numIter: 2500,
          tile: true,
          tilingPaddingVertical: 10,
          tilingPaddingHorizontal: 10,
          gravityRangeCompound: 1.5
        };
        break;
      
      case 'concentric':
        layoutConfig = {
          name: 'concentric',
          animate: true,
          concentric: function(node: any) {
            return node.degree();
          },
          levelWidth: function(nodes: any) {
            return 2;
          }
        };
        break;
      
      case 'circle':
        layoutConfig = {
          name: 'circle',
          animate: true
        };
        break;
      
      case 'hierarchy':
        layoutConfig = {
          name: 'breadthfirst',
          animate: true,
          directed: true
        };
        break;
      
      case 'grid':
      default:
        layoutConfig = {
          name: 'grid',
          animate: true
        };
        break;
    }
    
    const layout = cyRef.current.layout(layoutConfig);
    layout.run();
  };
  
  // Export graph as image
  const exportImage = () => {
    if (!cyRef.current) return;
    
    // Create a PNG image
    const png = cyRef.current.png({
      output: 'blob',
      bg: 'white',
      full: true
    });
    
    // Create download link
    const url = URL.createObjectURL(png);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cognicore-graph.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Add notification
    addNotification({
      title: 'Graph Exported',
      message: 'Knowledge graph has been exported as an image',
      type: 'success'
    });
  };
  
  // Center the graph view
  const centerGraph = () => {
    if (!cyRef.current) return;
    cyRef.current.fit();
  };

  return (
    <div className="relative h-full">
      {/* Graph controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={centerGraph}
        >
          Center
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportImage}
        >
          Export
        </Button>
      </div>
      
      {/* Graph container */}
      <div
        ref={containerRef}
        className="w-full h-full"
      />
      
      {/* Loading overlay */}
      {(isLoading || internalLoading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Building graph visualization...</p>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-destructive text-destructive-foreground rounded shadow-lg">
          {error}
        </div>
      )}
      
      {/* Empty state */}
      {notes.length === 0 && !isLoading && !internalLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 p-4 text-center max-w-md">
            <h3 className="text-lg font-medium">No Notes to Visualize</h3>
            <p className="text-sm text-muted-foreground">
              Create some notes or add files to see their relationships in the graph.
            </p>
            <Button onClick={() => navigate('/editor')}>
              Create Note
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphVisualization;