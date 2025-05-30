# AnyAPI Profile, Header Management & LLM Integration Guide

This guide explains how AnyAPI manages API profiles, authentication, and headers, and how you can leverage LLMs (Large Language Models) to enhance your frontend development experience. It covers secure secret handling, header customization, and best practices for integrating with APIs and LLM-powered endpoints.

---

## 1. Profile Creation and Management

AnyAPI uses profiles to store API connection details, authentication, and custom settings. Profiles are securely persisted (except session-only) and support secrets via OS-level stores.

**Profile Structure**
- `ProfileName`: Unique name for the profile.
- `BaseUrl`: Root URL for API requests.
- `AuthenticationDetails`: Hashtable with AuthType and credentials (API key, token, etc.).
- `PaginationDetails`: (Optional) Pagination config.
- `ErrorHandlingDetails`: (Optional) Error handling config.
- `DefaultHeaders`: (Optional) Headers for every request.
- `CustomSettings`: (Optional) Any extra settings.
- `IsSessionOnly`: If true, profile is not saved to disk.

**Creating/Updating a Profile**
You can use either direct parameters or the builder pattern.

> **Security Note:**  
> Sensitive fields (like ApiKeyValue, TokenValue, etc.) are always stored as SecureString and, if possible, in the OS secure store.

**Session-Only Profiles**
To avoid persisting a profile to disk, set `IsSessionOnly` to true.

---

## 2. Secure Secret Handling

- Secrets are stored using the most secure method available (SecretManagement, Keychain, SecretService, or in-memory).
- When exporting/importing profiles, secrets are scrubbed unless explicitly included.
- If a secret is missing, you’ll see `<<SECRET_NEEDS_RUNTIME_PROVISIONING>>` and must provide it via `-SecureValues`.

---

## 3. Header Construction and Customization

### How AnyAPI Builds Headers

When you call `Invoke-AnyApiEndpoint`, headers are built in this order:

1. **Default Headers**  
   If your profile defines `DefaultHeaders`, these are added first.

2. **Authentication Headers**  
   The function `Build-AuthenticationHeaders` is called:
   - Checks for cached authentication headers (for performance).
   - If not cached, builds them based on your profile’s `AuthenticationDetails`:
     - **ApiKey**: Adds a header (e.g., `X-API-Key`) with your API key.
     - **BearerToken**: Adds an `Authorization` header with your bearer token.
     - **CustomScript**: Executes your custom script block, which can set headers as needed.

3. **User-Supplied Headers**  
   Any headers you pass directly to `Invoke-AnyApiEndpoint` (via the `-Headers` parameter) are applied last and will override previous values.

### Customizing Headers

#### A. Using DefaultHeaders in Your Profile

Set headers for all requests in your profile:

```powershell
$profile = @{
    ProfileName = 'MyApiProfile'
    BaseUrl = 'https://api.example.com'
    DefaultHeaders = @{
        'Accept' = 'application/json'
        'X-Frontend-Client' = 'MyFrontendApp'
    }
    # ...other profile fields...
}
```

#### B. Overriding Headers Per Request

When making a request, use the `-Headers` parameter to override or add headers:

```powershell
Invoke-AnyApiEndpoint -ProfileName 'MyApiProfile' -Path '/data' -Headers @{
    'Authorization' = 'Bearer <token>'
    'X-Request-Id' = [guid]::NewGuid().ToString()
}
```

Headers you specify here take precedence over both default and authentication headers.

#### C. Custom Authentication Script

If your API requires complex or dynamic headers, use the `CustomScript` auth type.
Your script block receives a `$requestContext` object with a `.Headers` hashtable you can modify:

```powershell
$profile = @{
    ProfileName = 'LLMApi'
    BaseUrl = 'https://llm.example.com'
    AuthenticationDetails = @{
        AuthType = 'CustomScript'
        ScriptBlock = {
            param($requestContext, $profile)
            $requestContext.Headers['Authorization'] = "Bearer $($profile.PlainTextSecrets['LLMToken'])"
            $requestContext.Headers['X-LLM-Frontend'] = 'MyFrontendApp'
        }
    }
    # ...other profile fields...
}
```

Secrets are available as plain text via `$profile.PlainTextSecrets['SecretName']`.

---

## 4. Header Precedence

1. User-supplied `-Headers` (highest)
2. Authentication headers (from profile or custom script)
3. `DefaultHeaders` (from profile)

---

## 5. LLM Integration Best Practices for Frontend

- Use `DefaultHeaders` for static headers required by your LLM or API.
- Use `-Headers` for per-request overrides, such as dynamic tokens or request IDs.
- Use `CustomScript` for dynamic or complex authentication, such as time-based tokens or signatures.
- Store secrets securely; never hard-code in scripts.
- Use session-only profiles for temporary or testing credentials.
- For LLM endpoints, include headers that identify your frontend (e.g., `X-Frontend-Client`) for analytics and debugging.

---

## 6. Profile Import/Export

- Use `Export-AnyApiConfiguration` and `Import-AnyApiConfiguration` to move profiles between systems.
- By default, secrets are not exported. Use `-IncludeSecrets` with caution.

---

## 7. Debugging and Secret Management

- Use `Debug-AnyApiSecrets` to inspect secret storage and profile configuration.
- Run `Initialize-SecretStore` for optimal secret management on your platform.

---

## 8. Example: LLM API Integration for Frontend

```powershell
# Create a profile for your LLM API
$profile = @{
    ProfileName = 'LLMFrontend'
    BaseUrl = 'https://llm.example.com/v1'
    AuthenticationDetails = @{
        AuthType = 'ApiKey'
        ApiKeyHeader = 'X-API-Key'
        ApiKeyValue = '<secure>'
    }
    DefaultHeaders = @{
        'Accept' = 'application/json'
        'X-Frontend-Client' = 'MyFrontendApp'
    }
}

# Make a request with additional headers
Invoke-AnyApiEndpoint -ProfileName 'LLMFrontend' -Path '/generate' -Headers @{
    'X-Request-Id' = [guid]::NewGuid().ToString()
    'X-Session-Id' = $sessionId
}
```

---

## 9. Tips for Frontend Developers

- Always use secure storage for secrets.
- Use descriptive profile names for different environments (dev, staging, prod).
- Leverage LLMs for dynamic content, but ensure authentication and headers are managed securely.
- Use custom headers to pass frontend context (user, session, etc.) to your LLM or API.

---

For more advanced scenarios, refer to the official AnyAPI documentation or reach out to your API/LLM provider for integration specifics.