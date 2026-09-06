import { Router } from "express";
import { getAllCases, getCaseByTicketId, updateCaseStatus, getCaseEvents } from "../db/database.js";

export const caseRoutes = Router();

caseRoutes.get("/", async (_req, res) => {
  try {
    const cases = await getAllCases();
    res.json({ cases });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

caseRoutes.get("/:ticketId", async (req, res) => {
  try {
    const caseRecord = await getCaseByTicketId(req.params.ticketId);
    if (!caseRecord) {
      return res.status(404).json({ error: "Case not found" });
    }
    const events = await getCaseEvents(req.params.ticketId);
    res.json({ case: caseRecord, timeline: events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

caseRoutes.patch("/:ticketId", async (req, res) => {
  try {
    const { status, resolutionNote } = req.body;
    if (!status) {
      return res.status(400).json({ error: "Missing status parameter" });
    }

    const updated = await updateCaseStatus(req.params.ticketId, status, resolutionNote);
    if (!updated) {
      return res.status(404).json({ error: "Case not found" });
    }

    const updatedCase = await getCaseByTicketId(req.params.ticketId);
    const events = await getCaseEvents(req.params.ticketId);
    res.json({ success: true, case: updatedCase, timeline: events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

caseRoutes.get("/:ticketId/timeline", async (req, res) => {
  try {
    const events = await getCaseEvents(req.params.ticketId);
    res.json({ ticketId: req.params.ticketId, timeline: events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
