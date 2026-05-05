#!/usr/bin/env node
/**
 * LocalDB MCP Server
 * Connects to (localdb)\MSSQLLocalDB using Windows Authentication via sqlcmd.
 * No username/password needed — uses the current Windows user session.
 */

const { execSync } = require('child_process');
const readline = require('readline');

// ── Connection config ────────────────────────────────────────────────────────
const SQLCMD = 'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\SQLCMD.EXE';
const SERVER  = '(localdb)\\MSSQLLocalDB';
const DB      = 'master';

// ── Run a SQL query via sqlcmd ────────────────────────────────────────────────
function runQuery(sql, database) {
  const db = database || DB;
  // -S server  -d database  -E Windows Auth  -s, col separator  -W trim spaces
  // -h -1 no header row count  -r 0 don't print msgs to stderr
  const cmd = [
    `"${SQLCMD}"`,
    `-S "${SERVER}"`,
    `-d "${db}"`,
    `-E`,
    `-Q "${sql.replace(/"/g, '\\"')}"`,
    `-s "|"`,
    `-W`,
    `-h -1`,
  ].join(' ');

  try {
    const output = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
    return { success: true, output: output.trim() };
  } catch (err) {
    const msg = err.stdout?.trim() || err.stderr?.trim() || err.message;
    return { success: false, output: msg };
  }
}

// ── MCP tools ─────────────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'sql_query',
    description: 'Run any SQL query against the SQL Server LocalDB (master database by default). Returns results as pipe-delimited rows.',
    inputSchema: {
      type: 'object',
      properties: {
        query:    { type: 'string', description: 'The SQL query to execute' },
        database: { type: 'string', description: 'Optional database name (defaults to master)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_databases',
    description: 'List all databases on the LocalDB instance.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_tables',
    description: 'List all tables in the specified database.',
    inputSchema: {
      type: 'object',
      properties: {
        database: { type: 'string', description: 'Database name (defaults to master)' },
      },
    },
  },
  {
    name: 'describe_table',
    description: 'Show column names, types and nullability for a table.',
    inputSchema: {
      type: 'object',
      properties: {
        table:    { type: 'string', description: 'Table name' },
        database: { type: 'string', description: 'Database name (defaults to master)' },
      },
      required: ['table'],
    },
  },
  {
    name: 'list_stored_procedures',
    description: 'List all stored procedures in the specified database.',
    inputSchema: {
      type: 'object',
      properties: {
        database: { type: 'string', description: 'Database name (defaults to master)' },
      },
    },
  },
];

// ── Canned SQL for built-in tools ────────────────────────────────────────────
function handleTool(name, args) {
  switch (name) {
    case 'sql_query':
      return runQuery(args.query, args.database);

    case 'list_databases':
      return runQuery("SELECT name FROM sys.databases ORDER BY name;");

    case 'list_tables':
      return runQuery(
        "SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES ORDER BY TABLE_SCHEMA, TABLE_NAME;",
        args.database
      );

    case 'describe_table':
      return runQuery(
        `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_NAME = '${args.table.replace(/'/g, "''")}'
         ORDER BY ORDINAL_POSITION;`,
        args.database
      );

    case 'list_stored_procedures':
      return runQuery(
        "SELECT ROUTINE_SCHEMA, ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_TYPE='PROCEDURE' ORDER BY ROUTINE_SCHEMA, ROUTINE_NAME;",
        args.database
      );

    default:
      return { success: false, output: `Unknown tool: ${name}` };
  }
}

// ── Minimal JSON-RPC / MCP stdio loop ────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, terminal: false });

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

rl.on('line', (line) => {
  let req;
  try { req = JSON.parse(line); } catch { return; }

  const { id, method, params } = req;

  if (method === 'initialize') {
    send({
      jsonrpc: '2.0', id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'localdb-mcp-server', version: '1.0.0' },
      },
    });
    return;
  }

  if (method === 'notifications/initialized' || method === 'initialized') return;

  if (method === 'tools/list') {
    send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    return;
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    const result = handleTool(name, args || {});
    send({
      jsonrpc: '2.0', id,
      result: {
        content: [{
          type: 'text',
          text: result.success
            ? result.output || '(no rows returned)'
            : `Error: ${result.output}`,
        }],
        isError: !result.success,
      },
    });
    return;
  }

  // Unknown method — return error
  send({
    jsonrpc: '2.0', id,
    error: { code: -32601, message: `Method not found: ${method}` },
  });
});
