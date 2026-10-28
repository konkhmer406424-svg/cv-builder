/* config.js — URLs and storage keys. Edit these first when you move to a new Worker / Apps Script. */

const AI_URL = 'https://cv-ai.konkhmer406424.workers.dev/ai';   // <-- put your Worker URL here

// ---- Payment gate (Bakong Relay KHQR auto-unlock) ----
// Same Google Apps Script Web App URL as before (ends in /exec). It now also
// handles ?action=createPayment and ?action=checkStatus — see the separate
// bakong-relay-backend.gs file for what to add on the Apps Script side.
const CODE_CHECK_URL = 'https://script.google.com/macros/s/AKfycbzcaIg0U0p2kg1zdoq6TjPsD5so18-45qVpw9e4H4PEJlbcGtvDBO8rKGTpVWJ5JOKdWQ/exec';
const UNLOCK_STORAGE_KEY = 'cvBuilderUnlocked_v2'; // v2: unlock is now bound to code + Full Name
const OLD_UNLOCK_STORAGE_KEY = 'cvBuilderUnlocked_v1'; // old flag (not tied to any code/name) — discarded
const PENDING_NAME_KEY = 'cvBuilderPendingName_v1';
const UNLOCK_DAYS = 30;
const PENDING_MD5_KEY = 'cvBuilderPendingMd5_v1';
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_TRIES = 180; // ~9 minutes — KHQR codes expire around 10 minutes

const CV_DATA_KEY = 'cvBuilderData_v1';
