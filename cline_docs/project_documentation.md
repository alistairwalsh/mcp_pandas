# MCP Pandas Project Documentation

## Overview
The MCP Pandas project provides a Model Context Protocol (MCP) server that enables data analysis capabilities using pandas. The pandas functionality runs in a Docker container for isolation and portability, while the MCP server runs locally for better integration with the system.

## Architecture

### Components
1. **Python FastAPI Service (Containerized)**
   - Runs pandas operations in a containerized environment
   - Provides RESTful API endpoints for data analysis
   - Handles data processing and visualization
   - Built on Python 3.11 with pandas, numpy, and matplotlib

2. **MCP Server (Local)**
   - TypeScript implementation using MCP SDK
   - Interfaces with the Python service
   - Exposes pandas functionality as MCP tools
   - Handles data serialization and communication

### Infrastructure
- Docker container for pandas service
- Local TypeScript MCP server
- Shared volume for data persistence
- Network communication via HTTP

## Setup

### Prerequisites
- Docker and Docker Compose
- Node.js 20 or later
- Git

### Installation
1. Clone the repository
2. Install Node.js dependencies and build MCP server:
   ```bash
   npm install
   npm run build
   ```
3. Start the pandas service:
   ```bash
   docker-compose up -d
   ```
4. Run the MCP server:
   ```bash
   node build/index.js
   ```

## Available Tools

### analyze_data
The main tool provided by this MCP server for data analysis. It supports various operations through different analysis types.

#### Parameters
- `file_path` (required): Path to the CSV file to analyze
- `analysis_type` (required): Type of analysis to perform
  - 'describe': Generate descriptive statistics
  - 'plot': Create visualizations
  - 'analyze': Perform comprehensive analysis
- `plot_type` (optional): Type of plot to generate (for plot analysis)
  - 'line': Line plot
  - 'scatter': Scatter plot
  - 'histogram': Histogram
  - 'heatmap': Correlation heatmap
- `x` (optional): X-axis column name for plots
- `y` (optional): Y-axis column name for plots
- `title` (optional): Title for the plot
- `columns` (optional): Array of column names to include in analysis

#### Usage Examples

1. **Basic Statistics**
```json
{
  "file_path": "data/sample.csv",
  "analysis_type": "describe"
}
```

2. **Line Plot**
```json
{
  "file_path": "data/sample.csv",
  "analysis_type": "plot",
  "plot_type": "line",
  "x": "date",
  "y": "temperature",
  "title": "Temperature Over Time"
}
```

3. **Correlation Heatmap**
```json
{
  "file_path": "data/sample.csv",
  "analysis_type": "plot",
  "plot_type": "heatmap"
}
```

4. **Comprehensive Analysis**
```json
{
  "file_path": "data/sample.csv",
  "analysis_type": "analyze",
  "columns": ["temperature", "humidity", "pressure"]
}
```

## Development

### Project Structure
```
.
├── docker-compose.yml      # Docker service configuration
├── Dockerfile.pandas       # Python service container
├── python/
│   └── server.py         # FastAPI implementation
├── src/
│   └── index.ts          # MCP server implementation
├── data/                 # Data directory
│   └── sample.csv        # Sample dataset
├── package.json          # Node.js dependencies
└── tsconfig.json         # TypeScript configuration
```

### Adding New Features
1. Implement new endpoints in Python FastAPI service
2. Add corresponding tools in MCP server
3. Update documentation
4. Test in isolated environment

## Best Practices
- Use Docker for pandas service environment
- Follow TypeScript and Python coding standards
- Maintain comprehensive documentation
- Regular testing and validation
- Version control all changes

## Future Enhancements
- Additional data format support (Excel, JSON)
- Advanced analytics capabilities
- Machine learning integration
- Interactive visualizations
- Data caching mechanisms

Last Updated: 2024-01-10
