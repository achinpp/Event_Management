/**
 * EventPilot — Google Form → Supabase bridge.
 *
 * Setup (once per event form):
 * 1. Create a Google Form with (at least) these short-answer questions:
 *      "Full name", "Email", "Phone" (phone optional).
 * 2. Form → three-dot menu → Apps Script. Paste this whole file.
 * 3. Fill in the three constants below.
 * 4. In the Apps Script editor: Triggers (clock icon) → Add Trigger →
 *      function: onFormSubmit, event source: From form,
 *      event type: On form submit. Authorize when prompted.
 * 5. Submit a test response — it should appear on the EventPilot dashboard
 *      within 2 seconds.
 *
 * The service-role key lives ONLY here (Google's server-side script store),
 * never in any client. form_response_id makes retried submissions idempotent
 * (unique index in the DB ignores duplicates with 409, which we swallow).
 */

var SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co"; // no trailing slash
var SERVICE_ROLE_KEY = "PASTE_SERVICE_ROLE_KEY";
var EVENT_ID = "PASTE_EVENT_UUID"; // from the EventPilot workspace URL

function onFormSubmit(e) {
  var fullName = "";
  var email = "";
  var phone = "";

  var answers = e.response.getItemResponses();
  for (var i = 0; i < answers.length; i++) {
    var title = answers[i].getItem().getTitle().toLowerCase();
    var value = String(answers[i].getResponse());
    if (title.indexOf("name") !== -1) fullName = value;
    else if (title.indexOf("email") !== -1) email = value;
    else if (title.indexOf("phone") !== -1) phone = value;
  }

  UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/registrations", {
    method: "post",
    contentType: "application/json",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: "Bearer " + SERVICE_ROLE_KEY,
      Prefer: "return=minimal",
    },
    payload: JSON.stringify({
      event_id: EVENT_ID,
      full_name: fullName,
      email: email,
      phone: phone || null,
      form_response_id: e.response.getId(),
    }),
    muteHttpExceptions: true, // 409 on duplicate form_response_id is fine
  });
}
