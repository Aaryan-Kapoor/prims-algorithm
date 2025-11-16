# Prim's Algorithm Learning Resource

This project is a learning tool designed to help students understand Prim's algorithm for finding a Minimum Spanning Tree in a weighted graph. It includes a clear introduction to the problem Prim's algorithm solves, an overview of how the algorithm works, and an interactive visual demonstration that lets learners watch each step in action.

## What This Is

- A short lecture that explains the purpose of Minimum Spanning Trees and the intuition behind Prim's algorithm.
- A breakdown of the algorithm in plain language, focusing on how it builds a tree one edge at a time.
- A walkthrough of a sample graph to show how the algorithm chooses edges based on minimal weight.
- An interactive visual tool that lets learners build graphs, load sample graphs, and step through Prim's algorithm to see how the tree grows.

## What Prim's Algorithm Does

Prim's algorithm finds a Minimum Spanning Tree by starting from any single node and repeatedly attaching the lowest weight edge that connects a new node to the growing tree. It continues selecting the lightest edge that expands the tree until every node has been included.

This approach ensures that the total weight of all chosen edges is as small as possible while still connecting all vertices. It is a greedy method because it always takes the currently cheapest valid option, and it is guaranteed to produce an optimal spanning tree for any connected weighted graph.

## Why This Matters

Minimum Spanning Trees appear in many real world settings, such as network design, clustering, layout optimization, and reducing the cost of connecting multiple locations. Understanding Prim's algorithm helps students build intuition about greedy strategies and how they can lead to optimal solutions in certain structured problems.

This project provides an accessible way to learn these ideas by combining explanation, examples, and hands-on interaction.
