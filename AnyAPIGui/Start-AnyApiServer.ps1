#Requires -Version 7.0

<#
.SYNOPSIS
    AnyAPI GUI Web Server - Modern interface for AnyAPI PowerShell Module

.DESCRIPTION
    Provides a web-based GUI for managing API profiles, testing endpoints,
    managing secrets, and working with templates.

.PARAMETER Port
    Port to run the server on (default: 8080)

.PARAMETER ModulePath
    Path to the AnyAPI.psm1 module (default: ../AnyAPI.psm1)

.PARAMETER AutoLaunch
    Automatically open browser after starting server

.EXAMPLE
    .\Start-AnyApiServer.ps1 -Port 8080 -AutoLaunch
#>

param(
    [int]$Port = 8080,
    [string]$ModulePath = "../AnyAPI.psm1",
    [switch]$AutoLaunch
)

$ErrorActionPreference = "Stop"

# Import required modules
try {
    Import-Module -Name (Resolve-Path $ModulePath) -Force
    Write-Host "✅ AnyAPI module loaded successfully" -ForegroundColor Green
}
catch {
    Write-Error "Failed to load AnyAPI module: $_"
    exit 1
}

# Script variables
$script:listener = $null
$script:serverRunning = $false
$script:secretStorePassword = $null
$script:wwwRoot = Join-Path $PSScriptRoot "www"

# Ensure www directory exists
if (-not (Test-Path $wwwRoot)) {
    Write-Error "www directory not found at: $wwwRoot"
    exit 1
}

# CORS headers helper
function Add-CorsHeaders {
    param($Response)
    
    $Response.Headers.Add("Access-Control-Allow-Origin", "*")
    $Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    $Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization, X-SecretStore-Password")
    $Response.Headers.Add("Access-Control-Max-Age", "3600")
}

# JSON response helper
function Send-JsonResponse {
    param(
        $Response,
        $Data,
        [int]$StatusCode = 200
    )
    
    $Response.StatusCode = $StatusCode
    $Response.ContentType = "application/json; charset=utf-8"
    
    $json = $Data | ConvertTo-Json -Depth 10 -Compress
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
    $Response.ContentLength64 = $buffer.Length
    $Response.OutputStream.Write($buffer, 0, $buffer.Length)
    $Response.Close()
}

# File server for static content
function Send-File {
    param(
        $Response,
        [string]$FilePath
    )
    
    if (Test-Path $FilePath) {
        $content = Get-Content -Path $FilePath -Raw
        $mimeType = Get-MimeType -FilePath $FilePath
        
        $Response.ContentType = $mimeType
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
        $Response.ContentLength64 = $buffer.Length
        $Response.OutputStream.Write($buffer, 0, $buffer.Length)
        $Response.Close()
    }
    else {
        Send-JsonResponse -Response $Response -Data @{ error = "File not found" } -StatusCode 404
    }
}

function Get-MimeType {
    param([string]$FilePath)
    
    switch ([System.IO.Path]::GetExtension($FilePath).ToLower()) {
        ".html" { return "text/html; charset=utf-8" }
        ".js" { return "application/javascript; charset=utf-8" }
        ".css" { return "text/css; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".svg" { return "image/svg+xml" }
        ".png" { return "image/png" }
        ".jpg" { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".ico" { return "image/x-icon" }
        default { return "application/octet-stream" }
    }
}

# API Handlers
function Handle-GetProfiles {
    param($Request, $Response)
    
    try {
        $profiles = Get-AnyApiProfile
        $profileList = @()
        
        if ($profiles -is [hashtable]) {
            foreach ($key in $profiles.Keys) {
                $profile = $profiles[$key]
                
                # Build comprehensive profile data
                $profileData = @{
                    name           = $key
                    baseUrl        = $profile.BaseUrl
                    authType       = $profile.AuthenticationDetails.AuthType
                    paginationType = $profile.PaginationDetails.Type
                    headers        = $profile.DefaultHeaders
                    customSettings = $profile.CustomSettings
                    lastUpdated    = $profile.LastUpdated
                    isSessionOnly  = $profile.IsSessionOnly
                    # --- Description fix: get from CustomSettings if present ---
                    description    = $profile.CustomSettings?.Description
                    # --- Add full paginationDetails if present ---
                    paginationDetails = $profile.PaginationDetails
                }
                
                # Add authentication details based on type
                $authType = $profile.AuthenticationDetails.AuthType
                switch ($authType) {
                    "Bearer" {
                        $profileData.credentials = @{
                            token = if ($profile.AuthenticationDetails.TokenValue) { "***MASKED***" } else { $null }
                        }
                    }
                    "Basic" {
                        $profileData.credentials = @{
                            username = $profile.AuthenticationDetails.Username
                            password = if ($profile.AuthenticationDetails.Password) { "***MASKED***" } else { $null }
                        }
                    }
                    "ApiKey" {
                        $profileData.credentials = @{
                            apiKey = if ($profile.AuthenticationDetails.ApiKeyValue) { "***MASKED***" } else { $null }
                            headerName = $profile.AuthenticationDetails.ApiKeyName ?? "X-API-Key"
                        }
                    }
                }
                # Always set customAuthScript if AuthScriptBlock exists
                if ($profile.AuthenticationDetails.AuthScriptBlock) {
                    $profileData.customAuthScript = $profile.AuthenticationDetails.AuthScriptBlock.ToString()
                }
                # Add any stored credentials for custom auth
                if ($authType -match 'Custom') {
                    $customCreds = @{}
                    $secretKeys = @('ApiKey', 'ClientSecret', 'PrivateKey', 'PublicKey', 'ClientId', 'TokenValue', 'RefreshToken')
                    foreach ($key in $secretKeys) {
                        if ($profile.AuthenticationDetails.ContainsKey($key) -and $profile.AuthenticationDetails[$key]) {
                            $customCreds[$key] = "***MASKED***"
                        }
                    }
                    if ($customCreds.Count -gt 0) {
                        $profileData.credentials = $customCreds
                    }
                }
                $profileList += $profileData
            }
        }
        
        Send-JsonResponse -Response $Response -Data @{
            success  = $true
            profiles = $profileList
        }
    }
    catch {
        Write-Warning "Error in Handle-GetProfiles: $($_.Exception.Message)"
        Send-JsonResponse -Response $Response -Data @{
            success = $false
            error   = $_.Exception.Message
        } -StatusCode 500
    }
}

function Handle-CreateProfile {
    param($Request, $Response, $Body)
    
    try {
        Write-Host "📝 Creating profile with data: $($Body | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
        
        # Extract SecretStore password from headers if provided
        $secretStorePassword = $Request.Headers["X-SecretStore-Password"]
        if ($secretStorePassword) {
            $script:secretStorePassword = ConvertTo-SecureString $secretStorePassword -AsPlainText -Force
        }
        
        # Validate required fields
        if (-not $Body.name) {
            throw "Profile name is required"
        }
        if (-not $Body.baseUrl) {
            throw "Base URL is required"
        }
        
        # Build authentication details based on type
        $authDetails = @{
            AuthType = $Body.authType ?? "None"
        }
        
        switch ($Body.authType) {
            "ApiKey" {
                if ($Body.credentials.apiKey) {
                    $authDetails.ApiKeyName = $Body.credentials.headerName ?? "X-API-Key"
                    $authDetails.ApiKeyValue = $Body.credentials.apiKey
                    $authDetails.ApiKeyLocation = "Header"
                }
            }
            "Bearer" {
                if ($Body.credentials.token) {
                    $authDetails.TokenValue = $Body.credentials.token
                }
            }
            "Basic" {
                if ($Body.credentials.username -and $Body.credentials.password) {
                    $authDetails.Username = $Body.credentials.username
                    $authDetails.Password = $Body.credentials.password
                }
            }
            "Custom" {
                if ($Body.customAuthScript) {
                    $authDetails.AuthScriptBlock = [ScriptBlock]::Create($Body.customAuthScript)
                }
                # Add any additional credentials for custom auth
                if ($Body.credentials) {
                    foreach ($key in $Body.credentials.Keys) {
                        if ($key -notin @('username', 'password', 'token', 'apiKey', 'headerName')) {
                            $authDetails[$key] = $Body.credentials[$key]
                        }
                    }
                }
            }
        }
        
        # Build pagination details
$paginationDetails = @{}

if ($Body.paginationType -and $Body.paginationType -ne "Auto") {
    $paginationDetails.Type = $Body.paginationType
    
    # Check if frontend sent paginationDetails object directly
    if ($Body.paginationDetails -and $Body.paginationDetails -is [hashtable]) {
        Write-Host "📋 Using paginationDetails object from frontend" -ForegroundColor Green
        # Use the frontend-provided pagination details
        foreach ($key in $Body.paginationDetails.Keys) {
            $paginationDetails[$key] = $Body.paginationDetails[$key]
        }
        # Ensure Type is set
        $paginationDetails.Type = $Body.paginationType
    }
    else {
        Write-Host "📋 Using individual pagination fields (legacy)" -ForegroundColor Yellow
        # Fallback to individual fields for backward compatibility
        switch ($Body.paginationType) {
            "PageBased" {
                if ($Body.pageParameter) { $paginationDetails.PageParameter = $Body.pageParameter }
                if ($Body.pageSizeParameter) { $paginationDetails.PageSizeParameter = $Body.pageSizeParameter }
                if ($Body.totalPagesField) { $paginationDetails.TotalPagesField = $Body.totalPagesField }
            }
            "OffsetLimit" {
                if ($Body.offsetParameter) { $paginationDetails.OffsetParameter = $Body.offsetParameter }
                if ($Body.limitParameter) { $paginationDetails.LimitParameter = $Body.limitParameter }
                if ($Body.totalField) { $paginationDetails.TotalField = $Body.totalField }
            }
            "Cursor" {
                if ($Body.nextTokenField) { $paginationDetails.NextTokenField = $Body.nextTokenField }
                if ($Body.tokenParameter) { $paginationDetails.TokenParameter = $Body.tokenParameter }
            }
        }
    }
    
    Write-Host "🔧 Final pagination details: $($paginationDetails | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
}
        
        # Create profile parameters
        $profileParams = @{
            ProfileName           = $Body.name
            BaseUrl               = $Body.baseUrl
            AuthenticationDetails = $authDetails
            Force                 = $true
        }
        
        if ($paginationDetails.Count -gt 0) {
            $profileParams.PaginationDetails = $paginationDetails
        }
        
        if ($Body.headers -and $Body.headers.Count -gt 0) {
            $profileParams.DefaultHeaders = $Body.headers
        }

        # --- Description fix: store in CustomSettings ---
        if ($Body.description) {
            if (-not $profileParams.ContainsKey('CustomSettings') -or -not $profileParams.CustomSettings) {
                $profileParams.CustomSettings = @{}
            }
            $profileParams.CustomSettings.Description = $Body.description
        }
        
        if ($Body.isSessionOnly) {
            $profileParams.NoLocalFilePersistence = $true
        }
        
        Write-Host "🔧 Profile parameters: $($profileParams | ConvertTo-Json -Depth 3)" -ForegroundColor Yellow
        
        # Create the profile
        Initialize-AnyApiProfile @profileParams
        
        Send-JsonResponse -Response $Response -Data @{
            success = $true
            message = "Profile created successfully"
        }
    }
    catch {
        Write-Host "❌ Error creating profile: $_" -ForegroundColor Red
        Write-Host "❌ Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red
        Send-JsonResponse -Response $Response -Data @{
            success = $false
            error   = $_.Exception.Message
            details = $_.Exception.ToString()
        } -StatusCode 500
    }
}

function Handle-UpdateProfile {
    param($Request, $Response, $Body, $ProfileName)
    
    try {
        Write-Host "📝 Updating profile '$ProfileName' with data: $($Body | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
        
        # Extract SecretStore password from headers if provided
        $secretStorePassword = $Request.Headers["X-SecretStore-Password"]
        if ($secretStorePassword) {
            $script:secretStorePassword = ConvertTo-SecureString $secretStorePassword -AsPlainText -Force
        }
        
        # Validate required fields
        if (-not $Body.name) {
            throw "Profile name is required"
        }
        if (-not $Body.baseUrl) {
            throw "Base URL is required"
        }
        
        # Check if profile exists
        $existingProfiles = Get-AnyApiProfile -ProfileName $ProfileName -ErrorAction SilentlyContinue
        if (-not $existingProfiles) {
            Send-JsonResponse -Response $Response -Data @{
                success = $false
                error   = "Profile '$ProfileName' not found"
            } -StatusCode 404
            return
        }
        
        # If the profile name is changing, we need to handle it
        if ($Body.name -ne $ProfileName) {
            # Check if the new name already exists
            $existingWithNewName = Get-AnyApiProfile -ProfileName $Body.name -ErrorAction SilentlyContinue
            if ($existingWithNewName) {
                Send-JsonResponse -Response $Response -Data @{
                    success = $false
                    error   = "A profile with name '$($Body.name)' already exists"
                } -StatusCode 409
                return
            }
        }
        
        # Build authentication details based on type
        $authDetails = @{
            AuthType = $Body.authType ?? "None"
        }
        
        switch ($Body.authType) {
            "ApiKey" {
                if ($Body.credentials.apiKey) {
                    $authDetails.ApiKeyName = $Body.credentials.headerName ?? "X-API-Key"
                    $authDetails.ApiKeyValue = $Body.credentials.apiKey
                    $authDetails.ApiKeyLocation = "Header"
                }
            }
            "Bearer" {
                if ($Body.credentials.token) {
                    $authDetails.TokenValue = $Body.credentials.token
                }
            }
            "Basic" {
                if ($Body.credentials.username -and $Body.credentials.password) {
                    $authDetails.Username = $Body.credentials.username
                    $authDetails.Password = $Body.credentials.password
                }
            }
            "Custom" {
                if ($Body.customAuthScript) {
                    $authDetails.AuthScriptBlock = [ScriptBlock]::Create($Body.customAuthScript)
                }
                # Add any additional credentials for custom auth
                if ($Body.credentials) {
                    foreach ($key in $Body.credentials.Keys) {
                        if ($key -notin @('username', 'password', 'token', 'apiKey', 'headerName')) {
                            $authDetails[$key] = $Body.credentials[$key]
                        }
                    }
                }
            }
        }
        
        # Build pagination details
        $paginationDetails = @{
        }
        if ($Body.paginationType -and $Body.paginationType -ne "Auto") {
            $paginationDetails.Type = $Body.paginationType
            
            # Add pagination-specific fields
            switch ($Body.paginationType) {
                "PageBased" {
                    if ($Body.pageParameter) { $paginationDetails.PageParameter = $Body.pageParameter }
                    if ($Body.pageSizeParameter) { $paginationDetails.PageSizeParameter = $Body.pageSizeParameter }
                    if ($Body.totalPagesField) { $paginationDetails.TotalPagesField = $Body.totalPagesField }
                }
                "OffsetLimit" {
                    if ($Body.offsetParameter) { $paginationDetails.OffsetParameter = $Body.offsetParameter }
                    if ($Body.limitParameter) { $paginationDetails.LimitParameter = $Body.limitParameter }
                    if ($Body.totalField) { $paginationDetails.TotalField = $Body.totalField }
                }
                "Cursor" {
                    if ($Body.nextTokenField) { $paginationDetails.NextTokenField = $Body.nextTokenField }
                    if ($Body.tokenParameter) { $paginationDetails.TokenParameter = $Body.tokenParameter }
                }
            }
        }
        
        # If the profile name is changing, remove the old one first
        if ($Body.name -ne $ProfileName) {
            Remove-AnyApiProfile -ProfileName $ProfileName -Confirm:$false
        }
        
        # Create/update profile parameters
        $profileParams = @{
            ProfileName           = $Body.name
            BaseUrl               = $Body.baseUrl
            AuthenticationDetails = $authDetails
            Force                 = $true
        }
        
        if ($paginationDetails.Count -gt 0) {
            $profileParams.PaginationDetails = $paginationDetails
        }
        
        if ($Body.headers -and $Body.headers.Count -gt 0) {
            $profileParams.DefaultHeaders = $Body.headers
        }

        # --- Description fix: store in CustomSettings ---
        if ($Body.description) {
            if (-not $profileParams.ContainsKey('CustomSettings') -or -not $profileParams.CustomSettings) {
                $profileParams.CustomSettings = @{}
            }
            $profileParams.CustomSettings.Description = $Body.description
        }
        
        if ($Body.isSessionOnly) {
            $profileParams.NoLocalFilePersistence = $true
        }
        
        Write-Host "🔧 Profile update parameters: $($profileParams | ConvertTo-Json -Depth 3)" -ForegroundColor Yellow
        
        # Update the profile
        Initialize-AnyApiProfile @profileParams
        
        Send-JsonResponse -Response $Response -Data @{
            success = $true
            message = "Profile updated successfully"
            profileName = $Body.name
        }
    }
    catch {
        Write-Host "❌ Error updating profile: $_" -ForegroundColor Red
        Write-Host "❌ Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Red
        Send-JsonResponse -Response $Response -Data @{
            success = $false
            error   = $_.Exception.Message
            details = $_.Exception.ToString()
        } -StatusCode 500
    }
}

function Handle-TestEndpoint {
    param($Request, $Response, $Body)
    
    try {
        $params = @{
            ProfileName = $Body.profileName
            Endpoint    = $Body.endpoint
            Method      = $Body.method ?? "GET"
        }
        
        if ($Body.queryParameters) {
            $params.QueryParameters = $Body.queryParameters
        }
        
        if ($Body.pathParameters) {
            $params.PathParameters = $Body.pathParameters
        }
        
        if ($Body.headers) {
            $params.Headers = $Body.headers
        }
        
        if ($Body.body) {
            $params.Body = $Body.body
        }
        
        if ($Body.contentType) {
            $params.ContentType = $Body.contentType
        }
        
        if ($Body.getAllPages) {
            $params.GetAllPages = $true
            if ($Body.pageSize) { $params.PageSize = $Body.pageSize }
            if ($Body.maxPages) { $params.MaxPages = $Body.maxPages }
        }
        
        # Add secure values if provided
        if ($Body.secureValues) {
            $params.SecureValues = $Body.secureValues
        }
        
        $startTime = Get-Date
        $result = Invoke-AnyApiEndpoint @params
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        # Get response headers if available
        $responseHeaders = if ($script:LastResponseHeaders) {
            $script:LastResponseHeaders
        }
        else {
            @{}
        }
        
        Send-JsonResponse -Response $Response -Data @{
            success  = $true
            result   = $result
            duration = [Math]::Round($duration)
            headers  = $responseHeaders
        }
    }
    catch {
        $errorDetails = @{
            message    = $_.Exception.Message
            type       = $_.Exception.GetType().FullName
            stackTrace = $_.ScriptStackTrace
        }
        
        Send-JsonResponse -Response $Response -Data @{
            success = $false
            error   = $errorDetails
        } -StatusCode 500
    }
}

function Handle-GetSecretInfo {
    param($Request, $Response)
    
    try {
        # Get secret storage info
        $storageInfo = @{
            provider                    = Get-SecretStorageProvider
            isSecretManagementAvailable = $null -ne (Get-Module Microsoft.PowerShell.SecretManagement -ListAvailable)
            isSecretStoreAvailable      = $null -ne (Get-Module Microsoft.PowerShell.SecretStore -ListAvailable)
        }
        
        # Get vault info if available
        if ($storageInfo.provider -eq 'SecretManagement') {
            try {
                $vaults = Get-SecretVault -ErrorAction SilentlyContinue
                $storageInfo.vaults = @()
                foreach ($vault in $vaults) {
                    $storageInfo.vaults += @{
                        name       = $vault.Name
                        moduleName = $vault.ModuleName
                        isDefault  = $vault.IsDefault
                    }
                }
            }
            catch {
                $storageInfo.vaultError = $_.Exception.Message
            }
        }
        
        Send-JsonResponse -Response $Response -Data @{
            success     = $true
            storageInfo = $storageInfo
        }
    }
    catch {
        Send-JsonResponse -Response $Response -Data @{
            success = $false
            error   = $_.Exception.Message
        } -StatusCode 500
    }
}

function Handle-UnlockSecretStore {
    param($Request, $Response, $Body)
    
    try {
        if (-not $Body.password) {
            throw "Password is required"
        }
        
        $securePassword = ConvertTo-SecureString $Body.password -AsPlainText -Force
        
        # Try to unlock the secret store
        Unlock-SecretStore -Password $securePassword -ErrorAction Stop
        
        # Store for future use in this session
        $script:secretStorePassword = $securePassword
        
        Send-JsonResponse -Response $Response -Data @{
            success = $true
            message = "SecretStore unlocked successfully"
        }
    }
    catch {
        Send-JsonResponse -Response $Response -Data @{
            success = $false
            error   = $_.Exception.Message
        } -StatusCode 500
    }
}

function Handle-GetTemplates {
    param($Request, $Response)
    
    # Define built-in templates
    $templates = @(
        @{
            id              = "github"
            name            = "GitHub API"
            description     = "GitHub REST API v3"
            icon            = "🐙"
            baseUrl         = "https://api.github.com"
            authType        = "BearerToken"
            paginationType  = "LinkHeader"
            defaultHeaders  = @{
                "Accept"     = "application/vnd.github.v3+json"
                "User-Agent" = "AnyAPI-PowerShell"
            }
            sampleEndpoints = @(
                @{ method = "GET"; endpoint = "/user/repos"; description = "List user repositories" }
                @{ method = "GET"; endpoint = "/repos/{owner}/{repo}/issues"; description = "List repository issues" }
                @{ method = "POST"; endpoint = "/repos/{owner}/{repo}/issues"; description = "Create an issue" }
            )
        }
        @{
            id                = "msgraph"
            name              = "Microsoft Graph"
            description       = "Microsoft Graph API v1.0"
            icon              = "📊"
            baseUrl           = "https://graph.microsoft.com/v1.0"
            authType          = "BearerToken"
            paginationType    = "Cursor"
            defaultHeaders    = @{
                "ConsistencyLevel" = "eventual"
            }
            paginationDetails = @{
                NextTokenField = "@odata.nextLink"
                ItemsField     = "value"
            }
            sampleEndpoints   = @(
                @{ method = "GET"; endpoint = "/me"; description = "Get current user" }
                @{ method = "GET"; endpoint = "/users"; description = "List users" }
                @{ method = "GET"; endpoint = "/me/messages"; description = "Get messages" }
            )
        }
        @{
            id               = "connectwise"
            name             = "ConnectWise Manage"
            description      = "ConnectWise PSA REST API"
            icon             = "🔧"
            baseUrl          = "https://your-domain.com/v4_6_release/apis/3.0"
            authType         = "CustomScript"
            customAuthScript = @'
param($RequestContext, $Profile)

# ConnectWise authentication
$company = $Profile.CustomSettings.Company
$publicKey = $RequestContext.GetPlainTextSecret.Invoke('PublicKey')
$privateKey = $RequestContext.GetPlainTextSecret.Invoke('PrivateKey')
$clientId = $RequestContext.GetPlainTextSecret.Invoke('ClientId')

if (-not $company -or -not $publicKey -or -not $privateKey -or -not $clientId) {
    throw "Missing required ConnectWise credentials"
}

$authString = "$company+$publicKey`:$privateKey"
$encodedAuth = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($authString))

$RequestContext.Headers["Authorization"] = "Basic $encodedAuth"
$RequestContext.Headers["clientId"] = $clientId
$RequestContext.Headers["Accept"] = "application/json"
'@
            requiredSecrets  = @("PublicKey", "PrivateKey", "ClientId")
            customSettings   = @{
                Company = "your-company-id"
            }
            sampleEndpoints  = @(
                @{ method = "GET"; endpoint = "/system/info"; description = "Get system info" }
                @{ method = "GET"; endpoint = "/company/companies"; description = "List companies" }
                @{ method = "GET"; endpoint = "/service/tickets"; description = "List tickets" }
            )
        }
        @{
            id              = "openai"
            name            = "OpenAI API"
            description     = "OpenAI REST API"
            icon            = "🤖"
            baseUrl         = "https://api.openai.com/v1"
            authType        = "BearerToken"
            defaultHeaders  = @{
                "OpenAI-Organization" = "org-XXXXXXXX"
            }
            sampleEndpoints = @(
                @{ method = "GET"; endpoint = "/models"; description = "List available models" }
                @{ method = "POST"; endpoint = "/chat/completions"; description = "Create chat completion" }
                @{ method = "POST"; endpoint = "/completions"; description = "Create completion" }
            )
        }
        @{
            id                = "jira"
            name              = "Jira Cloud"
            description       = "Atlassian Jira REST API v3"
            icon              = "🎯"
            baseUrl           = "https://your-domain.atlassian.net/rest/api/3"
            authType          = "BearerToken"
            paginationType    = "PageBased"
            paginationDetails = @{
                PageParameter     = "startAt"
                PageSizeParameter = "maxResults"
                TotalField        = "total"
            }
            sampleEndpoints   = @(
                @{ method = "GET"; endpoint = "/project"; description = "Get all projects" }
                @{ method = "GET"; endpoint = "/issue/{issueIdOrKey}"; description = "Get issue" }
                @{ method = "POST"; endpoint = "/issue"; description = "Create issue" }
            )
        }
        @{
            id              = "stripe"
            name            = "Stripe API"
            description     = "Stripe Payment API"
            icon            = "💳"
            baseUrl         = "https://api.stripe.com/v1"
            authType        = "BearerToken"
            paginationType  = "Cursor"
            defaultHeaders  = @{
                "Stripe-Version" = "2023-10-16"
            }
            sampleEndpoints = @(
                @{ method = "GET"; endpoint = "/customers"; description = "List customers" }
                @{ method = "GET"; endpoint = "/charges"; description = "List charges" }
                @{ method = "POST"; endpoint = "/payment_intents"; description = "Create payment intent" }
            )
        }
    )
    
    Send-JsonResponse -Response $Response -Data @{
        success   = $true
        templates = $templates
    }
}

# Main request handler
function Handle-Request {
    param($Context)
    
    $request = $Context.Request
    $response = $Context.Response
    
    Add-CorsHeaders $response
    
    # Handle OPTIONS (CORS preflight)
    if ($request.HttpMethod -eq "OPTIONS") {
        $response.StatusCode = 200
        $response.Close()
        return
    }
    
    $url = $request.Url.AbsolutePath
    $method = $request.HttpMethod
    
    Write-Host "$(Get-Date -Format 'HH:mm:ss') $method $url" -ForegroundColor Cyan
    
    try {
        # Parse request body if present
        $body = $null
        if ($request.HasEntityBody) {
            $reader = [System.IO.StreamReader]::new($request.InputStream)
            $bodyText = $reader.ReadToEnd()
            $reader.Close()
            
            if ($bodyText) {
                $body = $bodyText | ConvertFrom-Json -AsHashtable
            }
        }
        
        # Route requests
        switch -Regex ($url) {
            "^/$" {
                Send-File -Response $response -FilePath (Join-Path $script:wwwRoot "index.html")
            }
            
            "^/api/profiles/?$" {
                switch ($method) {
                    "GET" { Handle-GetProfiles -Request $request -Response $response }
                    "POST" { Handle-CreateProfile -Request $request -Response $response -Body $body }
                    default { Send-JsonResponse -Response $response -Data @{ error = "Method not allowed" } -StatusCode 405 }
                }
            }
              "^/api/profiles/([^/]+)/?$" {
                $profileName = [System.Web.HttpUtility]::UrlDecode($matches[1])
                switch ($method) {
                    "DELETE" { 
                        try {
                            Remove-AnyApiProfile -ProfileName $profileName -Confirm:$false
                            Send-JsonResponse -Response $response -Data @{ success = $true }
                        }
                        catch {
                            Send-JsonResponse -Response $response -Data @{ success = $false; error = $_.Exception.Message } -StatusCode 500
                        }
                    }
                    "PUT" { 
                        Handle-UpdateProfile -Request $request -Response $response -Body $body -ProfileName $profileName
                    }
                    default { Send-JsonResponse -Response $response -Data @{ error = "Method not allowed" } -StatusCode 405 }
                }
            }
            
            "^/api/test/?$" {
                if ($method -eq "POST") {
                    Handle-TestEndpoint -Request $request -Response $response -Body $body
                }
                else {
                    Send-JsonResponse -Response $response -Data @{ error = "Method not allowed" } -StatusCode 405
                }
            }
            
            "^/api/secrets/info/?$" {
                Handle-GetSecretInfo -Request $request -Response $response
            }
            
            "^/api/secrets/unlock/?$" {
                if ($method -eq "POST") {
                    Handle-UnlockSecretStore -Request $request -Response $response -Body $body
                }
                else {
                    Send-JsonResponse -Response $response -Data @{ error = "Method not allowed" } -StatusCode 405
                }
            }
            
            "^/api/templates/?$" {
                Handle-GetTemplates -Request $request -Response $response
            }
            
            "^/api/export/?$" {
                if ($method -eq "POST") {
                    try {
                        $exportPath = [System.IO.Path]::GetTempFileName()
                        Export-AnyApiConfiguration -Path $exportPath -IncludeSecrets:($body.includeSecrets -eq $true) -Force
                        $exportContent = Get-Content -Path $exportPath -Raw
                        Remove-Item -Path $exportPath -Force
                        
                        Send-JsonResponse -Response $response -Data @{
                            success = $true
                            content = $exportContent
                        }
                    }
                    catch {
                        Send-JsonResponse -Response $response -Data @{ success = $false; error = $_.Exception.Message } -StatusCode 500
                    }
                }
            }
            
            "^/api/import/?$" {
                if ($method -eq "POST") {
                    try {
                        $importPath = [System.IO.Path]::GetTempFileName()
                        Set-Content -Path $importPath -Value $body.content
                        
                        Import-AnyApiConfiguration -Path $importPath -MergeStrategy ($body.mergeStrategy ?? "Skip")
                        Remove-Item -Path $importPath -Force
                        
                        Send-JsonResponse -Response $response -Data @{ success = $true }
                    }
                    catch {
                        Send-JsonResponse -Response $response -Data @{ success = $false; error = $_.Exception.Message } -StatusCode 500
                    }
                }
            }
            
            "^/api/health/?$" {
                Send-JsonResponse -Response $response -Data @{
                    success   = $true
                    status    = "healthy"
                    version   = "1.0"
                    timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
                }
            }
            
            # Static file serving
            "^/(js|css|img|fonts)/(.+)$" {
                $filePath = Join-Path $script:wwwRoot $url.Substring(1)
                Send-File -Response $response -FilePath $filePath
            }
            
            "^/api/profiles/([^/]+)/details/?$" {
                $profileName = [System.Web.HttpUtility]::UrlDecode($matches[1])
                if ($method -eq "GET") {
                    $includeSecrets = $request.QueryString["includeSecrets"] -eq "true"
                    Handle-GetProfileDetails -Request $request -Response $response -ProfileName $profileName -IncludeSecrets $includeSecrets
                }
                else {
                    Send-JsonResponse -Response $response -Data @{ error = "Method not allowed" } -StatusCode 405
                }
            }

            "^/api/profiles/([^/]+)/script/?$" {
                $profileName = [System.Web.HttpUtility]::UrlDecode($matches[1])
                if ($method -eq "PUT") {
                    Handle-UpdateCustomScript -Request $request -Response $response -ProfileName $profileName -Body $body
                }
                else {
                    Send-JsonResponse -Response $response -Data @{ error = "Method not allowed" } -StatusCode 405
                }
            }

            default {
                Send-JsonResponse -Response $response -Data @{ error = "Not found" } -StatusCode 404
            }
        }
    }
    catch {
        Write-Host "Error handling request: $_" -ForegroundColor Red
        Send-JsonResponse -Response $response -Data @{ 
            error = $_.Exception.Message 
            type  = $_.Exception.GetType().FullName
        } -StatusCode 500
    }
}

function Handle-GetProfileDetails {
    param($Request, $Response, $ProfileName, $IncludeSecrets = $false)

    try {
        Write-Host "🔍 Getting profile details for: $ProfileName" -ForegroundColor Cyan

        $profiles = Get-AnyApiProfile
        if (-not $profiles -or -not $profiles.ContainsKey($ProfileName)) {
            Send-JsonResponse -Response $Response -Data @{
                success = $false
                error   = "Profile not found: $ProfileName"
            } -StatusCode 404
            return
        }

        # --- Use the same logic as Handle-GetProfiles to build the profile object ---
        $profile = $profiles[$ProfileName]
        $profileDetails = @{
            name           = $ProfileName
            baseUrl        = $profile.BaseUrl
            authType       = $profile.AuthenticationDetails.AuthType
            paginationType = $profile.PaginationDetails.Type
            headers        = $profile.DefaultHeaders
            customSettings = $profile.CustomSettings
            lastUpdated    = $profile.LastUpdated
            isSessionOnly  = $profile.IsSessionOnly
            # --- Description fix: get from CustomSettings if present ---
            description    = $profile.CustomSettings?.Description
            # --- Add full paginationDetails if present ---
            paginationDetails = $profile.PaginationDetails
        }

        $authType = $profile.AuthenticationDetails.AuthType
        switch ($authType) {
            "Bearer" {
                $profileDetails.credentials = @{
                    token = if ($profile.AuthenticationDetails.TokenValue) { $IncludeSecrets ? $profile.AuthenticationDetails.TokenValue : "***MASKED***" } else { $null }
                }
            }
            "Basic" {
                $profileDetails.credentials = @{
                    username = $profile.AuthenticationDetails.Username
                    password = if ($profile.AuthenticationDetails.Password) { $IncludeSecrets ? $profile.AuthenticationDetails.Password : "***MASKED***" } else { $null }
                }
            }
            "ApiKey" {
                $profileDetails.credentials = @{
                    apiKey = if ($profile.AuthenticationDetails.ApiKeyValue) { $IncludeSecrets ? $profile.AuthenticationDetails.ApiKeyValue : "***MASKED***" } else { $null }
                    headerName = $profile.AuthenticationDetails.ApiKeyName ?? "X-API-Key"
                }
            }
        }
        # Always set customAuthScript if AuthScriptBlock exists
        if ($profile.AuthenticationDetails.AuthScriptBlock) {
            $profileDetails.customAuthScript = $profile.AuthenticationDetails.AuthScriptBlock.ToString()
        }
        # Add any stored credentials for custom auth
        if ($authType -match 'Custom') {
            $customCreds = @{}
            $secretKeys = @('ApiKey', 'ClientSecret', 'PrivateKey', 'PublicKey', 'ClientId', 'TokenValue', 'RefreshToken')
            foreach ($key in $secretKeys) {
                if ($profile.AuthenticationDetails.ContainsKey($key) -and $profile.AuthenticationDetails[$key]) {
                    $customCreds[$key] = $IncludeSecrets ? $profile.AuthenticationDetails[$key] : "***MASKED***"
                }
            }
            if ($customCreds.Count -gt 0) {
                $profileDetails.credentials = $customCreds
            }
        }

        Send-JsonResponse -Response $Response -Data @{
            success         = $true
            profile         = $profileDetails
            secretsIncluded = $IncludeSecrets
        }
    }
    catch {
        Write-Host "❌ Error getting profile details: $_" -ForegroundColor Red
        Send-JsonResponse -Response $Response -Data @{
            success = $false
            error   = $_.Exception.Message
            details = $_.Exception.ToString()
        } -StatusCode 500
    }
}

function Handle-UpdateCustomScript {
    param($Request, $Response, $ProfileName, $Body)
    
    try {
        # Get existing profile
        $existingProfiles = Get-AnyApiProfile -ProfileName $ProfileName
        if (-not $existingProfiles -or $existingProfiles.Count -eq 0) {
            Send-JsonResponse -Response $Response -Data @{
                success = $false
                error   = "Profile not found"
            } -StatusCode 404
            return
        }
        
        $existingProfile = $existingProfiles[0]
        
        if ($existingProfile.AuthenticationDetails.AuthType -ne "CustomScript") {
            Send-JsonResponse -Response $Response -Data @{
                success = $false
                error   = "Profile is not using CustomScript authentication"
            } -StatusCode 400
            return
        }
        
        # Update the script
        $newAuthDetails = $existingProfile.AuthenticationDetails.Clone()
        $newAuthDetails.AuthScriptBlock = [ScriptBlock]::Create($Body.script)
        
        # Update required secrets if provided
        if ($Body.requiredSecrets) {
            if (-not $existingProfile.CustomSettings) {
                $existingProfile.CustomSettings = @{}
            }
            $existingProfile.CustomSettings.RequiredSecrets = $Body.requiredSecrets
        }
        
        # Recreate the profile with updated script
        $profileParams = @{
            ProfileName           = $ProfileName
            BaseUrl               = $existingProfile.BaseUrl
            AuthenticationDetails = $newAuthDetails
            Force                 = $true
        }
        
        if ($existingProfile.PaginationDetails) {
            $profileParams.PaginationDetails = $existingProfile.PaginationDetails
        }
        
        if ($existingProfile.DefaultHeaders) {
            $profileParams.DefaultHeaders = $existingProfile.DefaultHeaders
        }
        
        if ($existingProfile.CustomSettings) {
            $profileParams.CustomSettings = $existingProfile.CustomSettings
        }
        
        if ($existingProfile.IsSessionOnly) {
            $profileParams.NoLocalFilePersistence = $true
        }
        
        Initialize-AnyApiProfile @profileParams
        
        Send-JsonResponse -Response $Response -Data @{
            success = $true
            message = "Custom script updated successfully"
        }
    }
    catch {
        Send-JsonResponse -Response $Response -Data @{
            success = $false
            error   = $_.Exception.Message
            details = $_.Exception.ToString()
        } -StatusCode 500
    }
}

# Start the web server
function Start-WebServer {
    try {
        $listener = [System.Net.HttpListener]::new()
        $listener.Prefixes.Add("http://localhost:$Port/")
        $listener.Start()
        
        Write-Host ""
        Write-Host "🚀 AnyAPI GUI Server started!" -ForegroundColor Green
        Write-Host "📍 URL: http://localhost:$Port" -ForegroundColor Cyan
        Write-Host "📁 Module: $((Resolve-Path $ModulePath).Path)" -ForegroundColor Gray
        Write-Host "⏹️  Press Ctrl+C to stop" -ForegroundColor Yellow
        Write-Host ""
        
        if ($AutoLaunch) {
            Start-Process "http://localhost:$Port"
        }
        
        $script:listener = $listener
        $script:serverRunning = $true
        
        while ($serverRunning -and $listener.IsListening) {
            try {
                $context = $listener.GetContext()
                Handle-Request $context
            }
            catch [System.Net.HttpListenerException] {
                if ($_.Exception.ErrorCode -ne 995) {
                    # Not aborted
                    Write-Warning "Listener error: $($_.Exception.Message)"
                }
                break
            }
            catch {
                Write-Warning "Request error: $($_.Exception.Message)"
            }
        }
    }
    catch {
        Write-Error "Failed to start server: $_"
    }
    finally {
        if ($listener -and $listener.IsListening) {
            $listener.Stop()
            $listener.Close()
        }
        Write-Host "Server stopped" -ForegroundColor Red
    }
}

# Cleanup on exit
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    $script:serverRunning = $false
    if ($script:listener -and $script:listener.IsListening) {
        $script:listener.Stop()
        $script:listener.Close()
    }
}

# Main execution
Write-Host "🔧 AnyAPI GUI Server v2.0" -ForegroundColor Magenta
Write-Host "💎 Modern Web Interface for AnyAPI PowerShell Module" -ForegroundColor Magenta

Start-WebServer