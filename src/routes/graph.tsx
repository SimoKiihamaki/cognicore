import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import GraphVisualization from '@/components/GraphVisualization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useNotes } from '@/hooks/useNotes';
import { Input } from '@/components/ui/input';
import { debounce } from '@/utils/debounce';

/**
 * Graph Visualization route that provides interactive exploration
 * of knowledge connections between notes.
 */
const GraphRoute = () => {
  const { notes } = useNotes();
  const [graphType, setGraphType] = useState('knowledge');
  const [similarityThreshold, setSimilarityThreshold] = useState(0.7);
  const [layout, setLayout] = useState('force-directed');
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Debounced search function
  const debouncedSearch = debounce((term: string) => {
    setSearchTerm(term);
  }, 300);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Reset graph filters
  const resetFilters = () => {
    setSimilarityThreshold(0.7);
    setLayout('force-directed');
    setSearchTerm('');
    setFocusedNode(null);
  };

  // Simulate graph refresh
  const refreshGraph = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <>
      <Helmet>
        <title>Knowledge Graph | CogniCore</title>
        <meta name="description" content="Visualize connections between your notes" />
      </Helmet>

      <div className="container mx-auto p-4 h-full flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Knowledge Graph</h1>
            <p className="text-muted-foreground">
              Visualize connections between your {notes.length} notes
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Input
              className="w-64"
              placeholder="Search notes..."
              onChange={handleSearchChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
            >
              Reset
            </Button>
            <Button
              size="sm"
              onClick={refreshGraph}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-[250px_1fr] gap-4 h-full">
          {/* Sidebar controls */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Graph Settings</CardTitle>
                <CardDescription>
                  Customize the graph visualization
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Graph Type</h3>
                  <Tabs value={graphType} onValueChange={setGraphType} className="w-full">
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
                      <TabsTrigger value="folder">Folder</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium">Similarity Threshold</h3>
                    <span className="text-sm text-muted-foreground">
                      {(similarityThreshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[similarityThreshold]}
                    min={0.1}
                    max={0.9}
                    step={0.05}
                    onValueChange={(value) => setSimilarityThreshold(value[0])}
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Layout</h3>
                  <Select value={layout} onValueChange={setLayout}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select layout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="force-directed">Force-Directed</SelectItem>
                      <SelectItem value="concentric">Concentric</SelectItem>
                      <SelectItem value="circle">Circle</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="hierarchy">Hierarchical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {focusedNode && (
                  <div className="space-y-2 pt-2 border-t">
                    <h3 className="text-sm font-medium">Focused Node</h3>
                    <div className="text-sm p-2 bg-muted rounded">
                      {focusedNode}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setFocusedNode(null)}
                    >
                      Clear Focus
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                  <span className="text-sm">Note</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-sm">Concept</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-amber-500 mr-2"></div>
                  <span className="text-sm">Folder</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-purple-500 mr-2"></div>
                  <span className="text-sm">Tag</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graph visualization */}
          <div className="rounded-lg border bg-card h-full overflow-hidden">
            <GraphVisualization
              threshold={similarityThreshold}
              layout={layout}
              searchTerm={searchTerm}
              graphType={graphType as 'knowledge' | 'folder'}
              focusedNode={focusedNode}
              onNodeSelect={setFocusedNode}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default GraphRoute;
