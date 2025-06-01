# Refactor Plan Folder Index

This folder contains the implementation plan and progress tracking for the AnyAPI Profile Create Wizard refactor and other ongoing improvements.

## Structure

- `profile-create-wizard-plan.md`  
  The main implementation plan, including all steps, file references, and instructions for LLMs/devs.

- `secretstore-encryption-status.md`  
  **Current active document:** Status and technical details for SecretStore password encryption implementation. Contains debugging information for session key reconstruction failure.

- `progress/`  
  Subfolder for real-time progress tracking. Each major step or file should have its own markdown log (e.g., `01-profile-create-wizard.md`).

---

## Key Workspace Folders (for reference)

- `AnyAPI/AnyAPIGui/`  
  Main GUI codebase. **All wizard and UI changes will be made here.**
    - `www/js/` — Main JS code (wizard, manager, utils, etc.)
    - `www/index.html` — Main HTML UI
    - `Start-AnyApiServer.ps1` — Backend server (add new endpoints here)
    - `moduleuse.md` — Documentation
    - `css/` — Stylesheets
    - `js/core/` — Shared JS utilities
    - `js/ui/` — UI components
    - `js/archive/` — Old/legacy code

- `AnyAPI/AnyAPI.psm1`  
  **Do not modify.** Core module logic, not part of this refactor.

---

## Instructions
- All new/updated code for the wizard should go under `AnyAPI/AnyAPIGui/`.
- Do not modify `AnyAPI.psm1`.
- Update this index if new files/folders are added to the refactor plan.

---

**Use this index as a quick reference for folder and file locations during the refactor.**
