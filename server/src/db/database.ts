import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CaseRecord, CaseEvent, MessageRecord } from "../types/serverTypes.js";

// In Vercel serverless, the filesystem is read-only except /tmp.
// Detect Vercel by checking VERCEL env var (set automatically by Vercel).
const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const DB_PATH = IS_SERVERLESS
  ? path.join("/tmp", "vocaai.sqlite")
  : path.resolve(process.cwd(), "vocaai.sqlite");

// Resolve the sql.js WASM file explicitly so serverless runtimes can locate it.
// Try multiple candidate paths so it works both locally and in Vercel functions.
function resolveWasmPath(): string | undefined {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const candidates = [
    path.join(__dirname, "..", "..", "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
    path.join(__dirname, "..", "..", "..", "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
    path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
    // server/node_modules fallback for local dev
    path.join(__dirname, "..", "..", "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const wasmPath = resolveWasmPath();
  const SQL = await initSqlJs(
    wasmPath
      ? { wasmBinary: fs.readFileSync(wasmPath) }
      : {}
  );

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
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (e) {
    // In serverless environments (Vercel), the filesystem may be read-only.
    // The DB remains valid in-memory for the duration of the function invocation.
  }
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

  // Idempotent seeding of realistic demo cases for Supervisor portal demonstration
  seedDemoCases(db);
}

function seedDemoCases(db: Database) {
  try {
    const res = db.exec("SELECT COUNT(*) as count FROM cases WHERE ticket_id LIKE 'VCA-DEMO-%'");
    const count = res && res[0] && res[0].values && res[0].values[0] ? Number(res[0].values[0][0]) : 0;
    if (count >= 6) {
      return; // Already seeded
    }

    const now = Date.now();
    const demoCases: Array<Omit<CaseRecord, "id">> = [
      // Case 5: Resolved Case (inserted first so active cases have higher IDs)
      {
        ticket_id: "VCA-DEMO-005",
        created_at: new Date(now - 180 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 90 * 60 * 1000).toISOString(),
        status: "Resolved",
        priority: "P3",
        language: "English",
        issue_type: "Billing Discrepancy",
        customer_name: "Demo Customer",
        customer_phone: "+91 99887 76655",
        customer_email: "billing.demo@vocaai.test",
        order_id: "ORD-77192",
        reference_id: "TXN-993821",
        service_type: "Financial Services",
        description: "Double charge inquiry on failed transaction.",
        summary: "Case resolved by human supervisor after automated bank reversal verification.",
        escalation_reason: "AI reached the escalation threshold.",
        confidence: 0.45,
        transcript: JSON.stringify([
          { speaker: "user", text: "Money was deducted twice for transaction 993821.", timestamp: "15:45" },
          { speaker: "assistant", text: "I've noted transaction #993821. Because this involves payment deduction, I am escalating this to our financial support team.", timestamp: "15:46" },
          { speaker: "Supervisor", text: "I've verified with the payment gateway. The duplicate charge has been released and will reflect in 24-48 hours.", timestamp: "17:15" }
        ]),
        resolution_note: "Verified gateway hold release. Duplicate charge reversed; confirmation SMS dispatched to customer.",
        handoff_brief: "Conversation was escalated after VocaAI could not reliably resolve the customer's request. A supervisor reviewed the preserved context and resolved the case.",
        confirmed_info: JSON.stringify(["Transaction TXN-993821 confirmed", "Duplicate charge identified"]),
        unconfirmed_info: JSON.stringify([]),
        missing_info: JSON.stringify([])
      },
      // Case 2: Explicit Human Request
      {
        ticket_id: "VCA-DEMO-002",
        created_at: new Date(now - 45 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 45 * 60 * 1000).toISOString(),
        status: "Escalated",
        priority: "P1",
        language: "English",
        issue_type: "Direct Supervisor Request",
        customer_name: "Alex Morgan (Demo)",
        customer_phone: "+1 555 019 2834",
        customer_email: "alex.morgan@vocaai.test",
        order_id: "ORD-99201",
        reference_id: "REF-99201",
        service_type: "Priority Escalation",
        description: "Customer explicitly requests to speak with a human supervisor.",
        summary: "Caller requested immediate supervisor transfer with preserved context.",
        escalation_reason: "Caller explicitly requested human assistance.",
        confidence: 0.94,
        transcript: JSON.stringify([
          { speaker: "user", text: "Hello, I have an issue with order 99201.", timestamp: "18:25" },
          { speaker: "assistant", text: "I have order #99201 on file. How can I assist you with this order today?", timestamp: "18:25" },
          { speaker: "user", text: "Can I please speak directly to a supervisor or human representative?", timestamp: "18:26" },
          { speaker: "assistant", text: "Certainly. I have compiled your verified conversational dossier under case #VCA-DEMO-002 and am transferring your session to a human supervisor.", timestamp: "18:26" }
        ]),
        resolution_note: null,
        handoff_brief: "Customer requested to speak with a human representative. Conversation context is preserved for supervisor review.",
        confirmed_info: JSON.stringify(["Order #99201 confirmed", "Direct human agent transfer requested"]),
        unconfirmed_info: JSON.stringify([]),
        missing_info: JSON.stringify(["Supervisor verification"])
      },
      // Case 6: Multilingual Escalation
      {
        ticket_id: "VCA-DEMO-006",
        created_at: new Date(now - 35 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 35 * 60 * 1000).toISOString(),
        status: "Escalated",
        priority: "P2",
        language: "Hindi + English",
        issue_type: "Multilingual Inquiry",
        customer_name: "Demo Customer",
        customer_phone: "+91 97654 32109",
        customer_email: "multilingual.demo@vocaai.test",
        order_id: null,
        reference_id: null,
        service_type: "Multilingual Support",
        description: "Hindi/English mixed-language conversation requiring human assistance.",
        summary: "Bilingual conversation escalated with full Hindi-English context preserved.",
        escalation_reason: "Multilingual conversation required additional clarification before safe resolution.",
        confidence: 0.48,
        transcript: JSON.stringify([
          { speaker: "user", text: "Mujhe ek problem hai, but mujhe reference number yaad nahi hai.", timestamp: "18:15" },
          { speaker: "assistant", text: "That's okay. I'll try to help. Do you have any other details about the request?", timestamp: "18:15" },
          { speaker: "user", text: "Nahi, mujhe yaad nahi.", timestamp: "18:16" },
          { speaker: "assistant", text: "No worries. Main aapki call human supervisor ko transfer kar raha hoon taaki wo aapki madad kar sakein.", timestamp: "18:16" }
        ]),
        resolution_note: null,
        handoff_brief: "Customer communicated in Hindi and English. VocaAI collected the available context but could not confidently resolve the request. Human assistance was requested while preserving the conversation history.",
        confirmed_info: JSON.stringify(["Customer expressed inquiry in Hindi + English"]),
        unconfirmed_info: JSON.stringify(["Reference number"]),
        missing_info: JSON.stringify(["Reference ID", "Account Phone / Email"])
      },
      // Case 3: Repeated Clarification
      {
        ticket_id: "VCA-DEMO-003",
        created_at: new Date(now - 25 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 25 * 60 * 1000).toISOString(),
        status: "Escalated",
        priority: "P2",
        language: "English",
        issue_type: "Incomplete Information",
        customer_name: "Test Customer",
        customer_phone: "+91 91234 56789",
        customer_email: "test.customer@vocaai.test",
        order_id: null,
        reference_id: null,
        service_type: "General Support",
        description: "Customer describes a problem but provides incomplete information despite clarification.",
        summary: "Repeated clarification attempts resulted in low confidence score (38%).",
        escalation_reason: "Repeated clarification attempts did not produce sufficient information to safely continue.",
        confidence: 0.38,
        transcript: JSON.stringify([
          { speaker: "user", text: "My service is not working properly.", timestamp: "18:05" },
          { speaker: "assistant", text: "I'd be happy to help. Could you specify which service or device you are having trouble with?", timestamp: "18:05" },
          { speaker: "user", text: "The one from last week.", timestamp: "18:06" },
          { speaker: "assistant", text: "To locate the correct account, could you share your account ID or registered telephone number?", timestamp: "18:06" },
          { speaker: "user", text: "Just check my account.", timestamp: "18:07" }
        ]),
        resolution_note: null,
        handoff_brief: "Customer described an unresolved issue but could not provide enough information for reliable resolution. VocaAI preserved the conversation context and escalated the case.",
        confirmed_info: JSON.stringify(["Customer has unresolved service concern"]),
        unconfirmed_info: JSON.stringify(["Service account ID"]),
        missing_info: JSON.stringify(["Account identifier", "Specific service location"])
      },
      // Case 4: Human Handling
      {
        ticket_id: "VCA-DEMO-004",
        created_at: new Date(now - 18 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 5 * 60 * 1000).toISOString(),
        status: "Human Handling",
        priority: "P2",
        language: "English",
        issue_type: "Complex Account Review",
        customer_name: "Priya Demo",
        customer_phone: "+91 98111 22334",
        customer_email: "priya.demo@vocaai.test",
        order_id: "ORD-88421",
        reference_id: "REF-88421",
        service_type: "Enterprise Support",
        description: "Complex multi-item return with custom invoice adjustment.",
        summary: "Supervisor actively reviewing customized billing exception.",
        escalation_reason: "Request requires human review.",
        confidence: 0.72,
        transcript: JSON.stringify([
          { speaker: "user", text: "I need to return item 2 from order 88421 and split the refund between store credit and card.", timestamp: "17:50" },
          { speaker: "assistant", text: "Order #88421 verified. Split refunds require custom billing authorization. Let me connect you with a supervisor.", timestamp: "17:51" },
          { speaker: "Supervisor", text: "Hello Priya! I have your order details and can process the split refund for you.", timestamp: "18:35" }
        ]),
        resolution_note: "Supervisor accepted live case. Verifying merchant credit allocation.",
        handoff_brief: "VocaAI identified a request requiring human review and transferred the conversation with the available context.",
        confirmed_info: JSON.stringify(["Order #88421 verified", "Item 2 return identified"]),
        unconfirmed_info: JSON.stringify(["Split refund approval"]),
        missing_info: JSON.stringify(["Merchant authorization code"])
      },
      // Case 1: Low Confidence / Missing Reference (top of live queue)
      {
        ticket_id: "VCA-DEMO-001",
        created_at: new Date(now - 10 * 60 * 1000).toISOString(),
        updated_at: new Date(now - 10 * 60 * 1000).toISOString(),
        status: "Escalated",
        priority: "P2",
        language: "English",
        issue_type: "Order Reference Missing",
        customer_name: "Demo Customer",
        customer_phone: "+91 98765 43210",
        customer_email: "demo.customer@vocaai.test",
        order_id: null,
        reference_id: null,
        service_type: "Customer Support",
        description: "Customer needs help with an order but cannot remember the reference number.",
        summary: "Order assistance requested without reference number. Low confidence threshold reached.",
        escalation_reason: "Critical reference information could not be reliably provided after clarification.",
        confidence: 0.42,
        transcript: JSON.stringify([
          { speaker: "user", text: "I need help with my order.", timestamp: "18:40" },
          { speaker: "assistant", text: "I would be glad to help with your order. Do you have your order number or reference number?", timestamp: "18:40" },
          { speaker: "user", text: "I don't remember the reference number.", timestamp: "18:41" },
          { speaker: "assistant", text: "That's completely fine. Could you share your registered email or phone number so I can look up your record?", timestamp: "18:41" },
          { speaker: "user", text: "I don't have those details right now either.", timestamp: "18:42" }
        ]),
        resolution_note: null,
        handoff_brief: "Customer is requesting assistance with an order issue. The customer could not provide a reliable reference number. VocaAI attempted clarification but could not safely verify the case details. Human assistance is recommended.",
        confirmed_info: JSON.stringify(["Customer needs order assistance"]),
        unconfirmed_info: JSON.stringify(["Order reference"]),
        missing_info: JSON.stringify(["Reference number", "Specific order details"])
      }
    ];

    for (const c of demoCases) {
      // Check if ticket already exists
      const check = db.prepare("SELECT id FROM cases WHERE ticket_id = ?");
      check.bind([c.ticket_id]);
      const exists = check.step();
      check.free();
      if (exists) continue;

      db.run(
        `INSERT INTO cases (
          ticket_id, created_at, updated_at, status, priority, language, issue_type,
          customer_name, customer_phone, customer_email, order_id, reference_id, service_type,
          description, summary, escalation_reason, confidence, transcript, resolution_note,
          handoff_brief, confirmed_info, unconfirmed_info, missing_info
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.ticket_id, c.created_at, c.updated_at, c.status, c.priority, c.language, c.issue_type,
          c.customer_name || null, c.customer_phone || null, c.customer_email || null,
          c.order_id || null, c.reference_id || null, c.service_type || null,
          c.description || null, c.summary, c.escalation_reason || null, c.confidence,
          c.transcript, c.resolution_note || null, c.handoff_brief || null,
          c.confirmed_info || null, c.unconfirmed_info || null, c.missing_info || null
        ]
      );

      const resId = db.exec("SELECT last_insert_rowid() as id");
      const caseId = resId && resId[0] && resId[0].values[0] ? Number(resId[0].values[0][0]) : 1;

      // Seed timeline events for each case
      db.run(
        "INSERT INTO case_events (case_id, ticket_id, event_type, description, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?)",
        [caseId, c.ticket_id, "Conversation Started", "Customer initiated conversation with voice assistant.", c.created_at, JSON.stringify({ issue_type: c.issue_type })]
      );
      if (c.status === "Human Handling") {
        db.run(
          "INSERT INTO case_events (case_id, ticket_id, event_type, description, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?)",
          [caseId, c.ticket_id, "Supervisor Takeover", "Supervisor took over live session with zero context loss.", c.updated_at, JSON.stringify({ status: "Human Handling" })]
        );
      } else if (c.status === "Resolved") {
        db.run(
          "INSERT INTO case_events (case_id, ticket_id, event_type, description, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?)",
          [caseId, c.ticket_id, "Case Resolved", c.resolution_note || "Supervisor resolved the issue.", c.updated_at, JSON.stringify({ status: "Resolved" })]
        );
      } else {
        db.run(
          "INSERT INTO case_events (case_id, ticket_id, event_type, description, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?)",
          [caseId, c.ticket_id, "Escalation Triggered", `Case escalated: ${c.escalation_reason}`, c.created_at, JSON.stringify({ confidence: c.confidence })]
        );
      }
    }
  } catch (err) {
    console.error("[Database] Error seeding demo cases:", err);
  }
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
