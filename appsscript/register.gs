/**
 * Google Apps Script for EventPilot registration.
 *
 * Setup:
 * 1. Create a Google Form with fields: Full Name, Email
 * 2. Open the form's Apps Script editor (Extensions → Apps Script)
 * 3. Paste this entire file
 * 4. Replace SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY with your values
 * 5. Replace EVENT_ID with the event UUID from your Supabase events table
 * 6. Save, then go to Triggers → Add Trigger:
 *    - Function: onFormSubmit
 *    - Event source: From form
 *    - Event type: On form submit
 *    - Click Save and authorize
 *
 * WARNING: The SUPABASE_SERVICE_ROLE_KEY is a secret. Do not share the script.
 */

// ─── Configuration ───────────────────────────────────────────
var SUPABASE_URL = "YOUR_SUPABASE_URL_HERE"; // e.g. https://abc123.supabase.co
var SUPABASE_SERVICE_ROLE_KEY = "YOUR_SERVICE_ROLE_KEY_HERE";
var EVENT_ID = "YOUR_EVENT_ID_HERE"; // UUID of the event
// ─────────────────────────────────────────────────────────────

function onFormSubmit(e) {
  var responses = e.response.getItemResponses();

  var fullName = "";
  var email = "";

  for (var i = 0; i < responses.length; i++) {
    var title = responses[i].getItem().getTitle().toLowerCase();
    var answer = responses[i].getResponse();

    if (title.indexOf("name") !== -1) {
      fullName = answer;
    } else if (title.indexOf("email") !== -1) {
      email = answer;
    }
  }

  var payload = {
    event_id: EVENT_ID,
    full_name: fullName,
    email: email,
    form_response_id: e.response.getId(),
  };

  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
      Prefer: "return=minimal",
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  var url = SUPABASE_URL + "/rest/v1/registrations";
  var response = UrlFetchApp.fetch(url, options);

  Logger.log("Status: " + response.getResponseCode());
  Logger.log("Body: " + response.getContentText());
}
