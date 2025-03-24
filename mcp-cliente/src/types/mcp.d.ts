declare module "@modelcontextprotocol/sdk/client/index" {
    export class Client {
      constructor(config: { name: string; version: string }, capabilities: any);
      connect(transport: any): Promise<void>;
      callTool(params: { name: string; arguments: any }): Promise<any>;
    }
  }
  
  declare module "@modelcontextprotocol/sdk/client/stdio" {
    export class StdioClientTransport {
      constructor(options: { command: string; args: string[] });
    }
  }
  
  declare module "@modelcontextprotocol/sdk/server/mcp" {
    export class McpServer {
      constructor(config: { name: string; version: string });
      tool(name: string, schema: any, handler: (args: any) => Promise<any>): void;
      resource(
        name: string,
        template: ResourceTemplate | string,
        handler: (uri: URL, params: any) => Promise<any>
      ): void;
      prompt(name: string, schema: any, handler: (args: any) => any): void;
      connect(transport: any): Promise<void>;
    }
  
    export class ResourceTemplate {
      constructor(pattern: string, options: { list?: any });
    }
  }
  
  declare module "@modelcontextprotocol/sdk/server/stdio" {
    export class StdioServerTransport {
      constructor();
    }
  }