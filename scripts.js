document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        return;
    }
    const ctx = canvas.getContext('2d');
    let nodes = [];
    let edges = [];
    let nodeIdCounter = 0;
    let mode = 'view';
    let selectedNodes = [];
    let hoveredNode = null;
    let algorithmRunning = false;
    let algorithmStep = 0;
    let mstNodes = new Set();
    let mstEdges = [];
    let candidateEdges = [];
    let currentNode = null;
    let totalMSTWeight = 0;
    let autoRunInterval = null;

    class Node {
        constructor(x, y, id) {
            this.x = x;
            this.y = y;
            this.id = id;
            this.label = String.fromCharCode(65 + id);
            this.radius = 25;
        }
        contains(x, y) {
            const dx = x - this.x;
            const dy = y - this.y;
            return dx * dx + dy * dy <= this.radius * this.radius;
        }
        draw(ctx, state = 'normal') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            if (state === 'mst') {
                ctx.fillStyle = '#86efac';
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 4;
            } else if (state === 'current') {
                ctx.fillStyle = '#fde047';
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 4;
            } else if (state === 'selected') {
                ctx.fillStyle = '#e0e0e0';
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 4;
            } else if (state === 'hovered') {
                ctx.fillStyle = '#f5f5f5';
                ctx.fill();
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 3;
            } else {
                ctx.fillStyle = '#fff';
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
            }
            ctx.stroke();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 16px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.label, this.x, this.y);
        }
    }

    class Edge {
        constructor(node1, node2, weight) {
            this.node1 = node1;
            this.node2 = node2;
            this.weight = weight;
        }
        draw(ctx, state = 'normal') {
            const x1 = this.node1.x;
            const y1 = this.node1.y;
            const x2 = this.node2.x;
            const y2 = this.node2.y;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            if (state === 'mst') {
                ctx.strokeStyle = '#16a34a';
                ctx.lineWidth = 4;
            } else if (state === 'candidate') {
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = 3;
            } else {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
            }
            ctx.stroke();
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            ctx.fillStyle = '#fff';
            ctx.fillRect(midX - 15, midY - 12, 30, 24);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.strokeRect(midX - 15, midY - 12, 30, 24);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.weight, midX, midY);
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        edges.forEach(edge => {
            let state = 'normal';
            if (mstEdges.includes(edge)) {
                state = 'mst';
            } else if (candidateEdges.includes(edge)) {
                state = 'candidate';
            }
            edge.draw(ctx, state);
        });
        nodes.forEach(node => {
            let state = 'normal';
            if (node === currentNode) {
                state = 'current';
            } else if (mstNodes.has(node)) {
                state = 'mst';
            } else if (selectedNodes.includes(node)) {
                state = 'selected';
            } else if (node === hoveredNode) {
                state = 'hovered';
            }
            node.draw(ctx, state);
        });
    }

    function findNodeAt(x, y) {
        for (let i = nodes.length - 1; i >= 0; i--) {
            if (nodes[i].contains(x, y)) {
                return nodes[i];
            }
        }
        return null;
    }

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const clickedNode = findNodeAt(x, y);
        if (mode === 'addNode') {
            if (!clickedNode) {
                const node = new Node(x, y, nodeIdCounter++);
                nodes.push(node);
                setStatus(`Node ${node.label} added`);
                draw();
            }
        } else if (mode === 'addEdge') {
            if (clickedNode) {
                if (selectedNodes.includes(clickedNode)) {
                    selectedNodes = selectedNodes.filter(n => n !== clickedNode);
                } else {
                    selectedNodes.push(clickedNode);
                }
                if (selectedNodes.length === 2) {
                    const weight = prompt('Enter edge weight:', '10');
                    if (weight !== null && !isNaN(weight) && weight > 0) {
                        const edge = new Edge(selectedNodes[0], selectedNodes[1], parseInt(weight));
                        edges.push(edge);
                        setStatus(`Edge added: ${selectedNodes[0].label}-${selectedNodes[1].label} (weight: ${weight})`);
                    }
                    selectedNodes = [];
                    mode = 'view';
                    updateButtonStates();
                } else if (selectedNodes.length === 1) {
                    setStatus(`Select second node for edge (first: ${selectedNodes[0].label})`);
                }
                draw();
            }
        } else if (mode === 'delete') {
            if (clickedNode) {
                nodes = nodes.filter(n => n !== clickedNode);
                edges = edges.filter(e => e.node1 !== clickedNode && e.node2 !== clickedNode);
                setStatus(`Node ${clickedNode.label} deleted`);
                draw();
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const node = findNodeAt(x, y);
        if (node !== hoveredNode) {
            hoveredNode = node;
            draw();
        }
    });

    document.getElementById('addNodeBtn').addEventListener('click', () => {
        mode = 'addNode';
        selectedNodes = [];
        setStatus('Click on canvas to add a node');
        updateButtonStates();
    });

    document.getElementById('addEdgeBtn').addEventListener('click', () => {
        mode = 'addEdge';
        selectedNodes = [];
        setStatus('Select two nodes to connect with an edge');
        updateButtonStates();
    });

    document.getElementById('deleteBtn').addEventListener('click', () => {
        mode = 'delete';
        selectedNodes = [];
        setStatus('Click on a node to delete it');
        updateButtonStates();
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('Clear all nodes and edges?')) {
            nodes = [];
            edges = [];
            nodeIdCounter = 0;
            resetAlgorithm();
            draw();
            setStatus('Canvas cleared');
        }
    });

    document.getElementById('loadSampleBtn').addEventListener('click', () => {
        loadSampleGraph();
    });

    document.getElementById('startBtn').addEventListener('click', () => {
        if (nodes.length === 0) {
            alert('Please add some nodes first!');
            return;
        }
        initializePrims();
    });

    document.getElementById('stepBtn').addEventListener('click', () => {
        stepPrims();
    });

    document.getElementById('autoBtn').addEventListener('click', () => {
        if (autoRunInterval) {
            clearInterval(autoRunInterval);
            autoRunInterval = null;
            document.getElementById('autoBtn').textContent = 'Auto Run';
        } else {
            const speed = parseInt(document.getElementById('speedSlider').value);
            autoRunInterval = setInterval(() => {
                if (!stepPrims()) {
                    clearInterval(autoRunInterval);
                    autoRunInterval = null;
                    document.getElementById('autoBtn').textContent = 'Auto Run';
                }
            }, speed);
            document.getElementById('autoBtn').textContent = 'Pause';
        }
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        resetAlgorithm();
    });

    document.getElementById('speedSlider').addEventListener('input', (e) => {
        document.getElementById('speedLabel').textContent = e.target.value + 'ms';
        if (autoRunInterval) {
            clearInterval(autoRunInterval);
            const speed = parseInt(e.target.value);
            autoRunInterval = setInterval(() => {
                if (!stepPrims()) {
                    clearInterval(autoRunInterval);
                    autoRunInterval = null;
                    document.getElementById('autoBtn').textContent = 'Auto Run';
                }
            }, speed);
        }
    });

    function initializePrims() {
        resetAlgorithm();
        algorithmRunning = true;
        algorithmStep = 0;
        highlightCodeLine(0);
        setStepExplanation('Initializing Prim\'s algorithm. MST is empty.');
        document.getElementById('stepBtn').disabled = false;
        document.getElementById('autoBtn').disabled = false;
        document.getElementById('startBtn').disabled = true;
        draw();
    }

    function stepPrims() {
        if (!algorithmRunning) return false;
        if (algorithmStep === 0) {
            currentNode = nodes[0];
            algorithmStep = 1;
            highlightCodeLine(1);
            setStepExplanation(`Selected starting node: ${currentNode.label}`);
            draw();
            return true;
        } else if (algorithmStep === 1) {
            mstNodes.add(currentNode);
            algorithmStep = 2;
            highlightCodeLine(2);
            setStepExplanation(`Added node ${currentNode.label} to MST. MST now has ${mstNodes.size} node(s).`);
            updateMSTStats();
            draw();
            return true;
        } else if (algorithmStep === 2) {
            if (mstNodes.size === nodes.length) {
                algorithmStep = 11;
                highlightCodeLine(11);
                setStepExplanation('MST is complete! All nodes have been added.');
                currentNode = null;
                candidateEdges = [];
                algorithmRunning = false;
                document.getElementById('stepBtn').disabled = true;
                document.getElementById('autoBtn').disabled = true;
                draw();
                return false;
            }
            algorithmStep = 3;
            highlightCodeLine(3);
            setStepExplanation(`MST has ${mstNodes.size} nodes. Need ${nodes.length} total. Continue loop.`);
            draw();
            return true;
        } else if (algorithmStep === 3) {
            candidateEdges = [];
            edges.forEach(edge => {
                const node1InMST = mstNodes.has(edge.node1);
                const node2InMST = mstNodes.has(edge.node2);
                if (node1InMST !== node2InMST && !mstEdges.includes(edge)) {
                    candidateEdges.push(edge);
                }
            });
            algorithmStep = 4;
            highlightCodeLine(4);
            highlightCodeLine(5);
            highlightCodeLine(6);
            setStepExplanation(`Finding minimum edge where one node is in MST and one is not. Found ${candidateEdges.length} candidate edge(s).`);
            draw();
            return true;
        } else if (algorithmStep === 4) {
            if (candidateEdges.length === 0) {
                setStepExplanation('No more edges available. Graph may be disconnected!');
                algorithmRunning = false;
                return false;
            }
            let minEdge = candidateEdges[0];
            candidateEdges.forEach(edge => {
                if (edge.weight < minEdge.weight) {
                    minEdge = edge;
                }
            });
            const newNode = mstNodes.has(minEdge.node1) ? minEdge.node2 : minEdge.node1;
            const oldNode = mstNodes.has(minEdge.node1) ? minEdge.node1 : minEdge.node2;
            algorithmStep = 5;
            highlightCodeLine(7);
            setStepExplanation(`Minimum edge found: ${oldNode.label}-${newNode.label} (weight: ${minEdge.weight}). Will add node ${newNode.label} to MST.`);
            currentNode = newNode;
            candidateEdges = [minEdge];
            draw();
            return true;
        } else if (algorithmStep === 5) {
            const minEdge = candidateEdges[0];
            const newNode = currentNode;
            mstNodes.add(newNode);
            algorithmStep = 6;
            highlightCodeLine(8);
            setStepExplanation(`Added node ${newNode.label} to MST. MST now has ${mstNodes.size} node(s).`);
            draw();
            return true;
        } else if (algorithmStep === 6) {
            const minEdge = candidateEdges[0];
            mstEdges.push(minEdge);
            totalMSTWeight += minEdge.weight;
            algorithmStep = 7;
            highlightCodeLine(9);
            setStepExplanation(`Added edge to MST. Total MST weight: ${totalMSTWeight}`);
            updateMSTStats();
            draw();
            return true;
        } else if (algorithmStep === 7) {
            candidateEdges = [];
            algorithmStep = 2;
            highlightCodeLine(10);
            setStepExplanation('Returning to check loop condition...');
            draw();
            return true;
        }
        return false;
    }

    function resetAlgorithm() {
        algorithmRunning = false;
        algorithmStep = 0;
        mstNodes.clear();
        mstEdges = [];
        candidateEdges = [];
        currentNode = null;
        totalMSTWeight = 0;
        if (autoRunInterval) {
            clearInterval(autoRunInterval);
            autoRunInterval = null;
        }
        document.querySelectorAll('.code-line').forEach(line => {
            line.classList.remove('active');
        });
        document.getElementById('stepBtn').disabled = true;
        document.getElementById('autoBtn').disabled = true;
        document.getElementById('autoBtn').textContent = 'Auto Run';
        document.getElementById('startBtn').disabled = false;
        setStepExplanation('Click "Start Prim\'s" to begin visualization');
        updateMSTStats();
        draw();
    }

    function loadSampleGraph() {
        nodes = [];
        edges = [];
        nodeIdCounter = 0;
        resetAlgorithm();
        const positions = [
            {x: 150, y: 100},
            {x: 350, y: 100},
            {x: 550, y: 100},
            {x: 150, y: 250},
            {x: 350, y: 250},
            {x: 550, y: 250},
            {x: 250, y: 400},
            {x: 450, y: 400}
        ];
        positions.forEach(pos => {
            nodes.push(new Node(pos.x, pos.y, nodeIdCounter++));
        });
        const edgeData = [
            [0, 1, 4], [0, 3, 2],
            [1, 2, 6], [1, 4, 5],
            [2, 5, 3],
            [3, 4, 1], [3, 6, 8],
            [4, 5, 7], [4, 6, 9], [4, 7, 2],
            [5, 7, 4],
            [6, 7, 3]
        ];
        edgeData.forEach(([i, j, w]) => {
            edges.push(new Edge(nodes[i], nodes[j], w));
        });
        setStatus('Sample graph loaded! Click "Start Prim\'s" to visualize the algorithm.');
        draw();
    }

    function setStatus(text) {
        document.getElementById('statusText').textContent = text;
    }

    function setStepExplanation(text) {
        document.getElementById('stepExplanation').textContent = text;
    }

    function updateMSTStats() {
        document.getElementById('mstStats').textContent =
            `Total Weight: ${totalMSTWeight} | Edges: ${mstEdges.length} | Nodes: ${mstNodes.size}`;
    }

    function highlightCodeLine(step) {
        document.querySelectorAll('.code-line').forEach(line => {
            line.classList.remove('active');
        });
        const lines = document.querySelectorAll(`.code-line[data-step="${step}"]`);
        lines.forEach(line => line.classList.add('active'));
    }

    function updateButtonStates() {
        const buttons = ['addNodeBtn', 'addEdgeBtn', 'deleteBtn'];
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            btn.classList.remove('bg-gray-800');
        });
        if (mode === 'addNode') {
            document.getElementById('addNodeBtn').classList.add('bg-gray-800');
        } else if (mode === 'addEdge') {
            document.getElementById('addEdgeBtn').classList.add('bg-gray-800');
        } else if (mode === 'delete') {
            document.getElementById('deleteBtn').classList.add('bg-gray-800');
        }
    }

    setStatus('Welcome! Click "Load Sample Graph" to see a demo, or build your own graph.');
    draw();
});
