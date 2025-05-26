# AnyAPI Module v0.3.0 - PowerShell 7+ with Enhanced Secret Storage & Custom Authentication

A high-performance PowerShell module for interacting with REST APIs with built-in authentication, pagination, retry logic, enhanced cross-platform secret storage, and fluent parameter builders.

## Features

### 🚀 Core Capabilities
- **Universal REST API Support** - Works with any REST API
- **Multiple Authentication Methods** - API Keys, Bearer Tokens, Custom Scripts
- **Intelligent Pagination** - Auto-detects and handles 4 pagination types
- **Enhanced Secret Storage** - Microsoft.PowerShell.SecretManagement integration with fallbacks
- **Performance Optimized** - Caching, batching, and efficient memory management
- **Robust Error Handling** - Exponential backoff, retry logic, rate limiting support
- **Fluent Builder Pattern** - Chainable parameter builders for cleaner code

### 🔐 Authentication Types
- **API Key** - Header or query parameter based
- **Bearer Token** - OAuth2 and JWT tokens
- **Custom Script** - Dynamic authentication via PowerShell scripts with full secret access

### 📄 Pagination Support
- **Link Header** - RFC 5988 compliant (GitHub, GitLab style)
- **Cursor-based** - Microsoft Graph, NextPageToken style
- **Page-based** - Traditional page/pageSize parameters
- **Offset/Limit** - Database-style pagination

### 🔒 Enhanced Cross-Platform Security
- **SecretManagement Integration** - Microsoft.PowerShell.SecretManagement and SecretStore (preferred)
- **Windows** - DPAPI encryption fallback
- **macOS** - Keychain integration fallback
- **Linux** - Secret Service (GNOME/KDE) fallback
- **Persistent Secrets** - Credentials automatically saved and retrieved between sessions
- **Multiple Vault Support** - Organize secrets by environment or sensitivity

### 🔧 Builder Pattern Support
- **ApiRequestBuilder** - Fluent interface for building API requests
- **ProfileInitializationBuilder** - Chainable profile configuration
- **Backward Compatibility** - All existing parameter-based syntax still works

## Requirements

- **PowerShell 7.2+** (Cross-platform support)
- **Windows** - Windows 10/11 or Windows Server 2016+
- **macOS** - macOS 10.14+ with Keychain access
- **Linux** - Distribution with Secret Service support
- **Optional** - Microsoft.PowerShell.SecretManagement and SecretStore modules (auto-installed when using Initialize-SecretStore)

## Installation

```powershell
# Import the module
Import-Module .\AnyAPI.psm1

# Verify installation
Get-Command -Module AnyAPI

# Optional: Set up enhanced secret storage (recommended)
Initialize-SecretStore

# Test secret storage capabilities
Test-SecretStorage
Get-SecretStorageInfo
```

## Quick Start

### 1. Enhanced Secret Storage Setup (Recommended)

```powershell
# One-time setup for persistent, secure secret storage
Initialize-SecretStore

# Check what secret storage is being used
Get-SecretStorageInfo

# Test that everything is working
Test-SecretStorage
```

### 2. Initialize an API Profile (Traditional Syntax)

```powershell
# GitHub API with personal access token
Initialize-AnyApiProfile -ProfileName "GitHub" `
    -BaseUrl "https://api.github.com" `
    -AuthenticationDetails @{
        AuthType = "BearerToken"
        TokenValue = "ghp_your_token_here"  # Automatically stored securely
    } `
    -PaginationDetails @{
        Type = "LinkHeader"
    }

# REST API with API Key
Initialize-AnyApiProfile -ProfileName "MyAPI" `
    -BaseUrl "https://api.example.com" `
    -AuthenticationDetails @{
        AuthType = "ApiKey"
        ApiKeyLocation = "Header"
        ApiKeyName = "X-API-Key"
        ApiKeyValue = "your-api-key-here"  # Automatically stored securely
    } `
    -DefaultHeaders @{
        "Accept" = "application/json"
        "User-Agent" = "PowerShell-AnyAPI/0.3.0"
    }
```

### 2a. Initialize an API Profile (Builder Pattern - NEW!)

```powershell
# GitHub API using fluent builder pattern
$profile = New-ProfileInitializationBuilder -ProfileName "GitHub" `
    -BaseUrl "https://api.github.com" `
    -AuthenticationDetails @{
        AuthType = "BearerToken"
        TokenValue = "ghp_your_token_here"  # Stored in SecretStore
    } |
    WithPagination @{ Type = "LinkHeader" } |
    WithDefaultHeaders @{
        "Accept" = "application/vnd.github.v3+json"
        "User-Agent" = "PowerShell-AnyAPI/0.3.0"
    } |
    ForceOverwrite $true

Initialize-AnyApiProfile -ProfileBuilder $profile

# REST API with fluent configuration
$apiProfile = New-ProfileInitializationBuilder -ProfileName "MyAPI" `
    -BaseUrl "https://api.example.com" `
    -AuthenticationDetails @{
        AuthType = "ApiKey"
        ApiKeyLocation = "Header"
        ApiKeyName = "X-API-Key"
        ApiKeyValue = "your-api-key-here"
    } |
    WithDefaultHeaders @{
        "Accept" = "application/json"
        "Content-Type" = "application/json"
    } |
    WithPagination @{
        Type = "PageBased"
        PageSizeParameter = "limit"
        DefaultPageSize = 50
    } |
    WithErrorHandling @{
        MaxRetries = 3
        InitialBackoffMs = 1000
    } |
    SessionOnly $false

Initialize-AnyApiProfile -ProfileBuilder $apiProfile
```

### 3. Make API Calls (Traditional Syntax)

```powershell
# Simple GET request - secrets automatically retrieved
$repos = Invoke-AnyApiEndpoint -ProfileName "GitHub" -Endpoint "/user/repos"

# GET with query parameters
$issues = Invoke-AnyApiEndpoint -ProfileName "GitHub" `
    -Endpoint "/repos/owner/repo/issues" `
    -QueryParameters @{ state = "open"; per_page = 50 }

# POST request with body
$newIssue = Invoke-AnyApiEndpoint -ProfileName "GitHub" `
    -Endpoint "/repos/owner/repo/issues" `
    -Method "POST" `
    -Body @{
        title = "New issue"
        body = "Issue description"
        labels = @("bug", "enhancement")
    }
```

### 3a. Make API Calls (Builder Pattern - NEW!)

```powershell
# Simple GET request using builder
$request = New-ApiRequestBuilder -ProfileName "GitHub" -Endpoint "/user/repos"
$repos = Invoke-AnyApiEndpoint -RequestBuilder $request

# Complex request with fluent chaining
$issues = New-ApiRequestBuilder -ProfileName "GitHub" -Endpoint "/repos/owner/repo/issues" |
    WithMethod "GET" |
    WithQueryParameters @{ state = "open"; per_page = 50 } |
    WithHeaders @{ "Accept" = "application/vnd.github.v3+json" } |
    WithRetryPolicy 5 2000 |
    Invoke-AnyApiEndpoint -RequestBuilder $_

# POST request with fluent configuration
$newIssue = New-ApiRequestBuilder -ProfileName "GitHub" -Endpoint "/repos/owner/repo/issues" |
    WithMethod "POST" |
    WithBody @{
        title = "New issue"
        body = "Issue description"
        labels = @("bug", "enhancement")
    } |
    WithContentType "application/json" |
    WithRetryPolicy 3 1000 |
    SuppressErrors $false

$result = Invoke-AnyApiEndpoint -RequestBuilder $newIssue

# Pagination with builder pattern
$allRepos = New-ApiRequestBuilder -ProfileName "GitHub" -Endpoint "/user/repos" |
    WithPagination $true 100 1000 |
    WithQueryParameters @{ sort = "updated"; direction = "desc" }

$repositories = Invoke-AnyApiEndpoint -RequestBuilder $allRepos
```

## Custom Authentication Scripts

### Enhanced Secret Access in Custom Scripts

Custom authentication scripts now have multiple ways to access secrets with full SecretStore integration:

```powershell
$advancedAuthScript = {
    param($RequestContext, $Profile)
    
    # Method 1: Helper functions (recommended)
    $apiKey = $RequestContext.GetPlainTextSecret.Invoke('ApiKey')
    $privateKey = $RequestContext.GetSecureSecret.Invoke('PrivateKey')  # SecureString
    
    # Method 2: PlainTextSecrets hashtable
    $clientSecret = $Profile.PlainTextSecrets['ClientSecret']
    
    # Method 3: SecureSecrets hashtable (for SecureString operations)
    $refreshTokenSecure = $Profile.SecureSecrets['RefreshToken']
    
    # Method 4: Traditional access (now returns proper SecureString)
    $tokenSecure = $Profile.AuthenticationDetails.TokenValue
    
    # Use secrets for authentication logic
    if ($apiKey) {
        $RequestContext.Headers["Authorization"] = "Bearer $apiKey"
    }
}
```

### OAuth2 Token Refresh Example

```powershell
$oAuth2RefreshScript = {
    param($RequestContext, $Profile)
    
    # Access secrets using enhanced resolution
    $clientId = $RequestContext.GetPlainTextSecret.Invoke('ClientId')
    $clientSecret = $RequestContext.GetPlainTextSecret.Invoke('ClientSecret')
    $refreshToken = $RequestContext.GetPlainTextSecret.Invoke('RefreshToken')
    
    # Check if token needs refresh
    $tokenExpiry = $Profile.CustomSettings.TokenExpiry
    if (-not $tokenExpiry -or (Get-Date) -gt [DateTime]$tokenExpiry) {
        Write-Verbose "Token expired, refreshing..."
        
        # Make token refresh request
        $tokenEndpoint = "$($Profile.BaseUrl)/oauth/token"
        $refreshBody = @{
            grant_type = "refresh_token"
            refresh_token = $refreshToken
            client_id = $clientId
            client_secret = $clientSecret
        }
        
        try {
            $response = Invoke-RestMethod -Uri $tokenEndpoint -Method POST -Body $refreshBody -ContentType "application/x-www-form-urlencoded"
            
            # Update headers with new token
            $RequestContext.Headers["Authorization"] = "Bearer $($response.access_token)"
            
            # Store new tokens back to SecretStore for future use
            if ($response.refresh_token) {
                $newRefreshSecure = ConvertTo-SecureString $response.refresh_token -AsPlainText -Force
                Set-Secret -Name "AnyAPI.$($RequestContext.ProfileName).RefreshToken" -Secret $newRefreshSecure -Vault "AnyAPI-SecretStore"
            }
            
            $newAccessSecure = ConvertTo-SecureString $response.access_token -AsPlainText -Force
            Set-Secret -Name "AnyAPI.$($RequestContext.ProfileName).TokenValue" -Secret $newAccessSecure -Vault "AnyAPI-SecretStore"
            
            Write-Verbose "OAuth2 token refreshed and stored successfully"
        }
        catch {
            throw "Failed to refresh OAuth2 token: $($_.Exception.Message)"
        }
    } else {
        # Use existing token
        $currentToken = $RequestContext.GetPlainTextSecret.Invoke('TokenValue')
        $RequestContext.Headers["Authorization"] = "Bearer $currentToken"
    }
}

# Initialize OAuth2 profile
Initialize-AnyApiProfile -ProfileName "OAuth2API" `
    -BaseUrl "https://api.oauth-example.com" `
    -AuthenticationDetails @{
        AuthType = "CustomScript"
        AuthScriptBlock = $oAuth2RefreshScript
        ClientId = "your-client-id"
        ClientSecret = "your-client-secret"      # Stored securely
        TokenValue = "initial-access-token"      # Stored securely
        RefreshToken = "your-refresh-token"      # Stored securely
    } `
    -CustomSettings @{
        TokenExpiry = (Get-Date).AddHours(1)
    }
```

### ConnectWise Manage API Example

```powershell
$connectWiseScript = {
    param($RequestContext, $Profile)
    
    Write-Verbose "ConnectWise authentication executing for profile '$($RequestContext.ProfileName)'"
    
    # Get ConnectWise credentials with multiple fallback methods
    $company = $Profile.CustomSettings.Company ?? "your-company-id"
    $publicKey = $RequestContext.GetPlainTextSecret.Invoke('PublicKey')
    $privateKey = $RequestContext.GetPlainTextSecret.Invoke('PrivateKey')
    $clientId = $RequestContext.GetPlainTextSecret.Invoke('ClientId')
    
    if (-not $company -or -not $publicKey -or -not $privateKey -or -not $clientId) {
        throw "Missing required ConnectWise credentials: Company, PublicKey, PrivateKey, and ClientId are all required"
    }
    
    # Create ConnectWise authentication
    # Format: "company+publickey:privatekey" -> Base64
    $authString = "$company+$publicKey`:$privateKey"
    $encodedAuth = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($authString))
    
    # Set ConnectWise headers
    $RequestContext.Headers["Authorization"] = "Basic $encodedAuth"
    $RequestContext.Headers["clientId"] = $clientId
    $RequestContext.Headers["Accept"] = "application/json"
    $RequestContext.Headers["Content-Type"] = "application/json"
    
    Write-Verbose "ConnectWise authentication headers set successfully"
}

# Initialize ConnectWise profile
Initialize-AnyApiProfile -ProfileName "ConnectWise" `
    -BaseUrl "https://your-cw-server.com/v4_6_release/apis/3.0" `
    -AuthenticationDetails @{
        AuthType = "CustomScript"
        AuthScriptBlock = $connectWiseScript
        PublicKey = "your-public-key"          # Stored securely
        PrivateKey = "your-private-key"        # Stored securely  
        ClientId = "your-client-uuid"          # Stored securely
    } `
    -CustomSettings @{
        Company = "your-company-identifier"
    } `
    -Force

# Test ConnectWise authentication
Invoke-AnyApiEndpoint -ProfileName "ConnectWise" -Endpoint "/system/info" -Verbose

# Get companies with pagination
$companies = Invoke-AnyApiEndpoint -ProfileName "ConnectWise" -Endpoint "/company/companies" -GetAllPages

# Search for tickets
$tickets = Invoke-AnyApiEndpoint -ProfileName "ConnectWise" -Endpoint "/service/tickets" `
    -QueryParameters @{ 
        conditions = "status/name='New'"
        pageSize = 25 
    }
```

### Dynamic API Key Rotation Example

```powershell
$dynamicKeyScript = {
    param($RequestContext, $Profile)
    
    # Access multiple API keys from SecretStore
    $primaryKey = $RequestContext.GetPlainTextSecret.Invoke('PrimaryApiKey')
    $secondaryKey = $RequestContext.GetPlainTextSecret.Invoke('SecondaryApiKey')
    $backupKey = $RequestContext.GetPlainTextSecret.Invoke('BackupApiKey')
    
    # Intelligent key selection based on time of day
    $currentHour = (Get-Date).Hour
    $selectedKey = switch ($currentHour) {
        { $_ -ge 0 -and $_ -lt 8 } { $backupKey }     # Midnight to 8 AM
        { $_ -ge 8 -and $_ -lt 16 } { $primaryKey }   # 8 AM to 4 PM  
        { $_ -ge 16 -and $_ -lt 24 } { $secondaryKey } # 4 PM to Midnight
    }
    
    if (-not $selectedKey) {
        throw "No API key available for current time slot"
    }
    
    $keyType = if ($selectedKey -eq $primaryKey) { "Primary" } 
               elseif ($selectedKey -eq $secondaryKey) { "Secondary" }
               else { "Backup" }
    
    Write-Verbose "Using $keyType API key for hour $currentHour"
    $RequestContext.Headers["X-API-Key"] = $selectedKey
    $RequestContext.Headers["X-Key-Type"] = $keyType
    $RequestContext.Headers["X-Key-Rotation-Hour"] = $currentHour
}

# Initialize dynamic key profile
Initialize-AnyApiProfile -ProfileName "RotatingAPI" `
    -BaseUrl "https://api.enterprise.com" `
    -AuthenticationDetails @{
        AuthType = "CustomScript"
        AuthScriptBlock = $dynamicKeyScript
    } `
    -CustomSettings @{
        PrimaryApiKey = "primary-key-value"      # Stored securely
        SecondaryApiKey = "secondary-key-value"  # Stored securely  
        BackupApiKey = "backup-key-value"        # Stored securely
    }
```

## Secret Storage Management

### SecretStore Functions

```powershell
# Initialize SecretStore (one-time setup)
Initialize-SecretStore

# Test secret storage capabilities  
Test-SecretStorage

# Get detailed information about secret storage
Get-SecretStorageInfo

# Reset secret storage provider detection
Reset-SecretStorage

# Check what provider is being used
Get-SecretStorageProvider
```

### Working with Secrets

```powershell
# Secrets are automatically managed, but you can work with them directly

# List all AnyAPI secrets
Get-SecretInfo -Vault "AnyAPI-SecretStore" | Where-Object Name -like "AnyAPI.*"

# Get a specific secret (for debugging)
Get-Secret -Name "AnyAPI.ProfileName.TokenValue" -Vault "AnyAPI-SecretStore" -AsPlainText

# Manually store a secret (usually not needed)
$secureValue = ConvertTo-SecureString "secret-value" -AsPlainText -Force
Set-Secret -Name "AnyAPI.ProfileName.CustomSecret" -Secret $secureValue -Vault "AnyAPI-SecretStore"

# Remove a specific secret
Remove-Secret -Name "AnyAPI.ProfileName.TokenValue" -Vault "AnyAPI-SecretStore" -Confirm:$false
```

## Advanced Configuration

### Custom Authentication Script with Full Features

```powershell
$fullFeaturedAuthScript = {
    param($RequestContext, $Profile)
    
    # Access profile name and request details
    $profileName = $RequestContext.ProfileName
    $method = $RequestContext.Method
    $uri = $RequestContext.Uri
    
    Write-Verbose "Advanced auth executing for profile '$profileName' - $method $uri"
    
    # Multiple secret access methods
    $apiKey = $RequestContext.GetPlainTextSecret.Invoke('ApiKey')
    $signature = $RequestContext.GetPlainTextSecret.Invoke('SignatureKey')
    
    # Custom settings access
    $region = $Profile.CustomSettings.Region ?? "us-east-1"
    $service = $Profile.CustomSettings.Service ?? "api"
    
    # Time-based operations
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $nonce = [System.Guid]::NewGuid().ToString()
    
    # Create signature (example AWS-style)
    $stringToSign = "$method|$([System.Uri]$uri).PathAndQuery|$timestamp|$nonce"
    $hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($signature))
    $signatureBytes = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($stringToSign))
    $computedSignature = [Convert]::ToBase64String($signatureBytes)
    
    # Set multiple headers
    $RequestContext.Headers["Authorization"] = "API-Key $apiKey"
    $RequestContext.Headers["X-Timestamp"] = $timestamp.ToString()
    $RequestContext.Headers["X-Nonce"] = $nonce
    $RequestContext.Headers["X-Signature"] = $computedSignature
    $RequestContext.Headers["X-Region"] = $region
    $RequestContext.Headers["X-Service"] = $service
    
    Write-Verbose "Advanced authentication completed with signature: $($computedSignature.Substring(0,10))..."
}

Initialize-AnyApiProfile -ProfileName "AdvancedAPI" `
    -BaseUrl "https://api.advanced.com" `
    -AuthenticationDetails @{
        AuthType = "CustomScript"
        AuthScriptBlock = $fullFeaturedAuthScript
        ApiKey = "your-api-key"
        SignatureKey = "your-signature-key"
    } `
    -CustomSettings @{
        Region = "us-west-2"
        Service = "myservice"
    }
```

### Advanced Pagination Configuration

```powershell
# Custom pagination for non-standard APIs
Initialize-AnyApiProfile -ProfileName "CustomAPI" `
    -BaseUrl "https://api.custom.com" `
    -AuthenticationDetails @{ AuthType = "ApiKey"; ApiKeyName = "key"; ApiKeyValue = "secret" } `
    -PaginationDetails @{
        Type = "PageBased"
        PageParameter = "pageNum"           # Default: "page"
        PageSizeParameter = "itemsPerPage"  # Default: "pageSize"
        TotalPagesField = "totalPages"      # Field containing total pages
        HasMoreField = "hasNextPage"        # Boolean field for more pages
        ItemsField = "results"              # Field containing items array
        DefaultPageSize = 25                # Default page size
    }

# Offset/Limit style pagination
Initialize-AnyApiProfile -ProfileName "DatabaseAPI" `
    -BaseUrl "https://api.database.com" `
    -AuthenticationDetails @{ AuthType = "BearerToken"; TokenValue = "token" } `
    -PaginationDetails @{
        Type = "OffsetLimit"
        OffsetParameter = "skip"      # Default: "offset"
        LimitParameter = "take"       # Default: "limit"
        TotalField = "totalCount"     # Field with total record count
        ItemsField = "data"           # Field containing items
    }

# Cursor-based pagination (Microsoft Graph style)
Initialize-AnyApiProfile -ProfileName "GraphAPI" `
    -BaseUrl "https://graph.microsoft.com/v1.0" `
    -AuthenticationDetails @{ AuthType = "BearerToken"; TokenValue = "token" } `
    -PaginationDetails @{
        Type = "Cursor"
        NextTokenField = "@odata.nextLink"    # Field with next page URL
        TokenParameter = "skiptoken"          # Query parameter for token
        ItemsField = "value"                  # Field containing items
    }
```

### Error Handling and Retry Logic

```powershell
# Configure retry behavior using builder pattern
$profile = New-ProfileInitializationBuilder -ProfileName "ReliableAPI" `
    -BaseUrl "https://api.sometimes-fails.com" `
    -AuthenticationDetails @{ AuthType = "ApiKey"; ApiKeyName = "key"; ApiKeyValue = "secret" } |
    WithErrorHandling @{
        MaxRetries = 5
        InitialBackoffMs = 2000
        ExponentialBackoff = $true
        RetryOn = @(429, 500, 502, 503, 504)  # HTTP status codes to retry
    }

Initialize-AnyApiProfile -ProfileBuilder $profile

# Use in requests with builder pattern
$request = New-ApiRequestBuilder -ProfileName "ReliableAPI" -Endpoint "/data" |
    WithRetryPolicy 3 1000 |
    SuppressErrors $true  # Don't throw on errors, return null instead

$result = Invoke-AnyApiEndpoint -RequestBuilder $request
```

## Builder Pattern Guide

### ApiRequestBuilder Class

The `ApiRequestBuilder` provides a fluent interface for constructing API requests:

```powershell
# Create a new builder
$builder = New-ApiRequestBuilder -ProfileName "MyAPI" -Endpoint "/data"

# Chain methods for configuration
$request = $builder |
    WithMethod "POST" |
    WithQueryParameters @{ filter = "active"; sort = "name" } |
    WithPathParameters @{ id = "123" } |
    WithBody @{ name = "New Item"; status = "active" } |
    WithHeaders @{ "Custom-Header" = "value" } |
    WithContentType "application/json" |
    WithRetryPolicy 5 2000 |
    WithSecureValues @{ ApiKey = "secret-key" } |
    WithPagination $true 50 10 |
    WithStream { param($item) Write-Output $item.name } |
    SuppressErrors $true

# Execute the request
$result = Invoke-AnyApiEndpoint -RequestBuilder $request
```

#### Available Builder Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `WithMethod` | `[string]$Method` | Set HTTP method (GET, POST, PUT, PATCH, DELETE) |
| `WithQueryParameters` | `[hashtable]$QueryParameters` | Add query string parameters |
| `WithPathParameters` | `[hashtable]$PathParameters` | Add path parameters for URL templating |
| `WithBody` | `[object]$Body` | Set request body (object, hashtable, or string) |
| `WithHeaders` | `[hashtable]$Headers` | Add custom headers |
| `WithContentType` | `[string]$ContentType` | Set Content-Type header |
| `WithRetryPolicy` | `[int]$MaxRetries, [int]$InitialBackoffMs` | Configure retry behavior |
| `WithSecureValues` | `[hashtable]$SecureValues` | Provide runtime secrets |
| `WithPagination` | `[bool]$GetAllPages, [int]$PageSize, [int]$MaxPages` | Enable pagination |
| `WithStream` | `[scriptblock]$Stream` | Enable streaming with callback |
| `SuppressErrors` | `[bool]$SuppressErrors` | Control error handling |

### ProfileInitializationBuilder Class

The `ProfileInitializationBuilder` provides a fluent interface for profile creation:

```powershell
# Create a new profile builder
$builder = New-ProfileInitializationBuilder -ProfileName "ComplexAPI" `
    -BaseUrl "https://api.complex.com/v2" `
    -AuthenticationDetails @{
        AuthType = "BearerToken"
        TokenValue = "your-token"
    }

# Chain configuration methods
$profile = $builder |
    WithPagination @{
        Type = "Cursor"
        NextTokenField = "nextToken"
        ItemsField = "results"
    } |
    WithErrorHandling @{
        MaxRetries = 5
        InitialBackoffMs = 2000
        ExponentialBackoff = $true
    } |
    WithDefaultHeaders @{
        "Accept" = "application/json"
        "User-Agent" = "MyApp/1.0"
    } |
    WithCustomSettings @{
        RateLimit = 1000
        Timeout = 30
    } |
    WithSecureValues @{
        RefreshToken = "refresh-token-value"
    } |
    SessionOnly $false |
    ForceOverwrite $true

# Initialize the profile
Initialize-AnyApiProfile -ProfileBuilder $profile
```

#### Available Profile Builder Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `WithPagination` | `[hashtable]$PaginationDetails` | Configure pagination settings |
| `WithErrorHandling` | `[hashtable]$ErrorHandlingDetails` | Set error handling and retry policies |
| `WithDefaultHeaders` | `[hashtable]$DefaultHeaders` | Add default headers for all requests |
| `WithCustomSettings` | `[hashtable]$CustomSettings` | Store custom configuration |
| `WithSecureValues` | `[hashtable]$SecureValues` | Provide secure values for secrets |
| `SessionOnly` | `[bool]$NoLocalFilePersistence` | Control profile persistence |
| `ForceOverwrite` | `[bool]$Force` | Allow overwriting existing profiles |

## Profile Management

### View Profiles

```powershell
# List all profiles
Get-AnyApiProfile

# Get specific profile
Get-AnyApiProfile -ProfileName "GitHub"

# Get multiple profiles
Get-AnyApiProfile -ProfileName @("GitHub", "MyAPI")
```

### Export/Import Profiles

```powershell
# Export profiles (secrets scrubbed by default)
Export-AnyApiConfiguration -Path ".\api-profiles.json"

# Export with secrets (USE WITH CAUTION)
Export-AnyApiConfiguration -Path ".\api-profiles-with-secrets.json" -IncludeSecrets

# Import profiles
Import-AnyApiConfiguration -Path ".\api-profiles.json" -MergeStrategy "Overwrite"
```

### Remove Profiles

```powershell
# Remove a profile (with confirmation)
Remove-AnyApiProfile -ProfileName "OldAPI"

# Force removal without confirmation
Remove-AnyApiProfile -ProfileName "OldAPI" -Confirm:$false
```

## Performance Optimizations

### Built-in Caching
- **Authentication Header Caching** - Reduces overhead for repeated calls
- **Base URL Caching** - Environment variable caching for faster URI building
- **Pagination Type Detection** - Cached after first detection
- **Builder Object Reuse** - Builder objects can be reused and modified
- **Secret Resolution Caching** - SecretStore integration with intelligent caching

### Memory Efficiency
- **Streaming Support** - Process large datasets without loading everything into memory
- **Batch Processing** - Efficient collection handling for pagination
- **Optimized JSON Serialization** - Compressed JSON for network efficiency
- **Secure Memory Management** - Automatic cleanup of resolved secrets

### Network Optimizations
- **Connection Reuse** - Efficient HTTP client usage
- **Retry Logic** - Exponential backoff with jitter
- **Rate Limit Handling** - Respects Retry-After headers

## Examples by API Type

### GitHub API

```powershell
# Traditional approach - secrets now persist automatically
Initialize-AnyApiProfile -ProfileName "GitHub" `
    -BaseUrl "https://api.github.com" `
    -AuthenticationDetails @{
        AuthType = "BearerToken"
        TokenValue = "ghp_your_token"  # Stored in SecretStore
    }

# Builder approach
$github = New-ProfileInitializationBuilder -ProfileName "GitHub" `
    -BaseUrl "https://api.github.com" `
    -AuthenticationDetails @{
        AuthType = "BearerToken"
        TokenValue = "ghp_your_token"  # Stored in SecretStore
    } |
    WithPagination @{ Type = "LinkHeader" } |
    WithDefaultHeaders @{ "Accept" = "application/vnd.github.v3+json" }

Initialize-AnyApiProfile -ProfileBuilder $github

# Get all repositories with builder pattern
$allRepos = New-ApiRequestBuilder -ProfileName "GitHub" -Endpoint "/user/repos" |
    WithPagination $true 100 1000 |
    WithQueryParameters @{ sort = "updated"; direction = "desc" }

$repositories = Invoke-AnyApiEndpoint -RequestBuilder $allRepos

# Search repositories with complex filtering
$searchRequest = New-ApiRequestBuilder -ProfileName "GitHub" -Endpoint "/search/repositories" |
    WithQueryParameters @{ 
        q = "language:powershell stars:>50"; 
        sort = "stars"; 
        order = "desc" 
    } |
    WithPagination $true 50 3 |
    WithRetryPolicy 5 2000

$topPowerShellRepos = Invoke-AnyApiEndpoint -RequestBuilder $searchRequest
```

### Microsoft Graph API

```powershell
# Graph API with builder pattern
$graph = New-ProfileInitializationBuilder -ProfileName "Graph" `
    -BaseUrl "https://graph.microsoft.com/v1.0" `
    -AuthenticationDetails @{
        AuthType = "BearerToken"
        TokenValue = "your-access-token"
    } |
    WithPagination @{
        Type = "Cursor"
        NextTokenField = "@odata.nextLink"
        ItemsField = "value"
    } |
    WithDefaultHeaders @{
        "ConsistencyLevel" = "eventual"
    }

Initialize-AnyApiProfile -ProfileBuilder $graph

# Get all users with streaming
$userRequest = New-ApiRequestBuilder -ProfileName "Graph" -Endpoint "/users" |
    WithQueryParameters @{ '$select' = 'displayName,mail,userPrincipalName' } |
    WithPagination $true 999 10 |
    WithStream {
        param($user)
        Write-Host "User: $($user.displayName) - $($user.mail)"
    }

Invoke-AnyApiEndpoint -RequestBuilder $userRequest

# Complex query with builder
$mailRequest = New-ApiRequestBuilder -ProfileName "Graph" -Endpoint "/me/messages" |
    WithQueryParameters @{ 
        '$top' = 50
        '$select' = 'subject,from,receivedDateTime'
        '$orderby' = 'receivedDateTime desc'
        '$filter' = 'isRead eq false'
    } |
    WithRetryPolicy 3 1500

$unreadEmails = Invoke-AnyApiEndpoint -RequestBuilder $mailRequest
```

### ConnectWise Manage API

```powershell
# ConnectWise setup with custom authentication script
Initialize-AnyApiProfile -ProfileName "ConnectWise" `
    -BaseUrl "https://cw.yourserver.com/v4_6_release/apis/3.0" `
    -AuthenticationDetails @{
        AuthType = "CustomScript"
        AuthScriptBlock = $connectWiseScript  # From custom script examples above
        PublicKey = "your-public-key"
        PrivateKey = "your-private-key"        # Stored securely
        ClientId = "your-client-uuid"          # Stored securely
    } `
    -CustomSettings @{
        Company = "your-company-id"
    } `
    -Force

# ConnectWise operations
# Get system information
$systemInfo = Invoke-AnyApiEndpoint -ProfileName "ConnectWise" -Endpoint "/system/info"

# Get companies with pagination
$companies = Invoke-AnyApiEndpoint -ProfileName "ConnectWise" -Endpoint "/company/companies" -GetAllPages

# Search for tickets with builder pattern
$ticketSearch = New-ApiRequestBuilder -ProfileName "ConnectWise" -Endpoint "/service/tickets" |
    WithQueryParameters @{ 
        conditions = "board/name='IT Support' AND status/name in ('New','In Progress')"
        pageSize = 100
    } |
    WithPagination $true 100 10

$tickets = Invoke-AnyApiEndpoint -RequestBuilder $ticketSearch

# Create a new ticket
$newTicket = New-ApiRequestBuilder -ProfileName "ConnectWise" -Endpoint "/service/tickets" |
    WithMethod "POST" |
    WithBody @{
        summary = "API Test Ticket"
        company = @{ id = 123 }
        board = @{ id = 45 }
        status = @{ id = 1 }
        priority = @{ id = 3 }
    } |
    WithRetryPolicy 3 1000

$createdTicket = Invoke-AnyApiEndpoint -RequestBuilder $newTicket
```

### Custom REST API

```powershell
# Complex custom API setup with builder
$customApi = New-ProfileInitializationBuilder -ProfileName "CustomAPI" `
    -BaseUrl "https://api.yourcompany.com/v1" `
    -AuthenticationDetails @{
        AuthType = "ApiKey"
        ApiKeyLocation = "Header"
        ApiKeyName = "X-API-Key"
        ApiKeyValue = "your-api-key"
    } |
    WithDefaultHeaders @{
        "Accept" = "application/json"
        "Content-Type" = "application/json"
        "User-Agent" = "MyApp/1.0"
    } |
    WithPagination @{
        Type = "PageBased"
        PageSizeParameter = "limit"
        DefaultPageSize = 25
        HasMoreField = "hasNext"
    } |
    WithErrorHandling @{
        MaxRetries = 3
        InitialBackoffMs = 1000
    }

Initialize-AnyApiProfile -ProfileBuilder $customApi

# CRUD operations with builder pattern
# Read
$items = New-ApiRequestBuilder -ProfileName "CustomAPI" -Endpoint "/items" |
    WithQueryParameters @{ category = "active"; sort = "created_date" } |
    WithPagination $true 50 5

$allItems = Invoke-AnyApiEndpoint -RequestBuilder $items

# Create
$newItemRequest = New-ApiRequestBuilder -ProfileName "CustomAPI" -Endpoint "/items" |
    WithMethod "POST" |
    WithBody @{ 
        name = "New Item"
        description = "Item description"
        category = "active"
        tags = @("important", "new")
    } |
    WithRetryPolicy 5 2000

$newItem = Invoke-AnyApiEndpoint -RequestBuilder $newItemRequest

# Update
$updateRequest = New-ApiRequestBuilder -ProfileName "CustomAPI" -Endpoint "/items/{id}" |
    WithMethod "PUT" |
    WithPathParameters @{ id = $newItem.id } |
    WithBody @{ name = "Updated Item Name" }

$updatedItem = Invoke-AnyApiEndpoint -RequestBuilder $updateRequest

# Delete
$deleteRequest = New-ApiRequestBuilder -ProfileName "CustomAPI" -Endpoint "/items/{id}" |
    WithMethod "DELETE" |
    WithPathParameters @{ id = $newItem.id } |
    SuppressErrors $true

Invoke-AnyApiEndpoint -RequestBuilder $deleteRequest
```

## Troubleshooting

### Common Issues

1. **Secret Storage Issues**
   ```powershell
   # Check secret storage status
   Get-SecretStorageInfo
   
   # Test secret storage
   Test-SecretStorage
   
   # Reset secret storage provider
   Reset-SecretStorage
   
   # Initialize SecretStore if needed
   Initialize-SecretStore
   ```

2. **Authentication Failures**
   ```powershell
   # Check profile configuration
   Get-AnyApiProfile -ProfileName "YourAPI"
   
   # Test with verbose output
   Invoke-AnyApiEndpoint -ProfileName "YourAPI" -Endpoint "/test" -Verbose
   
   # Check what secrets are available
   Get-SecretInfo -Vault "AnyAPI-SecretStore" | Where-Object Name -like "AnyAPI.YourAPI.*"
   ```

3. **Custom Script Debugging**
   ```powershell
   # Create a debug version of your custom script
   $debugScript = {
       param($RequestContext, $Profile)
       
       Write-Host "=== Custom Script Debug ===" -ForegroundColor Cyan
       Write-Host "Profile: $($RequestContext.ProfileName)" -ForegroundColor Yellow
       Write-Host "Available PlainTextSecrets:" -ForegroundColor Yellow
       $Profile.PlainTextSecrets.Keys | ForEach-Object { 
           Write-Host "  - $_" -ForegroundColor Gray 
       }
       
       # Your authentication logic here
       # Add plenty of Write-Verbose statements
   }
   ```

4. **Pagination Not Working**
   ```powershell
   # Check pagination detection
   $response = Invoke-AnyApiEndpoint -ProfileName "YourAPI" -Endpoint "/data" -Verbose
   
   # Configure manual pagination if auto-detection fails
   Initialize-AnyApiProfile -ProfileName "YourAPI" -PaginationDetails @{
       Type = "PageBased"  # or "LinkHeader", "Cursor", "OffsetLimit"
   } -Force
   ```

5. **Performance Issues**
   ```powershell
   # Use streaming for large datasets
   Invoke-AnyApiEndpoint -ProfileName "YourAPI" -Endpoint "/largdataset" -GetAllPages -Stream {
       param($item)
       # Process item immediately
   }
   
   # Clear caches if needed
   Clear-AuthHeaderCache -ProfileName "YourAPI"
   ```

### Debug Mode

```powershell
# Enable verbose output for troubleshooting
$VerbosePreference = "Continue"
Invoke-AnyApiEndpoint -ProfileName "YourAPI" -Endpoint "/test" -Verbose

# Check last response headers
$script:LastResponseHeaders

# Test specific secret resolution
Test-SecretStorage
```

## Best Practices

### 1. Profile Organization
- Use descriptive profile names
- Group related APIs logically
- Use session-only profiles for temporary access
- **NEW**: Use builder pattern for complex profile configurations
- **NEW**: Leverage SecretStore for persistent, secure credential storage

### 2. Error Handling
- Always handle potential null responses
- Use -SuppressErrors for optional operations
- Implement proper retry logic for critical operations
- **NEW**: Chain error handling configuration with builders

### 3. Performance
- Use streaming for large datasets
- Leverage pagination for better memory usage
- Cache frequently accessed data locally
- **NEW**: Reuse builder objects for similar requests

### 4. Security
- Never hardcode secrets in scripts
- Use session-only profiles for sensitive environments
- Regularly rotate API keys and tokens
- **NEW**: Use SecretStore for automatic secret persistence and encryption
- **NEW**: Use SecureValues parameter in builders for runtime secret injection

### 5. Custom Script Best Practices
- **Use helper functions**: `GetPlainTextSecret()` and `GetSecureSecret()` for easy access
- **Multiple access methods**: Use different secret access patterns based on your needs
- **Error handling**: Always validate that required secrets are available
- **Verbose logging**: Add plenty of Write-Verbose statements for debugging
- **Memory cleanup**: Let the framework handle secret cleanup automatically

### 6. Builder Pattern Best Practices
- **Reuse Builders**: Create base builders and extend them for variations
- **Method Chaining**: Use fluent interface for readable configuration
- **Validation**: Always validate builder state before execution
- **Templates**: Create reusable builder templates for common patterns

## Migration Guide

### From Parameter-Based to Builder Pattern

The builder pattern is completely optional - all existing code continues to work unchanged. However, here's how to migrate for improved readability:

#### Before (Parameter-Based)
```powershell
# Old way - still works
Invoke-AnyApiEndpoint -ProfileName "GitHub" `
    -Endpoint "/repos/owner/repo/issues" `
    -Method "POST" `
    -QueryParameters @{ assignee = "user" } `
    -Body @{ title = "Issue"; body = "Description" } `
    -Headers @{ "Accept" = "application/json" } `
    -MaxRetries 3 `
    -InitialBackoffMs 1000 `
    -GetAllPages `
    -PageSize 50
```

#### After (Builder Pattern)
```powershell
# New way - more readable and flexible
$request = New-ApiRequestBuilder -ProfileName "GitHub" -Endpoint "/repos/owner/repo/issues" |
    WithMethod "POST" |
    WithQueryParameters @{ assignee = "user" } |
    WithBody @{ title = "Issue"; body = "Description" } |
    WithHeaders @{ "Accept" = "application/json" } |
    WithRetryPolicy 3 1000 |
    WithPagination $true 50 1000

Invoke-AnyApiEndpoint -RequestBuilder $request
```

### From Legacy Secret Storage to SecretStore

```powershell
# Before: Secrets had to be re-entered each session
Initialize-AnyApiProfile -ProfileName "API" -AuthenticationDetails @{
    AuthType = "ApiKey"
    ApiKeyValue = "key-here"  # Would be lost
}

# After: Automatic SecretStore integration
Initialize-SecretStore  # One-time setup
Initialize-AnyApiProfile -ProfileName "API" -AuthenticationDetails @{
    AuthType = "ApiKey" 
    ApiKeyValue = "key-here"  # Automatically stored and retrieved
}

# Later sessions - no re-authentication needed!
$data = Invoke-AnyApiEndpoint -ProfileName "API" -Endpoint "/data"
```

## Version History

### v0.3.0 (Current)
- ✅ PowerShell 7+ cross-platform support
- ✅ Intelligent pagination with 4 types
- ✅ **NEW**: Enhanced secret storage with Microsoft.PowerShell.SecretManagement integration
- ✅ **NEW**: Persistent secrets across sessions with automatic encryption
- ✅ **NEW**: Enhanced custom script support with multiple secret access methods
- ✅ **NEW**: ConnectWise Manage API support with robust authentication
- ✅ **NEW**: Initialize-SecretStore, Test-SecretStorage, Get-SecretStorageInfo functions
- ✅ Performance optimizations and caching
- ✅ Enhanced error handling and retry logic
- ✅ Streaming support for large datasets
- ✅ Fluent builder pattern with ApiRequestBuilder and ProfileInitializationBuilder
- ✅ Chainable method configuration for improved readability
- ✅ Backward compatibility with all existing parameter-based syntax

### v0.2.0
- ✅ Basic pagination support
- ✅ Improved authentication handling
- ✅ Profile persistence

### v0.1.0
- ✅ Initial release
- ✅ Basic REST API support
- ✅ Multiple authentication methods

## Contributing

This module is part of the MediPowershell toolkit. For issues or contributions, please follow the project guidelines.

## License

See the main MediPowershell project for licensing information.