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
    let draggingNode = null;
    let dragOffset = { x: 0, y: 0 };

    let algorithmRunning = false;
    let algorithmStep = 0;
    let configuredStartNode = null;
    let mstNodes = new Set();
    let mstEdges = [];
    let candidateEdges = [];
    let currentNode = null;
    let totalMSTWeight = 0;
    let autoRunInterval = null;
    let historyLog = [];
    let mstViewOnly = false;

    const statusText = document.getElementById('statusText');
    const stepExplanationEl = document.getElementById('stepExplanation');
    const mstStatsEl = document.getElementById('mstStats');
    const healthIndicatorEl = document.getElementById('healthIndicator');
    const workspaceNarrationEl = document.getElementById('workspaceNarration');
    const heroNodeCount = document.getElementById('heroNodeCount');
    const heroEdgeCount = document.getElementById('heroEdgeCount');
    const heroWeight = document.getElementById('heroWeight');
    const heroStatus = document.getElementById('heroStatus');
    const mstViewToggle = document.getElementById('mstViewToggle');
    const themeToggle = document.getElementById('themeToggle');

    class Node {
        constructor(x, y, id, label) {
            this.x = x;
            this.y = y;
            this.id = id;
            this.label = label || String.fromCharCode(65 + id);
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
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 4;
            } else if (state === 'current') {
                ctx.fillStyle = '#fde047';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 4;
            } else if (state === 'selected') {
                ctx.fillStyle = '#e0e0e0';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 4;
            } else if (state === 'hovered') {
                ctx.fillStyle = '#f5f5f5';
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 3;
            } else {
                ctx.fillStyle = '#fff';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
            }
            ctx.fill();
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
            const { x: x1, y: y1 } = this.node1;
            const { x: x2, y: y2 } = this.node2;

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
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 2;
            }
            ctx.stroke();

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            ctx.fillStyle = '#020617';
            ctx.fillRect(midX - 16, midY - 12, 32, 24);
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1;
            ctx.strokeRect(midX - 16, midY - 12, 32, 24);

            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 12px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.weight, midX, midY);
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const edgesToRender = mstViewOnly ? mstEdges : edges;
        edgesToRender.forEach(edge => {
            let state = 'normal';
            if (mstEdges.includes(edge)) {
                state = 'mst';
            } else if (!mstViewOnly && candidateEdges.includes(edge)) {
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

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    canvas.addEventListener('mousedown', (e) => {
        const { x, y } = getCanvasCoordinates(e);
        const clickedNode = findNodeAt(x, y);

        if (mode === 'addNode') {
            if (!clickedNode) {
                const node = new Node(x, y, nodeIdCounter++);
                nodes.push(node);
                handleGraphStructureChange(`Node ${node.label} added.`);
            }
            return;
        }

        if (mode === 'addEdge') {
            if (clickedNode) {
                toggleSelectedNode(clickedNode);
                if (selectedNodes.length === 2) {
                    const weight = prompt('Enter edge weight:', '10');
                    if (weight !== null && !isNaN(weight) && Number(weight) > 0) {
                        const parsedWeight = parseInt(weight, 10);
                        if (edgeExists(selectedNodes[0], selectedNodes[1])) {
                            setStatus('Edge already exists between those nodes.');
                        } else {
                            const edge = new Edge(selectedNodes[0], selectedNodes[1], parsedWeight);
                            edges.push(edge);
                            handleGraphStructureChange(`Edge added: ${selectedNodes[0].label}-${selectedNodes[1].label} (w=${parsedWeight}).`);
                        }
                    }
                    selectedNodes = [];
                    mode = 'view';
                    updateButtonStates();
                } else if (selectedNodes.length === 1) {
                    setStatus(`Select second node for edge (first: ${selectedNodes[0].label}).`);
                }
            }
            draw();
            return;
        }

        if (mode === 'delete') {
            if (clickedNode) {
                nodes = nodes.filter(n => n !== clickedNode);
                edges = edges.filter(e => e.node1 !== clickedNode && e.node2 !== clickedNode);
                handleGraphStructureChange(`Node ${clickedNode.label} removed.`);
            }
            return;
        }

        if (mode === 'view' && clickedNode) {
            draggingNode = clickedNode;
            dragOffset = { x: x - clickedNode.x, y: y - clickedNode.y };
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const { x, y } = getCanvasCoordinates(e);
        if (draggingNode) {
            draggingNode.x = clamp(x - dragOffset.x, draggingNode.radius, canvas.width - draggingNode.radius);
            draggingNode.y = clamp(y - dragOffset.y, draggingNode.radius, canvas.height - draggingNode.radius);
            draw();
            return;
        }
        const node = findNodeAt(x, y);
        if (node !== hoveredNode) {
            hoveredNode = node;
            draw();
        }
    });

    canvas.addEventListener('mouseup', () => {
        if (draggingNode) {
            draggingNode = null;
            updateAdjacencyList();
        }
    });

    canvas.addEventListener('mouseleave', () => {
        draggingNode = null;
        hoveredNode = null;
        draw();
    });

    canvas.addEventListener('dblclick', (e) => {
        const { x, y } = getCanvasCoordinates(e);
        const targetNode = findNodeAt(x, y);
        if (targetNode && mode === 'view') {
            const newLabel = prompt('Rename node', targetNode.label);
            if (newLabel && newLabel.trim().length > 0) {
                const trimmed = newLabel.trim().slice(0, 3);
                targetNode.label = trimmed;
                handleGraphStructureChange(`Node renamed to ${trimmed}.`);
            }
        }
    });

    function getCanvasCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    function toggleSelectedNode(node) {
        if (selectedNodes.includes(node)) {
            selectedNodes = selectedNodes.filter(n => n !== node);
        } else {
            selectedNodes.push(node);
        }
    }

    document.getElementById('addNodeBtn').addEventListener('click', () => {
        mode = 'addNode';
        selectedNodes = [];
        setStatus('Click anywhere on the canvas to add a node.');
        updateButtonStates();
    });

    document.getElementById('addEdgeBtn').addEventListener('click', () => {
        mode = 'addEdge';
        selectedNodes = [];
        setStatus('Select two nodes to connect with an edge.');
        updateButtonStates();
    });

    document.getElementById('deleteBtn').addEventListener('click', () => {
        mode = 'delete';
        selectedNodes = [];
        setStatus('Click a node to delete it and its edges.');
        updateButtonStates();
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('Clear all nodes and edges?')) {
            nodes = [];
            edges = [];
            nodeIdCounter = 0;
            handleGraphStructureChange('Canvas cleared.');
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
            document.getElementById('autoBtn').textContent = 'Auto run';
            return;
        }
        const speed = parseInt(document.getElementById('speedSlider').value, 10);
        autoRunInterval = setInterval(() => {
            if (!stepPrims()) {
                clearInterval(autoRunInterval);
                autoRunInterval = null;
                document.getElementById('autoBtn').textContent = 'Auto run';
            }
        }, speed);
        document.getElementById('autoBtn').textContent = 'Pause';
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        resetAlgorithm();
        setStatus('Algorithm reset. Ready for another run.');
    });

    document.getElementById('speedSlider').addEventListener('input', (e) => {
        document.getElementById('speedLabel').textContent = `${e.target.value}ms`;
        if (autoRunInterval) {
            clearInterval(autoRunInterval);
            const speed = parseInt(e.target.value, 10);
            autoRunInterval = setInterval(() => {
                if (!stepPrims()) {
                    clearInterval(autoRunInterval);
                    autoRunInterval = null;
                    document.getElementById('autoBtn').textContent = 'Auto run';
                }
            }, speed);
        }
    });

    document.getElementById('randomNodeCount').addEventListener('input', (e) => {
        document.getElementById('randomNodeCountLabel').textContent = `${e.target.value} nodes`;
    });

    document.getElementById('randomDensity').addEventListener('input', (e) => {
        const pct = Math.round(parseFloat(e.target.value) * 100);
        document.getElementById('randomDensityLabel').textContent = `${pct}% of possible edges`;
    });

    document.getElementById('randomBtn').addEventListener('click', () => {
        const count = parseInt(document.getElementById('randomNodeCount').value, 10);
        const density = parseFloat(document.getElementById('randomDensity').value);
        generateRandomGraph(count, density);
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
        exportGraph();
    });

    document.getElementById('importBtn').addEventListener('click', () => {
        importGraph();
    });

    document.getElementById('copyExportBtn').addEventListener('click', async () => {
        const textarea = document.getElementById('graphData');
        if (!textarea.value) {
            setStatus('Nothing to copy. Export first.');
            return;
        }
        try {
            await navigator.clipboard.writeText(textarea.value);
            setStatus('Graph JSON copied to clipboard.');
        } catch (err) {
            textarea.select();
            document.execCommand('copy');
            setStatus('Graph JSON copied via fallback.');
        }
    });

    function initializePrims() {
        resetAlgorithm();
        configuredStartNode = getSelectedStartNode();
        if (!configuredStartNode) {
            alert('Select a start node before running Prim\'s algorithm.');
            return;
        }
        algorithmRunning = true;
        algorithmStep = 0;
        highlightCodeLine(0);
        setStepExplanation('Initializing Prim\'s algorithm. MST is empty.');
        document.getElementById('stepBtn').disabled = false;
        document.getElementById('autoBtn').disabled = false;
        document.getElementById('startBtn').disabled = true;
        setStatus(`Prim\'s initialized from node ${configuredStartNode.label}. Step through or auto run.`);
        previewNextStep('Next: choose the starting node to seed the MST.');
        draw();
    }

    function stepPrims() {
        if (!algorithmRunning) return false;

        if (algorithmStep === 0) {
            currentNode = configuredStartNode || nodes[0];
            algorithmStep = 1;
            highlightCodeLine(1);
            setStepExplanation(`Selected starting node: ${currentNode.label}`);
            previewNextStep(`Next: add ${currentNode.label} to the MST.`);
            draw();
            return true;
        }

        if (algorithmStep === 1) {
            mstNodes.add(currentNode);
            algorithmStep = 2;
            highlightCodeLine(2);
            setStepExplanation(`Added node ${currentNode.label} to MST. MST now has ${mstNodes.size} node(s).`);
            updateMSTStats();
            previewNextStep('Next: check whether all nodes are already in the MST.');
            draw();
            return true;
        }

        if (algorithmStep === 2) {
            if (mstNodes.size === nodes.length) {
                algorithmStep = 11;
                highlightCodeLine(11);
                setStepExplanation('MST is complete! All nodes are connected.');
                currentNode = null;
                candidateEdges = [];
                algorithmRunning = false;
                document.getElementById('stepBtn').disabled = true;
                document.getElementById('autoBtn').disabled = true;
                document.getElementById('autoBtn').textContent = 'Auto run';
                toggleMSTOnlyAvailability(true);
                updateMSTStats();
                refreshCandidateQueue();
                previewNextStep('Process complete. No further steps.');
                draw();
                return false;
            }
            algorithmStep = 3;
            highlightCodeLine(3);
            setStepExplanation(`MST has ${mstNodes.size}/${nodes.length} nodes. Continuing loop.`);
            previewNextStep('Next: gather candidate edges along the frontier.');
            draw();
            return true;
        }

        if (algorithmStep === 3) {
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
            setStepExplanation(`Found ${candidateEdges.length} candidate edge(s) spanning the frontier.`);
            refreshCandidateQueue();
            previewNextStep('Next: choose the cheapest frontier edge.');
            draw();
            return true;
        }

        if (algorithmStep === 4) {
            if (candidateEdges.length === 0) {
                setStepExplanation('No edges bridge the frontier. Graph is disconnected.');
                algorithmRunning = false;
                document.getElementById('stepBtn').disabled = true;
                document.getElementById('autoBtn').disabled = true;
                document.getElementById('autoBtn').textContent = 'Auto run';
                previewNextStep('Cannot continue without connecting edges.');
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
            setStepExplanation(`Cheapest edge ${oldNode.label}-${newNode.label} (w=${minEdge.weight}) selected.`);
            currentNode = newNode;
            candidateEdges = [minEdge];
            refreshCandidateQueue();
            previewNextStep(`Next: add node ${newNode.label} into the MST.`);
            draw();
            return true;
        }

        if (algorithmStep === 5) {
            const newNode = currentNode;
            mstNodes.add(newNode);
            algorithmStep = 6;
            highlightCodeLine(8);
            setStepExplanation(`Added node ${newNode.label} to MST.`);
            previewNextStep('Next: lock the selected edge into the MST.');
            draw();
            return true;
        }

        if (algorithmStep === 6) {
            const minEdge = candidateEdges[0];
            mstEdges.push(minEdge);
            totalMSTWeight += minEdge.weight;
            algorithmStep = 7;
            highlightCodeLine(9);
            setStepExplanation(`Edge committed. Total MST weight now ${totalMSTWeight}.`);
            updateMSTStats();
            previewNextStep('Next: return to the loop condition.');
            draw();
            return true;
        }

        if (algorithmStep === 7) {
            candidateEdges = [];
            algorithmStep = 2;
            highlightCodeLine(10);
            setStepExplanation('Returning to loop condition check.');
            refreshCandidateQueue();
            previewNextStep('Next: evaluate whether the MST is complete.');
            draw();
            return true;
        }

        return false;
    }

    function resetAlgorithm() {
        algorithmRunning = false;
        algorithmStep = 0;
        configuredStartNode = null;
        mstNodes.clear();
        mstEdges = [];
        candidateEdges = [];
        currentNode = null;
        totalMSTWeight = 0;
        if (autoRunInterval) {
            clearInterval(autoRunInterval);
            autoRunInterval = null;
        }
        historyLog = [];
        renderHistory();
        document.querySelectorAll('.code-line').forEach(line => line.classList.remove('active'));
        document.getElementById('stepBtn').disabled = true;
        document.getElementById('autoBtn').disabled = true;
        document.getElementById('autoBtn').textContent = 'Auto run';
        document.getElementById('startBtn').disabled = false;
        setStepExplanation('Click "Start Prim\'s" to begin visualization.');
        previewNextStep('Next: initialize Prim\'s when you press start.');
        updateMSTStats();
        refreshCandidateQueue();
        draw();
    }

    function loadSampleGraph() {
        nodes = [];
        edges = [];
        nodeIdCounter = 0;

        const positions = [
            { x: 150, y: 100 },
            { x: 350, y: 100 },
            { x: 550, y: 100 },
            { x: 150, y: 250 },
            { x: 350, y: 250 },
            { x: 550, y: 250 },
            { x: 250, y: 420 },
            { x: 450, y: 420 }
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

        handleGraphStructureChange('Sample graph loaded! Click "Start Prim\'s" to visualize.');
    }

    function generateRandomGraph(count, density) {
        nodes = [];
        edges = [];
        nodeIdCounter = 0;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) / 2.4;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const jitterX = (Math.random() - 0.5) * 50;
            const jitterY = (Math.random() - 0.5) * 50;
            const x = centerX + Math.cos(angle) * radius + jitterX;
            const y = centerY + Math.sin(angle) * radius + jitterY;
            nodes.push(new Node(x, y, nodeIdCounter++));
        }

        const potentialEdges = [];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                potentialEdges.push([nodes[i], nodes[j]]);
            }
        }

        shuffleArray(potentialEdges);
        const desiredEdges = Math.max(nodes.length - 1, Math.round(density * potentialEdges.length));

        for (let i = 1; i < nodes.length; i++) {
            const prev = nodes[i - 1];
            const curr = nodes[i];
            if (!edgeExists(prev, curr)) {
                const weight = Math.floor(Math.random() * 19) + 1;
                edges.push(new Edge(prev, curr, weight));
            }
        }

        let index = 0;
        while (edges.length < desiredEdges && index < potentialEdges.length) {
            const [nodeA, nodeB] = potentialEdges[index++];
            if (edgeExists(nodeA, nodeB)) continue;
            const weight = Math.floor(Math.random() * 19) + 1;
            edges.push(new Edge(nodeA, nodeB, weight));
        }

        handleGraphStructureChange('Random, connected graph generated.');
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    function exportGraph() {
        const data = {
            nodes: nodes.map(node => ({ id: node.id, label: node.label, x: node.x, y: node.y })),
            edges: edges.map(edge => ({ source: edge.node1.id, target: edge.node2.id, weight: edge.weight }))
        };
        const textarea = document.getElementById('graphData');
        textarea.value = JSON.stringify(data, null, 2);
        setStatus('Graph exported to JSON textarea.');
    }

    function importGraph() {
        try {
            const textarea = document.getElementById('graphData');
            const parsed = JSON.parse(textarea.value);
            if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
                throw new Error('Invalid structure');
            }
            nodes = parsed.nodes.map(node => new Node(node.x, node.y, node.id, node.label));
            nodeIdCounter = nodes.length ? Math.max(...nodes.map(n => n.id)) + 1 : 0;
            const nodeMap = new Map(nodes.map(node => [node.id, node]));
            edges = [];
            parsed.edges.forEach(edge => {
                const node1 = nodeMap.get(edge.source);
                const node2 = nodeMap.get(edge.target);
                if (node1 && node2) {
                    edges.push(new Edge(node1, node2, edge.weight || 1));
                }
            });
            handleGraphStructureChange('Graph imported from JSON.');
        } catch (error) {
            alert('Unable to import graph. Please provide valid JSON.');
        }
    }

    function edgeExists(nodeA, nodeB) {
        return edges.some(edge => (edge.node1 === nodeA && edge.node2 === nodeB) || (edge.node1 === nodeB && edge.node2 === nodeA));
    }

    function setStatus(text) {
        if (statusText) {
            statusText.textContent = text;
        }
        if (heroStatus) {
            heroStatus.textContent = text;
        }
    }

    function toggleMSTOnlyAvailability(available) {
        if (!mstViewToggle) return;
        mstViewOnly = false;
        mstViewToggle.classList.toggle('hidden', !available);
        mstViewToggle.disabled = !available;
        mstViewToggle.textContent = 'Show MST only';
    }

    let narrationState = {
        prev: 'Previous step will appear here.',
        current: 'Awaiting instructions...',
        next: 'Next hint shows up here.'
    };

    updateNarrationDisplay();
    function updateNarrationDisplay() {
        if (!workspaceNarrationEl) return;
        const prevEl = workspaceNarrationEl.querySelector('[data-role="prev"]');
        const currentEl = workspaceNarrationEl.querySelector('[data-role="current"]');
        const nextEl = workspaceNarrationEl.querySelector('[data-role="next"]');
        if (prevEl) prevEl.textContent = narrationState.prev;
        if (currentEl) currentEl.textContent = narrationState.current;
        if (nextEl) nextEl.textContent = narrationState.next;
    }

    function setStepExplanation(text) {
        if (stepExplanationEl) {
            stepExplanationEl.textContent = text;
        }
        narrationState = {
            prev: narrationState.current,
            current: text,
            next: narrationState.next
        };
        updateNarrationDisplay();
        logHistory(text);
    }

    function previewNextStep(text) {
        narrationState = {
            ...narrationState,
            next: text
        };
        updateNarrationDisplay();
    }

    function logHistory(entry) {
        if (!entry) return;
        historyLog.unshift(entry);
        if (historyLog.length > 14) {
            historyLog.pop();
        }
        renderHistory();
    }

    function renderHistory() {
        const list = document.getElementById('historyList');
        if (!list) return;
        list.innerHTML = '';
        if (historyLog.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No steps yet.';
            list.appendChild(li);
            return;
        }
        historyLog.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            list.appendChild(li);
        });
    }

    function updateMSTStats() {
        if (mstStatsEl) {
            mstStatsEl.textContent = `Total Weight: ${totalMSTWeight} | Edges: ${mstEdges.length} | Nodes in MST: ${mstNodes.size}/${nodes.length}`;
        }
        if (heroWeight) {
            heroWeight.textContent = totalMSTWeight;
        }
        renderMSTEdges();
    }

    function renderMSTEdges() {
        const list = document.getElementById('mstEdgeList');
        if (!list) return;
        list.innerHTML = '';
        if (mstEdges.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No edges yet.';
            list.appendChild(li);
            return;
        }
        mstEdges.forEach(edge => {
            const li = document.createElement('li');
            li.textContent = `${edge.node1.label} – ${edge.node2.label} (w=${edge.weight})`;
            list.appendChild(li);
        });
    }

    function refreshCandidateQueue() {
        const list = document.getElementById('candidateList');
        if (!list) return;
        list.innerHTML = '';
        if (candidateEdges.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Queue empty.';
            list.appendChild(li);
            return;
        }
        const sorted = [...candidateEdges].sort((a, b) => a.weight - b.weight);
        sorted.forEach(edge => {
            const li = document.createElement('li');
            li.textContent = `${edge.node1.label} – ${edge.node2.label} (w=${edge.weight})`;
            list.appendChild(li);
        });
    }

    function updateAdjacencyList() {
        const list = document.getElementById('adjacencyList');
        if (!list) return;
        list.innerHTML = '';
        if (nodes.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No nodes defined.';
            list.appendChild(li);
            return;
        }
        nodes.forEach(node => {
            const neighbors = [];
            edges.forEach(edge => {
                if (edge.node1 === node) {
                    neighbors.push(`${edge.node2.label} (${edge.weight})`);
                } else if (edge.node2 === node) {
                    neighbors.push(`${edge.node1.label} (${edge.weight})`);
                }
            });
            neighbors.sort();
            const li = document.createElement('li');
            li.textContent = `${node.label} → ${neighbors.length ? neighbors.join(', ') : '∅'}`;
            list.appendChild(li);
        });
        updateHeroStats();
    }

    function updateHeroStats() {
        if (heroNodeCount) {
            heroNodeCount.textContent = nodes.length;
        }
        if (heroEdgeCount) {
            heroEdgeCount.textContent = edges.length;
        }
    }

    function updateHealthIndicator() {
        if (!healthIndicatorEl) return;
        const { text, state } = analyzeGraph();
        healthIndicatorEl.textContent = text;
        healthIndicatorEl.classList.remove('state-good', 'state-bad', 'state-idle');
        if (state) {
            healthIndicatorEl.classList.add(`state-${state}`);
        }
    }

    function analyzeGraph() {
        if (nodes.length === 0) {
            return { text: 'No nodes yet.', state: 'idle' };
        }
        if (nodes.length === 1) {
            return { text: 'Single node is trivially connected.', state: 'good' };
        }
        if (edges.length === 0) {
            return { text: 'Graph disconnected. Add edges.', state: 'bad' };
        }
        const visited = new Set();
        const queue = [nodes[0]];
        visited.add(nodes[0]);

        while (queue.length > 0) {
            const node = queue.shift();
            edges.forEach(edge => {
                if (edge.node1 === node && !visited.has(edge.node2)) {
                    visited.add(edge.node2);
                    queue.push(edge.node2);
                } else if (edge.node2 === node && !visited.has(edge.node1)) {
                    visited.add(edge.node1);
                    queue.push(edge.node1);
                }
            });
        }

        if (visited.size === nodes.length) {
            return { text: 'Connected graph ✓ ready for Prim\'s.', state: 'good' };
        }
        return { text: `Graph disconnected: ${nodes.length - visited.size} node(s) unreachable.`, state: 'bad' };
    }

    function updateStartNodeOptions() {
        const select = document.getElementById('startNodeSelect');
        if (!select) return;
        const previousValue = select.value;
        select.innerHTML = '';
        if (nodes.length === 0) {
            const option = document.createElement('option');
            option.textContent = 'Add nodes to choose';
            option.disabled = true;
            option.selected = true;
            select.appendChild(option);
            return;
        }
        nodes.forEach(node => {
            const option = document.createElement('option');
            option.value = String(node.id);
            option.textContent = `${node.label} (id ${node.id})`;
            select.appendChild(option);
        });
        const stillExists = nodes.find(node => String(node.id) === previousValue);
        select.value = stillExists ? previousValue : String(nodes[0].id);
    }

    function getSelectedStartNode() {
        const select = document.getElementById('startNodeSelect');
        if (!select || nodes.length === 0) {
            return null;
        }
        const selected = nodes.find(node => String(node.id) === select.value);
        return selected || nodes[0];
    }

    function updateButtonStates() {
        const buttons = ['addNodeBtn', 'addEdgeBtn', 'deleteBtn'];
        buttons.forEach(id => {
            const button = document.getElementById(id);
            if (!button) return;
            button.classList.remove('mode-active');
            if ((mode === 'addNode' && id === 'addNodeBtn') ||
                (mode === 'addEdge' && id === 'addEdgeBtn') ||
                (mode === 'delete' && id === 'deleteBtn')) {
                button.classList.add('mode-active');
            }
        });
    }

    function handleGraphStructureChange(message) {
        resetAlgorithm();
        updateStartNodeOptions();
        updateAdjacencyList();
        updateHealthIndicator();
        mode = 'view';
        selectedNodes = [];
        updateButtonStates();
        setStatus(message);
        draw();
    }

    function highlightCodeLine(step) {
        document.querySelectorAll('.code-line').forEach(line => {
            line.classList.remove('active');
        });
        const lines = document.querySelectorAll(`.code-line[data-step="${step}"]`);
        lines.forEach(line => line.classList.add('active'));
    }

    if (mstViewToggle) {
        mstViewToggle.addEventListener('click', () => {
            mstViewOnly = !mstViewOnly;
            mstViewToggle.textContent = mstViewOnly ? 'Show all edges' : 'Show MST only';
            draw();
        });
        toggleMSTOnlyAvailability(false);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            themeToggle.textContent = document.body.classList.contains('dark-mode') ? 'Light mode' : 'Dark mode';
        });
        themeToggle.textContent = document.body.classList.contains('dark-mode') ? 'Light mode' : 'Dark mode';
    }

    const randomNodeSlider = document.getElementById('randomNodeCount');
    if (randomNodeSlider) {
        const label = document.getElementById('randomNodeCountLabel');
        label.textContent = `${randomNodeSlider.value} nodes`;
    }
    const randomDensitySlider = document.getElementById('randomDensity');
    if (randomDensitySlider) {
        const label = document.getElementById('randomDensityLabel');
        const pct = Math.round(parseFloat(randomDensitySlider.value) * 100);
        label.textContent = `${pct}% of possible edges`;
    }
    const speedSlider = document.getElementById('speedSlider');
    if (speedSlider) {
        document.getElementById('speedLabel').textContent = `${speedSlider.value}ms`;
    }

    setStatus('Welcome! Load the sample graph or start drawing.');
    updateStartNodeOptions();
    updateAdjacencyList();
    updateHealthIndicator();
    updateHeroStats();
    renderHistory();
    updateButtonStates();
    draw();
});
