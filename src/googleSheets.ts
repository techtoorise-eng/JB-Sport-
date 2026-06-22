import { BookingLead, SheetSettings } from './firebase';

/**
 * Creates a brand new Google Sheet in the user's Drive with professional headers.
 */
export const createGoogleSheet = async (
  accessToken: string,
  academyName: string
): Promise<SheetSettings> => {
  const title = `${academyName} - Lead Bookings`;
  
  // 1. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title,
      },
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Spreadsheet: ${errText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Initialize Columns Headers
  const headers = [
    'Ticket Ref',
    'Parent Name',
    'WhatsApp / Phone',
    'Child Age Fit',
    'Program Selected',
    'Email Coordinates',
    'Additional Special Notes',
    'Submission Time (UTC)'
  ];

  await appendRowToSheet(accessToken, spreadsheetId, headers);

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };
};

/**
 * Appends a raw array of cells as a new row in the spreadsheet.
 */
export const appendRowToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  rowValues: string[],
  range = 'A1'
): Promise<boolean> => {
  // Use 'A1' as default range to dynamically append to the first sheet.
  // The :append endpoint searches the sheet specified by the range to write at the end of the table.
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: range,
      majorDimension: 'ROWS',
      values: [rowValues],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    let errMsg = `Google Sheets API Error (${res.status}): ${errText}`;
    try {
      const parsed = JSON.parse(errText);
      if (parsed.error?.message) {
        errMsg = parsed.error.message;
      }
    } catch (_) {}
    throw new Error(errMsg);
  }

  return true;
};

/**
 * Formats a BookingLead and appends it to the Google Sheet.
 */
export const appendLeadToGoogleSheet = async (
  accessToken: string,
  spreadsheetId: string,
  lead: BookingLead,
  range = 'A1'
): Promise<boolean> => {
  const rowValues = [
    lead.ticketRef,
    lead.parentName,
    `+91 ${lead.parentPhone}`,
    `${lead.childAge} Years Old`,
    lead.preferredSport,
    lead.parentEmail,
    lead.specialNotes || 'None',
    lead.timestamp
  ];

  return appendRowToSheet(accessToken, spreadsheetId, rowValues, range);
};
