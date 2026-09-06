import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";
import { CaseRecord, CaseEvent, MessageRecord } from "../types/serverTypes.js";

const DB_PATH = path.resolve(process.cwd(), "vocaai.sqlite");

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  initSchema(dbInstance);
  saveDb();
  return dbInstance;
}

function saveDb() {
  if (!dbInstance) return;
  const data = dbInstance.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      language TEXT NOT NULL,
      issue_type TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      order_id TEXT,
      reference_id TEXT,
      service_type TEXT,
      description TEXT,
      summary TEXT NOT NULL,
      escalation_reason TEXT,
      confidence REAL NOT NULL,
      transcript TEXT NOT NULL,
      resolution_note TEXT,
      handoff_brief TEXT,
      confirmed_info TEXT,
      unconfirmed_info TEXT,
      missing_info TEXT
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      mode TEXT NOT NULL,
      state_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      language TEXT,
      confidence REAL
    );

    CREATE TABLE IF NOT EXISTS case_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      case_id INTEGER NOT NULL,
      ticket_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      metadata TEXT
    );
  `);

  // Safe schema migrations if table existed previously
  try { db.run("ALTER TABLE cases ADD COLUMN handoff_brief TEXT;"); } catch (e) {}
  try { db.run("ALTER TABLE cases ADD COLUMN confirmed_info TEXT;"); } catch (e) {}
  try { db.run("ALTER TABLE cases ADD COLUMN unconfirmed_info TEXT;"); } catch (e) {}
  try { db.run("ALTER TABLE cases ADD COLUMN missing_info TEXT;"); } catch (e) {}
  try { db.run("ALTER TABLE cases ADD COLUMN reference_id TEXT;"); } catch (e) {}
  try { db.run("ALTER TABLE cases ADD COLUMN service_type TEXT;"); } catch (e) {}

  // Normalize existing escalation reasons to concise, meaningful standards
  try {
    db.run("UPDATE cases SET escalation_reason = 'Direct customer request for human supervisor' WHERE escalation_reason LIKE '%explicitly requested%' OR escalation_reason LIKE '%requested to speak%';");
    db.run("UPDATE cases SET escalation_reason = 'Low acoustic confidence: detail clarification needed' WHERE escalation_reason LIKE '%confidence remained low%';");
    db.run("UPDATE cases SET escalation_reason = 'Medical safety boundary: non-prescriptive advisory' WHERE escalation_reason LIKE '%fever%' OR escalation_reason LIKE '%medicine%' OR escalation_reason LIKE '%clinical%';");
  } catch (e) {}
}

// Case Operations
export async function createCase(record: Omit<CaseRecord, "id">): Promise<CaseRecord> {
  const db = await getDb();
  db.run(
    `INSERT INTO cases (
      ticket_id, created_at, updated_at, status, priority, language, issue_type,
      customer_name, customer_phone, customer_email, order_id, reference_id, service_type,
      description, summary, escalation_reason, confidence, transcript, resolution_note,
      handoff_brief, confirmed_info, unconfirmed_info, missing_info
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.ticket_id,
      record.created_at,
      record.updated_at,
      record.status,
      record.priority,
      record.language,
      record.issue_type,
      record.customer_name || null,
      record.customer_phone || null,
      record.customer_email || null,
      record.order_id || null,
      record.reference_id || record.order_id || null,
      record.service_type || null,
      record.description || null,
      record.summary,
      record.escalation_reason || null,
      record.confidence,
      record.transcript,
      record.resolution_note || null,
      record.handoff_brief || null,
      record.confirmed_info || null,
      record.unconfirmed_info || null,
      record.missing_info || null,
    ]
  );

  const res = db.exec("SELECT last_insert_rowid() as id");
  const caseId = res[0].values[0][0] as number;
  saveDb();

  // Automatically record Ticket Created event in timeline
  await addCaseEvent({
    case_id: caseId,
    ticket_id: record.ticket_id,
    event_type: "Ticket Created",
    description: `Case escalated with priority ${record.priority}. Reason: ${record.escalation_reason || "Assistance Required"}`,
    timestamp: record.created_at,
    metadata: JSON.stringify({ issue_type: record.issue_type, confidence: record.confidence })
  });

  return { id: caseId, ...record };
}

export async function getAllCases(): Promise<CaseRecord[]> {
  const db = await getDb();
  const res = db.exec("SELECT * FROM cases ORDER BY id DESC");
  if (!res || res.length === 0) return [];
  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj as CaseRecord;
  });
}

export async function getCaseByTicketId(ticketId: string): Promise<CaseRecord | null> {
  const db = await getDb();
  const stmt = db.prepare("SELECT * FROM cases WHERE ticket_id = ?");
  stmt.bind([ticketId]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row as unknown as CaseRecord;
  }
  stmt.free();
  return null;
}

export async function updateCaseStatus(
  ticketId: string,
  status: CaseRecord["status"],
  resolutionNote?: string
): Promise<boolean> {
  const db = await getDb();
  const existing = await getCaseByTicketId(ticketId);
  if (!existing || !existing.id) return false;

  const now = new Date().toISOString();
  db.run(
    "UPDATE cases SET status = ?, updated_at = ?, resolution_note = coalesce(?, resolution_note) WHERE ticket_id = ?",
    [status, now, resolutionNote || null, ticketId]
  );
  saveDb();

  await addCaseEvent({
    case_id: existing.id,
    ticket_id: ticketId,
    event_type: status === "Resolved" ? "Case Resolved" : `Status Changed to ${status}`,
    description: resolutionNote ? `Note: ${resolutionNote}` : `Supervisor marked case as ${status}`,
    timestamp: now,
    metadata: JSON.stringify({ previous_status: existing.status, new_status: status })
  });

  return true;
}

// Case Events / Timeline
export async function addCaseEvent(event: Omit<CaseEvent, "id">): Promise<void> {
  const db = await getDb();
  db.run(
    "INSERT INTO case_events (case_id, ticket_id, event_type, description, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?)",
    [event.case_id, event.ticket_id, event.event_type, event.description, event.timestamp, event.metadata || null]
  );
  saveDb();
}

export async function getCaseEvents(ticketId: string): Promise<CaseEvent[]> {
  const db = await getDb();
  const stmt = db.prepare("SELECT * FROM case_events WHERE ticket_id = ? ORDER BY id ASC");
  stmt.bind([ticketId]);
  const events: CaseEvent[] = [];
  while (stmt.step()) {
    events.push(stmt.getAsObject() as unknown as CaseEvent);
  }
  stmt.free();
  return events;
}

// Message logging
export async function logMessage(msg: Omit<MessageRecord, "id">): Promise<void> {
  const db = await getDb();
  db.run(
    "INSERT INTO messages (conversation_id, role, content, timestamp, language, confidence) VALUES (?, ?, ?, ?, ?, ?)",
    [msg.conversation_id, msg.role, msg.content, msg.timestamp, msg.language || null, msg.confidence || null]
  );
  saveDb();
}

export async function getConversationMessages(convId: string): Promise<MessageRecord[]> {
  const db = await getDb();
  const stmt = db.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC");
  stmt.bind([convId]);
  const msgs: MessageRecord[] = [];
  while (stmt.step()) {
    msgs.push(stmt.getAsObject() as unknown as MessageRecord);
  }
  stmt.free();
  return msgs;
}
