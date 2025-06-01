# AnyAPI Profile Create Wizard Implementation Plan

## Overview

The goal is to build a modern, intuitive Profile Create Wizard for AnyAPI, making it easy for users to create API profiles (including Meraki and other complex APIs) with correct header/auth handling and secure secret management. This will be modular, DRY, and ready for future integration with a dynamic template system.

---

## 1. Project Structure & File References

- **New/Updated Files:**
  - `www/js/profile-create-wizard.js` (new main wizard component)
  - `www/js/core/profile-wizard-utils.js` (shared logic/utilities, new)
  - `www/index.html` (add new wizard button, modal container)
  - `Start-AnyApiServer.ps1` (backend endpoint for simple profile creation)
  - `moduleuse.md` (update docs for new flow)
- **Existing for Reference:**
  - `profile-manager.js`, `profile-edit-modal.js` (for migration/utility reuse)
  - `template-manager.js` (for future template integration)

---

## 2. Wizard UI/UX Design

- **Step-by-step modal or panel** (multi-step, minimal required fields per step)
- **Fields to collect:**
  - Profile Name
  - Base URL
  - Auth Type (with dynamic fields for each type)
    - For Meraki: toggle between "Authorization: Bearer" and "X-Cisco-Meraki-API-Key"
  - Default Headers (auto-filled for known APIs, editable)
  - Optional: Pagination, Custom Settings, Description
- **Features:**
  - Live header preview (shows what headers will be sent)
  - Secret fields (API keys, tokens) are masked and securely handled
  - Advanced options hidden by default
  - Inline validation and tooltips
  - "Create Profile (Wizard)" button in UI for testing

---

## 3. Frontend Implementation Steps

### a. Create `profile-create-wizard.js`
- ES6 class/component, modular
- Handles all wizard UI, state, and validation
- Imports shared logic from `profile-wizard-utils.js`

### b. Create `profile-wizard-utils.js`
- Utility functions for:
  - Header preview generation
  - Auth type mapping
  - Secret field rendering
  - Profile object normalization for backend
- Shared constants (auth types, header templates, etc.)

### c. Update `index.html`
- Add "Create Profile (Wizard)" button (next to old modal for now)
- Add modal/container for wizard

### d. Refactor/Reuse
- Reuse field rendering and validation logic from `profile-edit-modal.js` and `profile-manager.js` where possible
- Move shared code to `profile-wizard-utils.js`

---

## 4. Backend Implementation Steps

### a. Add/Update Endpoint in `Start-AnyApiServer.ps1`
- New endpoint: `/api/profiles/simple-create`
- Accepts minimal profile data from wizard
- Normalizes and builds full profile object:
  - Handles `AuthenticationDetails`, `DefaultHeaders`, etc.
  - **All secrets (API keys, tokens, passwords) must be transmitted from the frontend to the backend using end-to-end encryption (AES-GCM with PBKDF2), and never sent or stored in plain text. This is a required part of the refactor and must be validated in all profile creation and editing flows.**
  - Stores secrets securely (using AnyAPI’s secret management)
  - Generates custom script for complex auth if needed
- Returns success/error and the created profile

---

## 5. Profile Creation Flow

1. User clicks "Create Profile (Wizard)"
2. Wizard guides user through steps, showing live header preview
3. On submit, wizard sends minimal data to backend
4. Backend creates and stores the profile, handling all complexity
5. UI shows success, profile appears in list

---

## 6. Testing & Validation

- Test with:
  - Meraki (both header styles)
  - Standard Bearer/API Key/Basic auth
  - Custom header scenarios
- Ensure secrets are never exposed in frontend or stored in plain text
- Validate that created profiles work with endpoint tester and other features

---

## 7. Documentation

- Update `moduleuse.md`:
  - Document new wizard flow
  - Add screenshots/walkthrough (optional)
  - Document Meraki and other special-case templates

---

## 8. Future Steps (After Wizard)

- Integrate dynamic template system (see previous plan)
- Allow import/export/sync of templates
- Phase out old modal/profile manager code after validation

---

## 9. Summary Table

| Step | File(s) | Description |
|------|---------|-------------|
| 1 | `profile-create-wizard.js` | New wizard UI/component |
| 2 | `profile-wizard-utils.js` | Shared logic/utilities |
| 3 | `index.html` | Add wizard button/modal |
| 4 | `Start-AnyApiServer.ps1` | Backend endpoint for profile creation |
| 5 | `moduleuse.md` | Update documentation |
| 6 | `profile-manager.js`, `profile-edit-modal.js` | Reference for migration, remove after validation |

---

## 10. Key Principles

- **Frontend:** Minimal, guided, dynamic, DRY, secure
- **Backend:** Accepts minimal input, handles all normalization/secret logic
- **Security:** All secrets handled via secure store, never exposed
- **Extensibility:** Easy to add new auth types/templates in future

---

# Profile Create Wizard Refactor Plan (Update)

## Progress Summary (as of 2025-05-30)

### Completed
- Steps 1–3: Basic info, authentication, and advanced config UI are implemented, modular, and DRY.
- Step 4: Review UI is implemented, showing all profile fields for user confirmation.
- Backend integration: On 'Create Profile', the wizard calls `apiClient.createProfile` and handles success/error notifications.
- SecretStore status and unlock UI is delegated to the single source of truth (`window.secretManager`).
- Event handler context issues fixed (arrow functions, etc.).
- Code is modular and ready for template integration.

### Outstanding Issues / Next Steps
- **Header Preview:**
  - Header preview in step 2 only updates when header name changes, not on all relevant field changes (e.g., API key, token, Meraki style).
  - In step 4 (review), the merged headers (default + auth) should be shown as they will be sent in real requests.
- **Secret Handling:**
  - Secret field values and SecretStore status are not always reflected correctly in the UI.
  - Ensure secret values are handled securely and consistently, and that the review step does not leak secrets.
- **Backend Integration:**
  - Backend returns 500 errors and 'Profile name is required' even when a name is provided.
  - Need to debug the payload sent to the backend and ensure all required fields are present and correctly named.
  - Validate that `buildProfileObject` produces the correct structure for the backend.
- **General:**
  - Improve error messages and validation feedback for users.
  - Add merged header preview to review step.
  - Test full flow with various auth types and edge cases.

### Next Steps
1. Fix header preview logic in step 2 to update on all relevant field changes.
2. In step 4, show the actual headers that will be sent (merged default + auth headers, with secrets masked).
3. Audit secret handling and SecretStore status display for accuracy and security.
4. Debug backend payload/validation issues (log payload, check field names, ensure required fields).
5. Update documentation and code comments as needed.

---

(For detailed progress, see `progress/README.md`)
