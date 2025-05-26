# AnyAPI GUI - PowerShell REST API Manager

## Overview

AnyAPI GUI is a modern web-based interface for managing PowerShell REST API interactions. It provides a comprehensive solution for creating API profiles, testing endpoints, managing credentials securely, and generating PowerShell code. The project consists of a PowerShell backend module with an HTTP server and a vanilla JavaScript frontend.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AnyAPI GUI Architecture                   │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (Vanilla JS)          │  Backend (PowerShell)          │
│  ├── app.js (Main Controller)   │  ├── Start-AnyApiServer.ps1    │
│  ├── api-client.js             │  ├── AnyAPI.psm1 (Core Module) │
│  ├── profile-manager.js        │  │   ├── Profile Management     │
│  ├── endpoint-tester.js        │  │   ├── Authentication         │
│  ├── template-manager.js       │  │   ├── Pagination             │
│  ├── secret-manager.js         │  │   └── Secret Storage         │
│  └── styles.css (Dark Mode)    │  └── HTTP Server & API Routes  │
├─────────────────────────────────────────────────────────────────┤
│                    Communication: REST API                       │
├─────────────────────────────────────────────────────────────────┤
│  Security Layer: PowerShell SecretManagement + SecretStore      │
│  Storage: JSON Files + OS-level Secret Storage                  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### Backend (PowerShell)

#### 1. **Start-AnyApiServer.ps1**
- **Purpose**: Web server host for the GUI
- **Key Features**:
  - HTTP listener on configurable port (default: 8080)
  - CORS header handling
  - Static file serving from `www/` directory
  - REST API route handling
  - Integration with AnyAPI.psm1 module

#### 2. **AnyAPI.psm1** 
- **Purpose**: Core PowerShell module providing API management functionality
- **Key Classes**:
  - `ApiRequestBuilder`: Fluent interface for building API requests
  - `ProfileInitializationBuilder`: Builder pattern for profile creation
- **Core Features**:
  - **Profile Management**: Store/retrieve API configurations
  - **Authentication**: Bearer, Basic, API Key, Custom Script auth
  - **Pagination**: Auto-detection and handling of different pagination patterns
  - **Secret Storage**: Cross-platform secure credential storage
  - **Request Processing**: HTTP requests with retry logic and error handling

**Secret Storage Providers** (Hierarchy):
1. `SecretManagement` (Optimal) - Microsoft.PowerShell.SecretManagement
2. `DPAPI_InMemory` (Windows) - Windows Data Protection API
3. `Keychain` (macOS) - macOS Keychain integration
4. `SecretService` (Linux) - GNOME/KDE Secret Service
5. `PlainText_InMemory_Only` (Fallback) - Session-only storage

### Frontend (Vanilla JavaScript)

#### 1. **app.js** - Main Application Controller
- **Purpose**: Central coordination and initialization
- **Key Responsibilities**:
  - Application lifecycle management
  - Dark mode handling
  - Global error handling
  - Navigation coordination
  - Component initialization and communication
- **Key Methods**:
  - `init()`: Initialize all managers and check connections
  - `showSection()`: Handle navigation between sections
  - `refreshData()`: Coordinate data refresh across managers

#### 2. **api-client.js** - Backend Communication
- **Purpose**: Abstraction layer for PowerShell backend communication
- **Key Features**:
  - Connection monitoring and retry logic
  - SecretStore password management
  - Request/response transformation
  - Error handling and timeout management
- **API Endpoints**:
  - `/api/profiles` - Profile CRUD operations
  - `/api/test` - Endpoint testing
  - `/api/secrets/*` - Secret management
  - `/api/templates` - Template operations
  - `/api/export` & `/api/import` - Configuration management

#### 3. **profile-manager.js** - API Profile Management
- **Purpose**: Complete profile lifecycle management
- **Key Features**:
  - **Profile CRUD**: Create, read, update, delete profiles
  - **Template Integration**: Built-in templates for common APIs (GitHub, Microsoft Graph, etc.)
  - **Form Management**: Dynamic form generation based on auth type
  - **Validation**: Client-side validation with server-side verification
  - **Credential Coordination**: Integrates with secret-manager for secure storage

**Profile Structure**:
```javascript
{
  name: "GitHub API",
  baseUrl: "https://api.github.com",
  authType: "Bearer|Basic|ApiKey|Custom",
  credentials: { token: "***", username: "***", password: "***" },
  headers: { "Accept": "application/vnd.github.v3+json" },
  paginationType: "LinkHeader|Cursor|PageBased|OffsetLimit|None",
  paginationDetails: { /* type-specific config */ },
  customSettings: { /* API-specific settings */ },
  customAuthScript: "PowerShell script for custom auth",
  isSessionOnly: false
}
```

#### 4. **endpoint-tester.js** - API Testing Interface
- **Purpose**: Interactive API endpoint testing with enhanced debugging
- **Key Features**:
  - **Request Builder**: Visual interface for constructing API requests
  - **Method Selection**: GET, POST, PUT, PATCH, DELETE support
  - **GitHub API Integration**: Special validation and helpers for GitHub API
  - **Response Display**: Formatted JSON with syntax highlighting
  - **Request History**: Persistent history with filtering and replay
  - **Code Generation**: PowerShell code generation from GUI interactions

**GitHub API Enhancements**:
- Real-time endpoint validation with regex patterns
- Auto-suggestions for common GitHub endpoints
- Enhanced error parsing with actionable recommendations
- Helper panel with quick-fill buttons

#### 5. **template-manager.js** - API Templates
- **Purpose**: Quick-start templates for common APIs
- **Built-in Templates**:
  - GitHub API (REST v3)
  - Microsoft Graph
  - OpenAI API
  - Slack API
  - Jira Cloud
  - Stripe API
  - ConnectWise Manage (with custom auth script)
- **Custom Templates**: User-defined templates with import/export
- **Template Structure**:
```javascript
{
  id: "github",
  name: "GitHub API",
  baseUrl: "https://api.github.com",
  authType: "Bearer",
  requiredSecrets: ["token"],
  authFieldMapping: { /* Coordinated credential fields */ },
  paginationType: "LinkHeader",
  customAuthScript: "/* For custom auth types */",
  sampleEndpoints: [/* Example endpoints */]
}
```

#### 6. **secret-manager.js** - Credential Security
- **Purpose**: Secure credential management with SecretStore integration
- **Key Features**:
  - **SecretStore Integration**: Unlock/manage PowerShell SecretStore
  - **Auto-unlock**: Session-based password caching
  - **Secret Validation**: Password strength and format validation
  - **UI Components**: Secure input fields with show/hide toggles
  - **Storage Recommendations**: Guide users to optimal security setup

## Data Flow

### Profile Creation Flow
```
1. User selects template (optional) → template-manager.js
2. Form pre-population → profile-manager.js
3. User enters credentials → secret-manager.js validates
4. Form submission → profile-manager.js collects data
5. API call → api-client.js → PowerShell backend
6. Backend validation & storage → AnyAPI.psm1
7. Credential encryption → SecretManagement/SecretStore
8. Response handling → profile-manager.js updates UI
```

### Endpoint Testing Flow
```
1. User selects profile → endpoint-tester.js
2. Profile validation (GitHub API special handling)
3. Request building → Dynamic form based on HTTP method
4. Test execution → api-client.js → PowerShell backend
5. Backend processing → AnyAPI.psm1 (auth, pagination, etc.)
6. Response formatting → Enhanced error handling for APIs
7. History storage → localStorage + display update
8. Code generation → PowerShell script output
```

## Security Model

### Credential Storage Hierarchy
1. **SecretManagement** (Preferred): Uses PowerShell SecretStore vault with AES encryption
2. **Platform-Specific**: Windows DPAPI, macOS Keychain, Linux Secret Service  
3. **Fallback**: In-memory only (session-based)

### Frontend Security
- Credentials masked in UI (`***MASKED***`)
- Secure input components with show/hide toggles
- No plaintext credential storage in localStorage
- Session-based SecretStore password caching

### Backend Security  
- Credential encryption before storage
- External reference system (`EXTERNAL:Provider:Location:Key`)
- Automatic secret resolution for API calls
- Custom authentication script sandboxing

## Configuration & Persistence

### Profile Storage
- **Location**: Platform-specific config directory
  - Windows: `%APPDATA%\AnyAPI\profiles.json`
  - macOS/Linux: `~/.config/anyapi/profiles.json`
- **Format**: JSON with encrypted credential references
- **Session-Only**: Profiles marked as session-only are not persisted

### Frontend State
- **Request History**: localStorage (`anyapi_request_history`)
- **Custom Templates**: localStorage (`anyapi_custom_templates`)
- **UI Preferences**: localStorage (dark mode, etc.)
- **SecretStore Password**: sessionStorage (auto-unlock)

## API Endpoints (Backend)

### Profile Management
- `GET /api/profiles` - List all profiles
- `POST /api/profiles` - Create new profile
- `PUT /api/profiles/{name}` - Update existing profile
- `DELETE /api/profiles/{name}` - Delete profile
- `GET /api/profiles/{name}/details?includeSecrets=true` - Get detailed profile info

### Testing & Operations
- `POST /api/test` - Test API endpoint
- `GET /api/templates` - Get built-in templates
- `POST /api/export` - Export configuration
- `POST /api/import` - Import configuration

### Secret Management
- `GET /api/secrets/info` - Get secret storage information
- `POST /api/secrets/unlock` - Unlock SecretStore
- `GET /api/health` - Health check endpoint

## UI Components & Styling

### CSS Architecture
- **CSS Variables**: Comprehensive theming system
- **Dark Mode**: Complete dark/light theme support
- **Responsive Design**: Mobile-first approach with breakpoints
- **Component-Based**: Modular CSS with component isolation

### Key UI Patterns
- **Modal System**: Reusable modal components with backdrop
- **Form Builders**: Dynamic form generation based on configuration  
- **Notifications**: Toast notification system with multiple types
- **Loading States**: Consistent loading indicators and skeletons
- **Code Display**: Syntax-highlighted code blocks with copy functionality

## Extension Points

### Adding New Authentication Types
1. **Backend**: Add auth type to `AnyAPI.psm1` authentication handling
2. **Frontend**: Add case to `profile-manager.js` `toggleAuthFields()`
3. **Templates**: Update templates with new auth type examples
4. **Validation**: Add validation rules to form processing

### Adding New API Templates  
1. **Built-in**: Add to `template-manager.js` constructor
2. **Custom**: Use template creation UI or import JSON
3. **Coordination**: Include `authFieldMapping` for credential coordination
4. **Testing**: Add sample endpoints for validation

### Custom Pagination Types
1. **Backend**: Extend pagination detection in `AnyAPI.psm1`
2. **Frontend**: Add pagination type to UI dropdowns
3. **Configuration**: Update pagination detail forms
4. **Templates**: Include pagination examples in templates

## Development Guidelines

### Code Organization Principles
- **Separation of Concerns**: Each manager handles its specific domain
- **Event-Driven**: Managers communicate via custom events
- **Error Boundaries**: Comprehensive error handling at each layer
- **Progressive Enhancement**: Graceful degradation when features unavailable

### Debugging Features
- **Extensive Logging**: Console logging with categorized prefixes
- **Connection Monitoring**: Real-time backend connection status
- **Validation Feedback**: Real-time form validation with helpful messages
- **Error Context**: Detailed error messages with troubleshooting hints

### Performance Considerations
- **Lazy Loading**: Components initialize on demand
- **Caching**: Authentication headers and pagination type caching
- **Efficient DOM**: Minimal DOM manipulation with template-based rendering
- **Memory Management**: Proper cleanup of event listeners and timeouts

## Common Modification Patterns

### Adding New Features
1. Create new manager class if needed (follow existing patterns)
2. Add backend API endpoints in `Start-AnyApiServer.ps1`
3. Implement backend logic in `AnyAPI.psm1`
4. Add UI components following established patterns
5. Update main app coordination in `app.js`

### Extending Existing Features
1. Identify the responsible manager class
2. Add new methods following existing naming conventions
3. Update related UI components
4. Add appropriate error handling and validation
5. Update templates/examples if applicable

### Security Enhancements
1. Backend changes go in `AnyAPI.psm1` secret storage functions
2. Frontend changes in `secret-manager.js`
3. Always maintain backward compatibility with existing storage
4. Test across all supported platforms (Windows/macOS/Linux)

This architecture provides a solid foundation for a feature-rich API management interface while maintaining security, extensibility, and user experience standards.