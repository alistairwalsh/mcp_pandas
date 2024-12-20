#!/usr/bin/env node
import axios from 'axios';
import FormData from 'form-data';
import { readFileSync } from 'fs';

const PANDAS_SERVICE_URL = process.env.PANDAS_SERVICE_URL || 'http://localhost:8000';

interface McpError {
  code: string;
  message: string;
}

interface McpRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params: any;
}

interface McpResponse {
  jsonrpc: '2.0';
  id: string;
  result?: any;
  error?: McpError;
}

interface AnalyzeArgs {
  file_path: string;
  analysis_type: 'describe' | 'plot' | 'analyze';
  plot_type?: 'line' | 'scatter' | 'histogram' | 'heatmap';
  x?: string;
  y?: string;
  title?: string;
  columns?: string[];
}

class PandasServer {
  private async handleRequest(request: McpRequest): Promise<McpResponse> {
    try {
      switch (request.method) {
        case 'list_tools':
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              tools: [
                {
                  name: 'analyze_data',
                  description: 'Analyze data from a CSV file using pandas',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      file_path: {
                        type: 'string',
                        description: 'Path to the CSV file',
                      },
                      analysis_type: {
                        type: 'string',
                        enum: ['describe', 'plot', 'analyze'],
                        description: 'Type of analysis to perform',
                      },
                      plot_type: {
                        type: 'string',
                        enum: ['line', 'scatter', 'histogram', 'heatmap'],
                        description: 'Type of plot to generate (only for plot analysis)',
                      },
                      x: {
                        type: 'string',
                        description: 'X-axis column name for plots',
                      },
                      y: {
                        type: 'string',
                        description: 'Y-axis column name for plots',
                      },
                      title: {
                        type: 'string',
                        description: 'Title for the plot',
                      },
                      columns: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Columns to include in the analysis',
                      },
                    },
                    required: ['file_path', 'analysis_type'],
                  },
                },
              ],
            },
          };

        case 'call_tool':
          if (request.params.name !== 'analyze_data') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: 'method_not_found',
                message: `Unknown tool: ${request.params.name}`,
              },
            };
          }

          const args = request.params.arguments as AnalyzeArgs;
          
          try {
            // Read the CSV file
            const fileContent = readFileSync(args.file_path, 'utf-8');
            const formData = new FormData();
            formData.append('file', Buffer.from(fileContent), {
              filename: 'data.csv',
              contentType: 'text/csv',
            });

            // First, read the CSV to get the data
            const csvResponse = await axios.post(
              `${PANDAS_SERVICE_URL}/read_csv`,
              formData,
              {
                headers: formData.getHeaders(),
              }
            );

            const data = csvResponse.data.data;

            // Perform the requested analysis
            let response;
            switch (args.analysis_type) {
              case 'describe':
                response = await axios.post(`${PANDAS_SERVICE_URL}/describe`, data);
                return {
                  jsonrpc: '2.0',
                  id: request.id,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify(response.data, null, 2),
                      },
                    ],
                  },
                };

              case 'plot':
                if (!args.plot_type) {
                  return {
                    jsonrpc: '2.0',
                    id: request.id,
                    error: {
                      code: 'invalid_params',
                      message: 'plot_type is required for plot analysis',
                    },
                  };
                }
                response = await axios.post(`${PANDAS_SERVICE_URL}/plot`, data, {
                  params: {
                    kind: args.plot_type,
                    x: args.x,
                    y: args.y,
                    title: args.title,
                  },
                });
                return {
                  jsonrpc: '2.0',
                  id: request.id,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: `Base64 encoded plot image: ${response.data.plot}`,
                      },
                    ],
                  },
                };

              case 'analyze':
                response = await axios.post(`${PANDAS_SERVICE_URL}/analyze`, data, {
                  params: { columns: args.columns },
                });
                return {
                  jsonrpc: '2.0',
                  id: request.id,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: JSON.stringify(response.data, null, 2),
                      },
                    ],
                  },
                };

              default:
                return {
                  jsonrpc: '2.0',
                  id: request.id,
                  error: {
                    code: 'invalid_params',
                    message: `Unsupported analysis type: ${args.analysis_type}`,
                  },
                };
            }
          } catch (error) {
            if (axios.isAxiosError(error)) {
              return {
                jsonrpc: '2.0',
                id: request.id,
                error: {
                  code: 'internal_error',
                  message: `Pandas service error: ${
                    error.response?.data?.detail || error.message
                  }`,
                },
              };
            }
            throw error;
          }

        default:
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: 'method_not_found',
              message: `Unknown method: ${request.method}`,
            },
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: 'internal_error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async run() {
    process.stdin.setEncoding('utf-8');
    let buffer = '';

    process.stdin.on('data', async (chunk: string) => {
      buffer += chunk;
      
      // Process complete messages
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const request = JSON.parse(line) as McpRequest;
            const response = await this.handleRequest(request);
            console.log(JSON.stringify(response));
          } catch (error) {
            console.error('Error processing request:', error);
          }
        }
      }
    });

    process.stdin.on('end', () => {
      process.exit(0);
    });

    console.error('Pandas MCP server running on stdio');
  }
}

const server = new PandasServer();
server.run().catch(console.error);
