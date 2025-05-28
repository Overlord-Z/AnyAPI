# AnyAPI Module v0.3.0 - PowerShell 7+ with Pagination Support

#Requires -Version 7.2

# Script-scoped variables
$script:AnyApiProfiles = @{}
$script:AnyApiProfilesLoadedFromDisk = $false
$script:IsWindows = $PSVersionTable.PSVersion.Major -ge 6 ? $IsWindows : $true
$script:IsMacOS = $PSVersionTable.PSVersion.Major -ge 6 ? $IsMacOS : $false
$script:IsLinux = $PSVersionTable.PSVersion.Major -ge 6 ? $IsLinux : $false
$script:LastResponseHeaders = @{}

# Performance optimization: Cache authentication headers and pagination types
$script:AuthHeaderCache = @{}
$script:PaginationTypeCache = @{}
$script:SecretStorageProvider = $null

# Define known sensitive keys that should be SecureString
$script:SensitiveAuthDetailKeys = @(
    'ApiKeyValue',
    'TokenValue',
    'ClientSecret',
    'PrivateKey',
    'Password',
    'RefreshToken'
)

#region Parameter Builder Classes

class ApiRequestBuilder {
    [string]$ProfileName
    [string]$Endpoint
    [string]$Method = "GET"
    [hashtable]$QueryParameters = @{}
    [hashtable]$PathParameters = @{}
    [object]$Body
    [hashtable]$Headers = @{}
    [string]$ContentType
    [int]$MaxRetries = 3
    [int]$InitialBackoffMs = 1000
    [bool]$SuppressErrors = $false
    [hashtable]$SecureValues = @{}
    [bool]$GetAllPages = $false
    [scriptblock]$Stream
    [int]$PageSize = 0
    [int]$MaxPages = 1000

    # Constructor with minimal required parameters
    ApiRequestBuilder([string]$ProfileName, [string]$Endpoint) {
        $this.ProfileName = $ProfileName
        $this.Endpoint = $Endpoint
    }

    # Fluent interface methods for chaining
    [ApiRequestBuilder] WithMethod([string]$Method) {
        $this.Method = $Method
        return $this
    }

    [ApiRequestBuilder] WithQueryParameters([hashtable]$QueryParameters) {
        $this.QueryParameters = $QueryParameters ?? @{}
        return $this
    }

    [ApiRequestBuilder] WithPathParameters([hashtable]$PathParameters) {
        $this.PathParameters = $PathParameters ?? @{}
        return $this
    }

    [ApiRequestBuilder] WithBody([object]$Body) {
        $this.Body = $Body
        return $this
    }

    [ApiRequestBuilder] WithHeaders([hashtable]$Headers) {
        $this.Headers = $Headers ?? @{}
        return $this
    }

    [ApiRequestBuilder] WithContentType([string]$ContentType) {
        $this.ContentType = $ContentType
        return $this
    }

    [ApiRequestBuilder] WithRetryPolicy([int]$MaxRetries, [int]$InitialBackoffMs) {
        $this.MaxRetries = $MaxRetries
        $this.InitialBackoffMs = $InitialBackoffMs
        return $this
    }

    [ApiRequestBuilder] WithSecureValues([hashtable]$SecureValues) {
        $this.SecureValues = $SecureValues ?? @{}
        return $this
    }

    [ApiRequestBuilder] WithPagination([bool]$GetAllPages, [int]$PageSize, [int]$MaxPages) {
        $this.GetAllPages = $GetAllPages
        $this.PageSize = $PageSize
        $this.MaxPages = $MaxPages
        return $this
    }

    [ApiRequestBuilder] WithStream([scriptblock]$Stream) {
        $this.Stream = $Stream
        return $this
    }

    [ApiRequestBuilder] SuppressErrors([bool]$SuppressErrors) {
        $this.SuppressErrors = $SuppressErrors
        return $this
    }

    # Build method to create hashtable for existing functions
    [hashtable] Build() {
    $params = @{
        ProfileName      = $this.ProfileName
        Endpoint         = $this.Endpoint
        Method           = $this.Method
        QueryParameters  = $this.QueryParameters
        PathParameters   = $this.PathParameters
        Headers          = $this.Headers
        MaxRetries       = $this.MaxRetries
        InitialBackoffMs = $this.InitialBackoffMs
        SuppressErrors   = $this.SuppressErrors
        SecureValues     = $this.SecureValues
        GetAllPages      = $this.GetAllPages
        MaxPages         = $this.MaxPages
    }

    # Add optional parameters only if they have values
    if ($this.Body) { $params.Body = $this.Body }
    if ($this.ContentType) { $params.ContentType = $this.ContentType }
    if ($this.Stream) { $params.Stream = $this.Stream }
    if ($this.PageSize -gt 0) { $params.PageSize = $this.PageSize }

    return $params
}

    # Validate required parameters
    [bool] IsValid() {
        return ![string]::IsNullOrWhiteSpace($this.ProfileName) -and
        ![string]::IsNullOrWhiteSpace($this.Endpoint)
    }
}

class ProfileInitializationBuilder {
    [string]$ProfileName
    [string]$BaseUrl
    [hashtable]$AuthenticationDetails = @{}
    [hashtable]$PaginationDetails = @{}
    [hashtable]$ErrorHandlingDetails = @{}
    [hashtable]$DefaultHeaders = @{}
    [hashtable]$CustomSettings = @{}
    [bool]$NoLocalFilePersistence = $false
    [bool]$Force = $false
    [hashtable]$SecureValues = @{}

    # Constructor with required parameters
    ProfileInitializationBuilder([string]$ProfileName, [string]$BaseUrl, [hashtable]$AuthenticationDetails) {
        $this.ProfileName = $ProfileName
        $this.BaseUrl = $BaseUrl
        $this.AuthenticationDetails = $AuthenticationDetails
    }

    # Fluent interface methods
    [ProfileInitializationBuilder] WithPagination([hashtable]$PaginationDetails) {
        $this.PaginationDetails = $PaginationDetails ?? @{}
        return $this
    }

    [ProfileInitializationBuilder] WithErrorHandling([hashtable]$ErrorHandlingDetails) {
        $this.ErrorHandlingDetails = $ErrorHandlingDetails ?? @{}
        return $this
    }

    [ProfileInitializationBuilder] WithDefaultHeaders([hashtable]$DefaultHeaders) {
        $this.DefaultHeaders = $DefaultHeaders ?? @{}
        return $this
    }

    [ProfileInitializationBuilder] WithCustomSettings([hashtable]$CustomSettings) {
        $this.CustomSettings = $CustomSettings ?? @{}
        return $this
    }

    [ProfileInitializationBuilder] WithSecureValues([hashtable]$SecureValues) {
        $this.SecureValues = $SecureValues ?? @{}
        return $this
    }

    [ProfileInitializationBuilder] SessionOnly([bool]$NoLocalFilePersistence) {
        $this.NoLocalFilePersistence = $NoLocalFilePersistence
        return $this
    }

    [ProfileInitializationBuilder] ForceOverwrite([bool]$Force) {
        $this.Force = $Force
        return $this
    }

    # Build method to create hashtable for Initialize-AnyApiProfile
    [hashtable] Build() {
        $params = @{
            ProfileName            = $this.ProfileName
            BaseUrl                = $this.BaseUrl
            AuthenticationDetails  = $this.AuthenticationDetails
            PaginationDetails      = $this.PaginationDetails
            ErrorHandlingDetails   = $this.ErrorHandlingDetails
            DefaultHeaders         = $this.DefaultHeaders
            CustomSettings         = $this.CustomSettings
            NoLocalFilePersistence = $this.NoLocalFilePersistence
            Force                  = $this.Force
            SecureValues           = $this.SecureValues
        }

        return $params
    }

    # Validate required parameters
    [bool] IsValid() {
        return ![string]::IsNullOrWhiteSpace($this.ProfileName) -and
        ![string]::IsNullOrWhiteSpace($this.BaseUrl) -and
        $this.AuthenticationDetails.Count -gt 0 -and
        $this.AuthenticationDetails.ContainsKey('AuthType')
    }
}

function Clear-AuthHeaderCache {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string]$ProfileName
    )
    
    if ($ProfileName) {
        if ($script:AuthHeaderCache.ContainsKey($ProfileName)) {
            $script:AuthHeaderCache.Remove($ProfileName)
            Write-Verbose "Cleared authentication header cache for profile: $ProfileName"
        }
    } else {
        $script:AuthHeaderCache.Clear()
        Write-Verbose "Cleared all authentication header cache entries"
    }
}

function Clear-PaginationTypeCache {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string]$ProfileName
    )
    
    if ($ProfileName) {
        if ($script:PaginationTypeCache.ContainsKey($ProfileName)) {
            $script:PaginationTypeCache.Remove($ProfileName)
            Write-Verbose "Cleared pagination type cache for profile: $ProfileName"
        }
    } else {
        $script:PaginationTypeCache.Clear()
        Write-Verbose "Cleared all pagination type cache entries"
    }
}

function Clear-AllProfileCaches {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string]$ProfileName
    )
    
    if ($ProfileName) {
        Clear-AuthHeaderCache -ProfileName $ProfileName
        Clear-PaginationTypeCache -ProfileName $ProfileName
        Write-Verbose "Cleared all caches for profile: $ProfileName"
    } else {
        Clear-AuthHeaderCache
        Clear-PaginationTypeCache
        Write-Verbose "Cleared all profile caches"
    }
}

#endregion

#region Enhanced Cross-Platform Secret Storage with SecretManagement

function Get-SecretStorageProvider {
    [OutputType([string])]
    param()
    
    if ($null -eq $script:SecretStorageProvider) {
        # Check for SecretManagement first (preferred)
        if (Get-Module Microsoft.PowerShell.SecretManagement -ListAvailable -ErrorAction SilentlyContinue) {
            try {
                Import-Module Microsoft.PowerShell.SecretManagement -ErrorAction Stop
                $script:SecretStorageProvider = 'SecretManagement'
                Write-Verbose "Using Microsoft.PowerShell.SecretManagement for secret storage"
            }
            catch {
                Write-Verbose "Failed to import SecretManagement module: $($_.Exception.Message)"
                $script:SecretStorageProvider = $null
            }
        }
        
        # Fallback to platform-specific methods if SecretManagement not available
        if ($null -eq $script:SecretStorageProvider) {
            if ($script:IsWindows) { 
                $script:SecretStorageProvider = 'DPAPI_InMemory' 
            }
            elseif ($script:IsMacOS -and (Get-Command security -ErrorAction SilentlyContinue)) { 
                $script:SecretStorageProvider = 'Keychain' 
            }
            elseif ($script:IsLinux -and (Get-Command secret-tool -ErrorAction SilentlyContinue)) { 
                $script:SecretStorageProvider = 'SecretService' 
            }
            else { 
                $script:SecretStorageProvider = 'PlainText_InMemory_Only' 
            }
        }
        
        $env:ANYAPI_SECRET_PROVIDER = $script:SecretStorageProvider
    }
    return $script:SecretStorageProvider
}

function Initialize-SecretStore {
    <#
    .SYNOPSIS
    Initializes and configures the SecretStore for AnyAPI
    
    .DESCRIPTION
    Sets up Microsoft.PowerShell.SecretStore as the default vault for AnyAPI secret storage.
    This function will install required modules if needed and configure the SecretStore.
    
    .PARAMETER Force
    Force reinstallation/reconfiguration of SecretStore
    
    .PARAMETER Scope
    Installation scope for modules (CurrentUser or AllUsers)
    
    .EXAMPLE
    Initialize-SecretStore
    
    .EXAMPLE
    Initialize-SecretStore -Force -Scope AllUsers
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [switch]$Force,
        [ValidateSet('CurrentUser', 'AllUsers')]
        [string]$Scope = 'CurrentUser'
    )
    
    $requiredModules = @(
        'Microsoft.PowerShell.SecretManagement',
        'Microsoft.PowerShell.SecretStore'
    )
    
    # Check and install required modules
    foreach ($moduleName in $requiredModules) {
        $module = Get-Module $moduleName -ListAvailable
        if (-not $module -or $Force) {
            if ($PSCmdlet.ShouldProcess($moduleName, "Install Module")) {
                Write-Host "Installing $moduleName..." -ForegroundColor Yellow
                try {
                    Install-Module $moduleName -Scope $Scope -Force:$Force -AllowClobber
                    Write-Host "Successfully installed $moduleName" -ForegroundColor Green
                }
                catch {
                    Write-Error "Failed to install $moduleName`: $($_.Exception.Message)"
                    return $false
                }
            }
        }
    }
    
    # Import modules
    try {
        Import-Module Microsoft.PowerShell.SecretManagement, Microsoft.PowerShell.SecretStore -ErrorAction Stop
    }
    catch {
        Write-Error "Failed to import SecretManagement modules: $($_.Exception.Message)"
        return $false
    }
    
    # Configure SecretStore vault
    $vaultName = 'AnyAPI-SecretStore'
    $existingVault = Get-SecretVault -Name $vaultName -ErrorAction SilentlyContinue
    
    if (-not $existingVault -or $Force) {
        if ($PSCmdlet.ShouldProcess($vaultName, "Register SecretStore Vault")) {
            try {
                if ($existingVault) {
                    Unregister-SecretVault -Name $vaultName -ErrorAction SilentlyContinue
                }
                
                # Register the SecretStore vault for AnyAPI
                Register-SecretVault -Name $vaultName -ModuleName Microsoft.PowerShell.SecretStore -DefaultVault
                
                # Configure SecretStore settings for better automation
                Set-SecretStoreConfiguration -Scope CurrentUser -Authentication Password -PasswordTimeout 3600 -Interaction None -Confirm:$false
                
                Write-Host "Successfully configured SecretStore vault: $vaultName" -ForegroundColor Green
                
                # Test the vault
                $testSecret = "AnyAPI-Test-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
                Set-Secret -Name $testSecret -Secret "test" -Vault $vaultName
                $retrieved = Get-Secret -Name $testSecret -Vault $vaultName -AsPlainText
                Remove-Secret -Name $testSecret -Vault $vaultName -Confirm:$false
                
                if ($retrieved -eq "test") {
                    Write-Host "SecretStore vault is working correctly" -ForegroundColor Green
                    return $true
                }
                else {
                    Write-Warning "SecretStore test failed - vault may not be working correctly"
                    return $false
                }
            }
            catch {
                Write-Error "Failed to configure SecretStore: $($_.Exception.Message)"
                return $false
            }
        }
    }
    else {
        Write-Host "SecretStore vault '$vaultName' already exists and is configured" -ForegroundColor Green
        return $true
    }
}

function Set-SecureValue {
    param(
        [string]$Name,
        [SecureString]$Value,
        [string]$ProfileName
    )

    $provider = $env:ANYAPI_SECRET_PROVIDER ?? (Get-SecretStorageProvider)
    Write-Verbose "Set-SecureValue: Provider='$provider', Profile='$ProfileName', KeyName='$Name'"

    switch ($provider) {
        'SecretManagement' {
            try {
                $vaultName = 'AnyAPI-SecretStore'
                $secretName = "AnyAPI.$ProfileName.$Name"
                
                # Check if vault exists, if not try to use default
                $vault = Get-SecretVault -Name $vaultName -ErrorAction SilentlyContinue
                if (-not $vault) {
                    $vault = Get-SecretVault | Where-Object IsDefault | Select-Object -First 1
                    if ($vault) {
                        $vaultName = $vault.Name
                        Write-Verbose "Using default vault: $vaultName"
                    }
                    else {
                        Write-Warning "No SecretStore vault available. Run Initialize-SecretStore first."
                        # Fallback to in-memory
                        return $Value
                    }
                }
                
                # Store the secret
                Set-Secret -Name $secretName -Secret $Value -Vault $vaultName -ErrorAction Stop
                Write-Verbose "Successfully stored secret '$Name' in SecretManagement vault '$vaultName'"
                
                # Return reference string as SecureString
                return ConvertTo-SecureString "EXTERNAL:SecretManagement:$vaultName`:$secretName" -AsPlainText -Force
            }
            catch {
                Write-Warning "Failed to store secret '$Name' in SecretManagement for profile '$ProfileName': $($_.Exception.Message)"
                Write-Verbose "Falling back to in-memory storage"
                return $Value
            }
        }
        'Keychain' {
            $serviceName = "AnyAPI.$ProfileName"
            $accountName = $Name
            $plainValueToStore = ConvertFrom-SecureString $Value -AsPlainText
            
            & security add-generic-password -a $accountName -s $serviceName -w $plainValueToStore -U 2>$null
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "Failed to set secret for '$Name' in macOS Keychain for profile '$ProfileName'. Error code: $LASTEXITCODE"
                return $Value
            }
            Write-Verbose "Successfully set secret for '$Name' in macOS Keychain."
            return ConvertTo-SecureString "EXTERNAL:Keychain:$ProfileName`:$Name" -AsPlainText -Force
        }
        'SecretService' {
            $label = "AnyAPI: $ProfileName - $Name"
            $plainValueToStore = ConvertFrom-SecureString $Value -AsPlainText
            
            $process = Start-Process secret-tool -ArgumentList "store --label=""$label"" profile ""$ProfileName"" key ""$Name""" -PassThru -Wait -RedirectStandardInputFromString $plainValueToStore -RedirectStandardError ".\secret_tool_error.tmp" -WindowStyle Hidden
            
            $retrieved = & secret-tool lookup profile "$ProfileName" key "$Name" 2>$null
            if ($LASTEXITCODE -ne 0 -or -not $retrieved) {
                Write-Warning "Failed to set secret for '$Name' in Linux Secret Service for profile '$ProfileName'. Check 'secret_tool_error.tmp' if it exists. Error code: $LASTEXITCODE"
                Remove-Item ".\secret_tool_error.tmp" -ErrorAction SilentlyContinue
                return $Value
            }
            Remove-Item ".\secret_tool_error.tmp" -ErrorAction SilentlyContinue
            Write-Verbose "Successfully set secret for '$Name' in Linux Secret Service."
            return ConvertTo-SecureString "EXTERNAL:SecretService:$ProfileName`:$Name" -AsPlainText -Force
        }
        default {
            Write-Verbose "Secret for '$Name' (profile '$ProfileName') will be held as SecureString in memory. It will NOT be saved as plaintext to JSON."
            return $Value
        }
    }
}

function Get-SecureValue {
    param(
        [SecureString]$Value,
        [string]$ProfileName
    )

    if (-not ($Value -is [System.Security.SecureString])) {
        Write-Verbose "Get-SecureValue: Input value is not a SecureString. Returning as-is (or null)."
        return $Value
    }

    $referenceString = ConvertFrom-SecureString $Value -AsPlainText

    if ($referenceString -match '^EXTERNAL:(.+?):(.+?):(.+)$') {
        $provider = $Matches[1]
        $storedLocation = $Matches[2]  # Could be ProfileName or VaultName
        $keyName = $Matches[3]

        Write-Verbose "Get-SecureValue: Resolving external reference. Provider='$provider', Location='$storedLocation', KeyName='$keyName'"

        switch ($provider) {
            'SecretManagement' {
                try {
                    # For SecretManagement, $storedLocation is the vault name and $keyName is the full secret name
                    $secretName = $keyName
                    $vaultName = $storedLocation
                    
                    # Check if the vault exists
                    $vault = Get-SecretVault -Name $vaultName -ErrorAction SilentlyContinue
                    if (-not $vault) {
                        Write-Warning "SecretManagement vault '$vaultName' not found. Trying default vault."
                        $vault = Get-SecretVault | Where-Object IsDefault | Select-Object -First 1
                        if (-not $vault) {
                            Write-Warning "No default SecretManagement vault available."
                            return $null
                        }
                        $vaultName = $vault.Name
                    }
                    
                    $secret = Get-Secret -Name $secretName -Vault $vaultName -ErrorAction Stop
                    Write-Verbose "Successfully retrieved secret '$keyName' from SecretManagement vault '$vaultName'."
                    return $secret
                }
                catch {
                    Write-Warning "Could not retrieve secure value '$keyName' from SecretManagement vault '$vaultName': $($_.Exception.Message)"
                    return $null
                }
            }
            'Keychain' {
                $serviceName = "AnyAPI.$storedLocation"
                $accountName = $keyName
                $result = & security find-generic-password -a $accountName -s $serviceName -w 2>$null
                if ($LASTEXITCODE -eq 0 -and $result) {
                    Write-Verbose "Successfully retrieved secret for '$keyName' from macOS Keychain."
                    return ConvertTo-SecureString $result -AsPlainText -Force
                }
                else {
                    Write-Warning "Could not retrieve secure value for '$keyName' from macOS Keychain (Profile: '$storedLocation'). Service: '$serviceName', Account: '$accountName'. ExitCode: $LASTEXITCODE"
                }
            }
            'SecretService' {
                $result = & secret-tool lookup profile "$storedLocation" key "$keyName" 2>$null
                if ($LASTEXITCODE -eq 0 -and $result) {
                    Write-Verbose "Successfully retrieved secret for '$keyName' from Linux Secret Service."
                    return ConvertTo-SecureString $result -AsPlainText -Force
                }
                else {
                    Write-Warning "Could not retrieve secure value for '$keyName' from Linux Secret Service (Profile: '$storedLocation'). ExitCode: $LASTEXITCODE"
                }
            }
            default {
                Write-Warning "Get-SecureValue: Unknown external provider '$provider' in reference string '$referenceString'."
            }
        }
        Write-Warning "Failed to resolve external secret reference: $referenceString"
        return $null
    }

    # If not an EXTERNAL reference, it's an actual SecureString (e.g., for in-memory case)
    Write-Verbose "Get-SecureValue: Returning in-memory SecureString for profile '$ProfileName'."
    return $Value
}

function Test-SecretStorage {
    <#
    .SYNOPSIS
    Tests the secret storage capabilities of AnyAPI
    
    .DESCRIPTION
    Performs comprehensive testing of secret storage and retrieval across all available providers
    
    .EXAMPLE
    Test-SecretStorage
    #>
    [CmdletBinding()]
    param()
    
    Write-Host "Testing AnyAPI Secret Storage Capabilities" -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Cyan
    
    $provider = Get-SecretStorageProvider
    Write-Host "Current Provider: $provider" -ForegroundColor Yellow
    
    # Test basic functionality
    $testProfileName = "TestProfile-$(Get-Date -Format 'yyyyMMddHHmmss')"
    $testKeyName = "TestKey"
    $testSecret = "TestSecret-$(Get-Random)"
    $testSecureString = ConvertTo-SecureString $testSecret -AsPlainText -Force
    
    Write-Host "`nTesting Set-SecureValue..." -ForegroundColor Green
    try {
        $storedValue = Set-SecureValue -Name $testKeyName -Value $testSecureString -ProfileName $testProfileName
        Write-Host "✓ Secret stored successfully" -ForegroundColor Green
        
        # Check if it's an external reference
        $referenceString = ConvertFrom-SecureString $storedValue -AsPlainText
        if ($referenceString -match '^EXTERNAL:') {
            Write-Host "  Storage Type: External ($referenceString)" -ForegroundColor Gray
        }
        else {
            Write-Host "  Storage Type: In-Memory SecureString" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "✗ Failed to store secret: $($_.Exception.Message)" -ForegroundColor Red
        return
    }
    
    Write-Host "`nTesting Get-SecureValue..." -ForegroundColor Green
    try {
        $retrievedValue = Get-SecureValue -Value $storedValue -ProfileName $testProfileName
        if ($retrievedValue -and $retrievedValue -is [System.Security.SecureString]) {
            $retrievedPlainText = ConvertFrom-SecureString $retrievedValue -AsPlainText
            if ($retrievedPlainText -eq $testSecret) {
                Write-Host "✓ Secret retrieved and verified successfully" -ForegroundColor Green
            }
            else {
                Write-Host "✗ Secret retrieved but content doesn't match" -ForegroundColor Red
            }
        }
        else {
            Write-Host "✗ Failed to retrieve secret or wrong type returned" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "✗ Failed to retrieve secret: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Cleanup test secrets
    Write-Host "`nCleaning up test secrets..." -ForegroundColor Gray
    switch ($provider) {
        'SecretManagement' {
            try {
                $vaultName = 'AnyAPI-SecretStore'
                $secretName = "AnyAPI.$testProfileName.$testKeyName"
                Remove-Secret -Name $secretName -Vault $vaultName -Confirm:$false -ErrorAction SilentlyContinue
            }
            catch {
                # Ignore cleanup errors
            }
        }
        'Keychain' {
            $serviceName = "AnyAPI.$testProfileName"
            & security delete-generic-password -a $testKeyName -s $serviceName 2>$null
        }
        'SecretService' {
            & secret-tool clear profile "$testProfileName" key "$testKeyName" 2>$null
        }
    }
    
    # Test SecretManagement availability
    Write-Host "`nSecretManagement Module Status:" -ForegroundColor Yellow
    $secretMgmtModule = Get-Module Microsoft.PowerShell.SecretManagement -ListAvailable
    if ($secretMgmtModule) {
        Write-Host "✓ Microsoft.PowerShell.SecretManagement is available (Version: $($secretMgmtModule.Version))" -ForegroundColor Green
        
        $secretStoreModule = Get-Module Microsoft.PowerShell.SecretStore -ListAvailable
        if ($secretStoreModule) {
            Write-Host "✓ Microsoft.PowerShell.SecretStore is available (Version: $($secretStoreModule.Version))" -ForegroundColor Green
            
            # Check vaults
            try {
                $vaults = Get-SecretVault -ErrorAction SilentlyContinue
                if ($vaults) {
                    Write-Host "✓ SecretManagement vaults configured:" -ForegroundColor Green
                    foreach ($vault in $vaults) {
                        $status = if ($vault.IsDefault) { "(Default)" } else { "" }
                        Write-Host "    - $($vault.Name) $status" -ForegroundColor Gray
                    }
                }
                else {
                    Write-Host "⚠ No SecretManagement vaults configured" -ForegroundColor Yellow
                    Write-Host "    Run Initialize-SecretStore to set up AnyAPI vault" -ForegroundColor Gray
                }
            }
            catch {
                Write-Host "⚠ Could not enumerate SecretManagement vaults: $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
        else {
            Write-Host "⚠ Microsoft.PowerShell.SecretStore is not available" -ForegroundColor Yellow
            Write-Host "    Run Initialize-SecretStore to install and configure" -ForegroundColor Gray
        }
    }
    else {
        Write-Host "⚠ Microsoft.PowerShell.SecretManagement is not available" -ForegroundColor Yellow
        Write-Host "    Run Initialize-SecretStore to install and configure" -ForegroundColor Gray
    }
    
    Write-Host "`nRecommendations:" -ForegroundColor Cyan
    if ($provider -ne 'SecretManagement') {
        Write-Host "• Run Initialize-SecretStore for enhanced secret management" -ForegroundColor White
    }
    Write-Host "• Secrets are automatically encrypted using the most secure method available" -ForegroundColor White
    Write-Host "• Use session-only profiles for temporary credentials" -ForegroundColor White
    
    Write-Host "`nSecret Storage Test Complete!" -ForegroundColor Cyan
}

function Get-SecretStorageInfo {
    <#
    .SYNOPSIS
    Displays detailed information about the current secret storage configuration
    
    .DESCRIPTION
    Shows the active secret storage provider, available options, and recommendations
    
    .EXAMPLE
    Get-SecretStorageInfo
    #>
    [CmdletBinding()]
    param()
    
    $provider = Get-SecretStorageProvider
    
    Write-Host "AnyAPI Secret Storage Information" -ForegroundColor Cyan
    Write-Host "=" * 40 -ForegroundColor Cyan
    
    Write-Host "`nActive Provider: " -NoNewline -ForegroundColor Yellow
    Write-Host $provider -ForegroundColor White
    
    switch ($provider) {
        'SecretManagement' {
            Write-Host "Status: " -NoNewline -ForegroundColor Green
            Write-Host "Optimal - Using Microsoft.PowerShell.SecretManagement" -ForegroundColor White
            
            try {
                $vaults = Get-SecretVault -ErrorAction SilentlyContinue
                if ($vaults) {
                    Write-Host "`nConfigured Vaults:" -ForegroundColor Yellow
                    foreach ($vault in $vaults) {
                        $status = if ($vault.IsDefault) { " (Default)" } else { "" }
                        Write-Host "  • $($vault.Name)$status" -ForegroundColor White
                    }
                }
            }
            catch {
                Write-Host "Warning: Could not enumerate vaults" -ForegroundColor Red
            }
        }
        'DPAPI_InMemory' {
            Write-Host "Status: " -NoNewline -ForegroundColor Yellow
            Write-Host "Fallback - Using Windows DPAPI (in-memory)" -ForegroundColor White
            Write-Host "Recommendation: Run Initialize-SecretStore for persistent storage" -ForegroundColor Gray
        }
        'Keychain' {
            Write-Host "Status: " -NoNewline -ForegroundColor Yellow
            Write-Host "Good - Using macOS Keychain" -ForegroundColor White
            Write-Host "Recommendation: Consider Initialize-SecretStore for cross-platform compatibility" -ForegroundColor Gray
        }
        'SecretService' {
            Write-Host "Status: " -NoNewline -ForegroundColor Yellow
            Write-Host "Good - Using Linux Secret Service" -ForegroundColor White
            Write-Host "Recommendation: Consider Initialize-SecretStore for enhanced features" -ForegroundColor Gray
        }
        'PlainText_InMemory_Only' {
            Write-Host "Status: " -NoNewline -ForegroundColor Red
            Write-Host "Limited - In-memory only (no persistence)" -ForegroundColor White
            Write-Host "Recommendation: Run Initialize-SecretStore to enable secure storage" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`nPlatform Information:" -ForegroundColor Yellow
    Write-Host "  OS: " -NoNewline -ForegroundColor Gray
    if ($script:IsWindows) { Write-Host "Windows" -ForegroundColor White }
    elseif ($script:IsMacOS) { Write-Host "macOS" -ForegroundColor White }
    elseif ($script:IsLinux) { Write-Host "Linux" -ForegroundColor White }
    else { Write-Host "Unknown" -ForegroundColor Red }
    
    Write-Host "  PowerShell: " -NoNewline -ForegroundColor Gray
    Write-Host "$($PSVersionTable.PSVersion)" -ForegroundColor White
    
    # Module availability
    Write-Host "`nModule Availability:" -ForegroundColor Yellow
    $secretMgmt = Get-Module Microsoft.PowerShell.SecretManagement -ListAvailable
    $secretStore = Get-Module Microsoft.PowerShell.SecretStore -ListAvailable
    
    Write-Host "  SecretManagement: " -NoNewline -ForegroundColor Gray
    if ($secretMgmt) {
        Write-Host "✓ Available (v$($secretMgmt.Version))" -ForegroundColor Green
    }
    else {
        Write-Host "✗ Not installed" -ForegroundColor Red
    }
    
    Write-Host "  SecretStore: " -NoNewline -ForegroundColor Gray
    if ($secretStore) {
        Write-Host "✓ Available (v$($secretStore.Version))" -ForegroundColor Green
    }
    else {
        Write-Host "✗ Not installed" -ForegroundColor Red
    }
    
    if (-not $secretMgmt -or -not $secretStore) {
        Write-Host "`nTo install SecretManagement modules:" -ForegroundColor Cyan
        Write-Host "  Initialize-SecretStore" -ForegroundColor White
        Write-Host "  # or manually:" -ForegroundColor Gray
        Write-Host "  Install-Module Microsoft.PowerShell.SecretManagement, Microsoft.PowerShell.SecretStore" -ForegroundColor White
    }
}

function Reset-SecretStorage {
    <#
    .SYNOPSIS
    Resets the secret storage provider cache and re-detects the best available option
    
    .DESCRIPTION
    Forces re-detection of secret storage capabilities and clears any cached provider information
    
    .EXAMPLE
    Reset-SecretStorage
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param()
    
    if ($PSCmdlet.ShouldProcess("Secret Storage Provider Cache", "Reset and Re-detect")) {
        $script:SecretStorageProvider = $null
        Remove-Item "env:ANYAPI_SECRET_PROVIDER" -ErrorAction SilentlyContinue
        
        $newProvider = Get-SecretStorageProvider
        Write-Host "Secret storage provider reset. New provider: $newProvider" -ForegroundColor Green
        
        # Optionally test the new provider
        Write-Host "Testing new provider..." -ForegroundColor Yellow
        Test-SecretStorage
    }
}

#endregion

#region Custom Script Secret Resolution Helper

function Resolve-ProfileSecrets {
    <#
    .SYNOPSIS
    Resolves all SecureString references in a profile to their actual values for use in custom scripts
    
    .DESCRIPTION
    Creates a copy of the profile with secrets available in multiple formats:
    - Original SecureString objects (for functions that require SecureString)
    - Plain text values (for direct use in authentication logic)
    - A separate PlainTextSecrets hashtable for easy access
    
    .PARAMETER Profile
    The profile object containing SecureString references
    
    .PARAMETER ProfileName
    The name of the profile (used for secret resolution context)
    
    .EXAMPLE
    $resolvedProfile = Resolve-ProfileSecrets -Profile $profile -ProfileName "MyAPI"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [hashtable]$Profile,
        [Parameter(Mandatory)]
        [string]$ProfileName
    )

    # Create a deep copy of the profile
    $resolvedProfile = @{}
    foreach ($key in $Profile.Keys) {
        if ($Profile[$key] -is [hashtable]) {
            $resolvedProfile[$key] = $Profile[$key].Clone()
        } else {
            $resolvedProfile[$key] = $Profile[$key]
        }
    }

    # Add a separate PlainTextSecrets hashtable for easy access
    $resolvedProfile['PlainTextSecrets'] = @{}
    $resolvedProfile['SecureSecrets'] = @{}

    # Process AuthenticationDetails
    if ($resolvedProfile.AuthenticationDetails -is [hashtable]) {
        $authDetails = $resolvedProfile.AuthenticationDetails
        foreach ($authKey in $script:SensitiveAuthDetailKeys) {
            if ($authDetails.ContainsKey($authKey) -and $authDetails[$authKey] -is [System.Security.SecureString]) {
                try {
                    $resolvedSecret = Get-SecureValue -Value $authDetails[$authKey] -ProfileName $ProfileName
                    if ($resolvedSecret -and $resolvedSecret -is [System.Security.SecureString]) {
                        # Store both formats for maximum flexibility
                        $plainTextValue = ConvertFrom-SecureString $resolvedSecret -AsPlainText
                        
                        # Keep the original SecureString in the main structure (for backward compatibility)
                        $authDetails[$authKey] = $resolvedSecret
                        
                        # Add plain text version to easy access hashtable
                        $resolvedProfile.PlainTextSecrets[$authKey] = $plainTextValue
                        $resolvedProfile.SecureSecrets[$authKey] = $resolvedSecret
                        
                        Write-Verbose "Resolved secret '$authKey' for custom script in profile '$ProfileName' (both formats available)"
                    } else {
                        Write-Warning "Failed to resolve secret '$authKey' for custom script in profile '$ProfileName'"
                        $authDetails[$authKey] = $null
                        $resolvedProfile.PlainTextSecrets[$authKey] = $null
                        $resolvedProfile.SecureSecrets[$authKey] = $null
                    }
                }
                catch {
                    Write-Warning "Error resolving secret '$authKey' for custom script in profile '$ProfileName': $($_.Exception.Message)"
                    $authDetails[$authKey] = $null
                    $resolvedProfile.PlainTextSecrets[$authKey] = $null
                    $resolvedProfile.SecureSecrets[$authKey] = $null
                }
            }
        }
    }

    # Process CustomSettings
    if ($resolvedProfile.CustomSettings -is [hashtable]) {
        $customSettings = $resolvedProfile.CustomSettings
        # Create a copy of keys to avoid collection modification during enumeration
        $customKeys = @($customSettings.Keys)
        foreach ($customKey in $customKeys) {
            $value = $customSettings[$customKey]
            if ($value -is [System.Security.SecureString]) {
                try {
                    $resolvedSecret = Get-SecureValue -Value $value -ProfileName $ProfileName
                    if ($resolvedSecret -and $resolvedSecret -is [System.Security.SecureString]) {
                        $plainTextValue = ConvertFrom-SecureString $resolvedSecret -AsPlainText
                        
                        # Keep the SecureString in CustomSettings
                        $customSettings[$customKey] = $resolvedSecret
                        
                        # Add plain text version to easy access hashtable
                        $resolvedProfile.PlainTextSecrets[$customKey] = $plainTextValue
                        $resolvedProfile.SecureSecrets[$customKey] = $resolvedSecret
                        
                        Write-Verbose "Resolved custom setting secret '$customKey' for custom script in profile '$ProfileName' (both formats available)"
                    } else {
                        Write-Warning "Failed to resolve custom setting secret '$customKey' for custom script in profile '$ProfileName'"
                        $customSettings[$customKey] = $null
                        $resolvedProfile.PlainTextSecrets[$customKey] = $null
                        $resolvedProfile.SecureSecrets[$customKey] = $null
                    }
                }
                catch {
                    Write-Warning "Error resolving custom setting secret '$customKey' for custom script in profile '$ProfileName': $($_.Exception.Message)"
                    $customSettings[$customKey] = $null
                    $resolvedProfile.PlainTextSecrets[$customKey] = $null
                    $resolvedProfile.SecureSecrets[$customKey] = $null
                }
            }
        }
    }

    return $resolvedProfile
}

#endregion

#region Enhanced Authentication Header Caching with Custom Script Support

function Get-CachedAuthHeaders {
    param(
        [string]$ProfileName,
        [hashtable]$Profile
    )

    # Check if headers are already cached and still valid
    $cacheKey = "$ProfileName"
    if ($script:AuthHeaderCache.ContainsKey($cacheKey)) {
        $cached = $script:AuthHeaderCache[$cacheKey]
        
        # Determine cache duration based on auth type and custom settings
        $maxAge = switch ($cached.AuthType) {
            'BearerToken' { 30 }        # 30 seconds for tokens (may expire)
            'CustomScript' { 
                # Custom scripts can specify their own cache duration
                $cached.CacheDurationSeconds ?? 300  # Default 5 minutes
            }
            default { 300 }             # 5 minutes for API keys and others
        }
        
        if ((Get-Date) -lt $cached.Timestamp.AddSeconds($maxAge)) {
            Write-Verbose "Using cached auth headers for $ProfileName (AuthType: $($cached.AuthType), Age: $([int]((Get-Date) - $cached.Timestamp).TotalSeconds)s)"
            return $cached.Headers
        } else {
            Write-Verbose "Cache expired for $ProfileName (AuthType: $($cached.AuthType), MaxAge: ${maxAge}s)"
        }
    }

    # Build auth headers for non-custom script types (original logic)
    $authHeaders = @{}
    $authDetails = $Profile.AuthenticationDetails

    switch ($authDetails.AuthType) {
        "ApiKey" {
            if ($authDetails.ApiKeyValue) {
                $apiKey = Get-SecureValue -Value $authDetails.ApiKeyValue -ProfileName $ProfileName
                if ($apiKey) {
                    $headerName = $authDetails.ApiKeyName ?? "X-API-Key"
                    $keyValue = ConvertFrom-SecureString $apiKey -AsPlainText

                    # Handle TokenPrefix for ApiKey (e.g., GitHub "token [PAT]")
                    if ($authDetails.TokenPrefix) {
                        # Only prepend if not already present
                        if (-not $keyValue.StartsWith($authDetails.TokenPrefix)) {
                            $keyValue = "$($authDetails.TokenPrefix) $keyValue"
                        }
                    }

                    $authHeaders[$headerName] = $keyValue
                    Write-Verbose "ApiKey authentication header set: $headerName = $($keyValue.Substring(0, [Math]::Min(10, $keyValue.Length)))..."
                }
            }
        }
        "BearerToken" {
            if ($authDetails.TokenValue) {
                $token = Get-SecureValue -Value $authDetails.TokenValue -ProfileName $ProfileName
                if ($token) {
                    # Use TokenPrefix if present, default to "Bearer"
                    $tokenPrefix = $authDetails.TokenPrefix ?? "Bearer"
                    # Only prepend if not already present
                    $tokenValue = ConvertFrom-SecureString $token -AsPlainText
                    if (-not $tokenValue.StartsWith($tokenPrefix)) {
                        $tokenValue = "$tokenPrefix $tokenValue"
                    }
                    $authHeaders["Authorization"] = $tokenValue
                }
            }
        }
        "CustomScript" {
            # Custom scripts are handled in Build-AuthenticationHeaders now
            return $null
        }
    }

    if ($authHeaders.Count -gt 0) {
        # Cache the result
        $script:AuthHeaderCache[$cacheKey] = @{
            Headers   = $authHeaders
            Timestamp = Get-Date
            AuthType  = $authDetails.AuthType
        }
        Write-Verbose "Cached auth headers for $ProfileName (AuthType: $($authDetails.AuthType))"
    }

    return $authHeaders
}

function Set-CustomScriptAuthCache {
    <#
    .SYNOPSIS
    Caches authentication headers from custom scripts
    
    .DESCRIPTION
    Allows custom authentication scripts to cache their generated headers for performance
    
    .PARAMETER ProfileName
    The profile name to cache headers for
    
    .PARAMETER Headers
    The headers to cache
    
    .PARAMETER CacheDurationSeconds
    How long to cache the headers (default: 300 seconds / 5 minutes)
    
    .PARAMETER BypassCache
    If true, forces the cache to be bypassed on next call
    
    .EXAMPLE
    Set-CustomScriptAuthCache -ProfileName "ConnectWise" -Headers $headers -CacheDurationSeconds 1800
    #>
    param(
        [Parameter(Mandatory)]
        [string]$ProfileName,
        [Parameter(Mandatory)]
        [hashtable]$Headers,
        [Parameter()]
        [int]$CacheDurationSeconds = 300,
        [Parameter()]
        [switch]$BypassCache
    )
    
    $cacheKey = "$ProfileName"
    $script:AuthHeaderCache[$cacheKey] = @{
        Headers = $Headers.Clone()
        Timestamp = Get-Date
        AuthType = "CustomScript"
        CacheDurationSeconds = $CacheDurationSeconds
        BypassCache = $BypassCache.IsPresent
    }
    
    Write-Verbose "Cached custom script auth headers for $ProfileName (Duration: ${CacheDurationSeconds}s)"
}

function Clear-CustomScriptAuthCache {
    <#
    .SYNOPSIS
    Clears cached authentication headers for a custom script
    
    .DESCRIPTION
    Forces the next authentication call to re-run the custom script
    
    .PARAMETER ProfileName
    The profile name to clear cache for
    
    .EXAMPLE
    Clear-CustomScriptAuthCache -ProfileName "ConnectWise"
    #>
    param(
        [Parameter(Mandatory)]
        [string]$ProfileName
    )
    
    $cacheKey = "$ProfileName"
    if ($script:AuthHeaderCache.ContainsKey($cacheKey)) {
        $script:AuthHeaderCache.Remove($cacheKey)
        Write-Verbose "Cleared custom script auth cache for $ProfileName"
    }
}

#endregion

#region Internal Helper Functions for Persistence

function Resolve-AnyApiProfile {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ProfileName,
        [Parameter()]
        [hashtable]$SecureValues = @{},
        [Parameter()]
        [switch]$ThrowOnMissing = $true
    )

    # Convert profile-specific SecureValues to global format for _EnsureProfilesLoaded
    $globalSecureValues = @{}
    foreach ($key in $SecureValues.Keys) {
        $globalSecureValues["$ProfileName.$key"] = $SecureValues[$key]
    }

    _EnsureProfilesLoaded -SecureValues $globalSecureValues

    if (-not $script:AnyApiProfiles.ContainsKey($ProfileName)) {
        $errorMessage = "API Profile '$ProfileName' not found."
        if ($ThrowOnMissing) {
            Write-Error $errorMessage -Category ObjectNotFound
            return $null
        }
        else {
            Write-Warning $errorMessage
            return $null
        }
    }

    return $script:AnyApiProfiles[$ProfileName]
}

function Get-AnyApiProfileStoragePath {
    [OutputType([string])]
    param()

    # Cross-platform config directory
    if ($script:IsWindows) {
        $configDir = Join-Path $env:APPDATA 'AnyAPI'
    }
    else {
        $configDir = Join-Path $env:HOME '.config/anyapi'
    }

    return Join-Path $configDir 'profiles.json'
}

function _EnsureProfilesLoaded {
    param(
        [hashtable]$SecureValues = @{
        }
    )
    if (-not $script:AnyApiProfilesLoadedFromDisk) {
        Import-AnyApiProfilesFromLocalFile -SecureValues $SecureValues
        $script:AnyApiProfilesLoadedFromDisk = $true
    }
}

function Import-AnyApiProfilesFromLocalFile {
    # Renamed from _Load-AnyApiProfilesFromLocalFile for clarity
    param(
        [hashtable]$SecureValues = @{} # ProfileName.KeyName = SecureString or plain text
    )

    $profilePath = Get-AnyApiProfileStoragePath
    Write-Verbose "Loading profiles from JSON file: $profilePath"

    if (Test-Path $profilePath) {
        try {
            $jsonContent = Get-Content $profilePath -Raw -ErrorAction Stop
            $loadedData = $jsonContent | ConvertFrom-Json -AsHashtable -ErrorAction Stop

            $tempProfiles = @{
            }
            # Create a copy of the keys to avoid collection modification during enumeration
            $profileKeys = @($loadedData.Keys)
            foreach ($profileNameKey in $profileKeys) {
                $profileFromFile = $loadedData[$profileNameKey]
                $memProfile = $profileFromFile.Clone() # Start with a clone

                # Restore AuthenticationDetails
                if ($memProfile.AuthenticationDetails -is [hashtable]) {
                    $authDetailsFromFile = $profileFromFile.AuthenticationDetails # Get the original from file
                    $memAuthDetails = $memProfile.AuthenticationDetails # This is the one we modify

                    # Create a copy of the auth detail keys to avoid collection modification during enumeration
                    $authKeys = @($authDetailsFromFile.Keys)
                    foreach ($authKey in $authKeys) {
                        $valueFromFile = $authDetailsFromFile[$authKey]
                        if ($script:SensitiveAuthDetailKeys -contains $authKey) {
                            if ($valueFromFile -is [string] -and $valueFromFile -match '^EXTERNAL:.+?:.+?:.+$') {
                                Write-Verbose "Profile '$profileNameKey', AuthKey '$authKey': Storing as EXTERNAL reference SecureString."
                                $memAuthDetails[$authKey] = ConvertTo-SecureString $valueFromFile -AsPlainText -Force
                            }
                            elseif ($valueFromFile -is [string] -and $valueFromFile -eq "<<SECRET_NEEDS_RUNTIME_PROVISIONING>>") {
                                # Check if we have a provided secure value
                                $secureValueKey = "$profileNameKey.$authKey"
                                if ($SecureValues.ContainsKey($secureValueKey)) {
                                    $providedValue = $SecureValues[$secureValueKey]
                                    if ($providedValue -is [string]) {
                                        $providedValue = ConvertTo-SecureString $providedValue -AsPlainText -Force
                                    }
                                    if ($providedValue -is [System.Security.SecureString]) {
                                        Write-Verbose "Profile '$profileNameKey', AuthKey '$authKey': Using provided secure value."
                                        $memAuthDetails[$authKey] = Set-SecureValue -Name $authKey -Value $providedValue -ProfileName $profileNameKey
                                    }
                                    else {
                                        Write-Warning "Profile '$profileNameKey', AuthKey '$authKey': Provided value is not a string or SecureString."
                                        $memAuthDetails[$authKey] = $null
                                    }
                                }
                                else {
                                    Write-Warning "Profile '$profileNameKey', AuthKey '$authKey': Secret needs runtime provisioning. Value is null."
                                    $memAuthDetails[$authKey] = $null # Mark as needing provisioning
                                }
                            }
                            elseif ($valueFromFile -is [string]) {
                                # Should ideally not happen if save is correct
                                Write-Warning "Profile '$profileNameKey', AuthKey '$authKey': Found unexpected plaintext string; converting to SecureString for memory. THIS SHOULD NOT BE IN THE JSON FILE."
                                $memAuthDetails[$authKey] = ConvertTo-SecureString $valueFromFile -AsPlainText -Force
                            }
                            else {
                                # It might be null or already some other type if JSON was manually edited
                                $memAuthDetails[$authKey] = $valueFromFile
                            }
                        }
                        elseif ($authKey -eq 'AuthScriptBlock' -and $valueFromFile -is [string]) {
                            Write-Verbose "Profile '$profileNameKey': Converting AuthScriptBlock string back to ScriptBlock."
                            try { $memAuthDetails[$authKey] = [ScriptBlock]::Create($valueFromFile) }
                            catch { Write-Warning "Failed to recreate AuthScriptBlock for profile '$profileNameKey': $($_.Exception.Message)" }
                        }
                        else {
                            # Non-sensitive keys, already cloned
                        }
                    }
                }
                $tempProfiles[$profileNameKey] = $memProfile
            }
            $script:AnyApiProfiles = $tempProfiles
            Write-Verbose ("Successfully loaded {0} profile(s) from {1}." -f $script:AnyApiProfiles.Count, $profilePath)
        }
        catch {
            Write-Warning "Failed to load or deserialize profiles from JSON file '$profilePath'. Error: $($_.Exception.Message). Starting with an empty profile store."
            $script:AnyApiProfiles = @{
            }
        }
    }
    else {
        Write-Verbose "Profile JSON file not found at $profilePath. Starting with an empty profile store."
        $script:AnyApiProfiles = @{
        }
    }
}

function Save-AnyApiProfilesToLocalFile {
    # Renamed from _Save-AnyApiProfilesToLocalFile
    [CmdletBinding(SupportsShouldProcess = $true)]
    param()

    $profilePath = Get-AnyApiProfileStoragePath
    $configDir = Split-Path $profilePath

    if ($PSCmdlet.ShouldProcess("Profile Configuration JSON File: $profilePath", "Save")) {
        try {
            if (-not (Test-Path $configDir)) {
                Write-Verbose "Creating profile storage directory: $configDir"
                New-Item -Path $configDir -ItemType Directory -Force -ErrorAction Stop | Out-Null
            }

            $profilesToSave = @{
            }
            # Create a copy of the keys to avoid collection modification during enumeration
            $profileKeys = @($script:AnyApiProfiles.Keys)
            foreach ($profileNameKey in $profileKeys) {
                $memProfile = $script:AnyApiProfiles[$profileNameKey]
                if ($memProfile.IsSessionOnly) {
                    # Do not persist session-only profiles
                    Write-Verbose "Skipping save of session-only profile: $profileNameKey"
                    continue
                }

                $fileProfile = $memProfile.Clone() # Start with a clone for serialization

                # Process AuthenticationDetails for JSON serialization
                if ($fileProfile.AuthenticationDetails -is [hashtable]) {
                    $authDetailsToSave = $fileProfile.AuthenticationDetails.Clone() # Clone sub-hashtable
                    # Create a copy of the auth detail keys to avoid collection modification during enumeration
                    $authKeys = @($authDetailsToSave.Keys)
                    foreach ($authKey in $authKeys) {
                        $currentValue = $authDetailsToSave[$authKey]
                        if ($currentValue -is [System.Security.SecureString]) {
                            $refOrSecretString = ConvertFrom-SecureString $currentValue -AsPlainText
                            if ($refOrSecretString -match '^EXTERNAL:.+?:.+?:.+$') {
                                Write-Verbose "Profile '$profileNameKey', AuthKey '$authKey': Saving as EXTERNAL reference string."
                                $authDetailsToSave[$authKey] = $refOrSecretString # Save the "EXTERNAL:..." string directly
                            }
                            else {
                                # This is an actual SecureString secret (not an external reference)
                                # DO NOT save as plain text. Save a placeholder.
                                Write-Verbose "Profile '$profileNameKey', AuthKey '$authKey': Is an in-memory SecureString. Saving placeholder to JSON."
                                $authDetailsToSave[$authKey] = "<<SECRET_NEEDS_RUNTIME_PROVISIONING>>"
                            }
                        }
                        elseif ($currentValue -is [ScriptBlock] -and $authKey -eq 'AuthScriptBlock') {
                            Write-Verbose "Profile '$profileNameKey', AuthKey '$authKey': Saving AuthScriptBlock as string."
                            $authDetailsToSave[$authKey] = $currentValue.ToString()
                        }
                    }
                    $fileProfile.AuthenticationDetails = $authDetailsToSave
                }
                $profilesToSave[$profileNameKey] = $fileProfile
            }

            if ($profilesToSave.Count -gt 0) {
                ConvertTo-Json -InputObject $profilesToSave -Depth 10 | Set-Content -Path $profilePath -Force -ErrorAction Stop
                Write-Verbose ("Profiles ({0} to persist) successfully saved to JSON file {1}." -f $profilesToSave.Count, $profilePath)
            }
            else {
                Write-Verbose "No profiles marked for persistence. JSON file not modified or created if empty."
                # Optionally, delete the file if it exists and $profilesToSave is empty
                # if (Test-Path $profilePath) { Remove-Item $profilePath -Force }
            }
        }
        catch {
            Write-Error "Failed to save profiles to JSON file '$profilePath'. Error: $($_.Exception.Message)"
        }
    }
    else {
        Write-Verbose "Save operation was skipped by ShouldProcess (e.g. -WhatIf)."
    }
}

#endregion

#region Pagination Detection and Handling

function Get-ResponseItems {
    [CmdletBinding()]
    param(
        [object]$Response,
        [hashtable]$PaginationDetails
    )

    $pd = $PaginationDetails
    $items = $null
    $itemsFound = $false

    # Fast path: Check if we already know the structure
    if ($pd -and $pd.ItemsField) {
        $fieldValue = $Response.($pd.ItemsField)
        if ($fieldValue -is [array]) {
            $items = @($fieldValue)
            $itemsFound = $items.Count -gt 0
            return @{ Items = $items; ItemsFound = $itemsFound; Count = $items.Count }
        }
    }

    # Response is already an array
    if ($Response -is [array]) {
        $items = @($Response)
        $itemsFound = $items.Count -gt 0
    }
    # Common API patterns (ordered by frequency)
    elseif ($Response.data -is [array]) {
        $items = @($Response.data)
        $itemsFound = $items.Count -gt 0
    }
    elseif ($Response.value -is [array]) {
        # Microsoft Graph, OData style
        $items = @($Response.value)
        $itemsFound = $items.Count -gt 0
    }
    elseif ($Response.items -is [array]) {
        $items = @($Response.items)
        $itemsFound = $items.Count -gt 0
    }
    elseif ($Response.results -is [array]) {
        $items = @($Response.results)
        $itemsFound = $items.Count -gt 0
    }
    else {
        # Assume the whole response is the item(s)
        $items = @($Response)
        $itemsFound = $true  # Can't determine emptiness for non-array responses
    }

    return @{
        Items      = $items
        ItemsFound = $itemsFound
        Count      = $items ? $items.Count : 0
    }
}

function Get-PaginationType {
    param(
        [hashtable]$Profile,
        [object]$Response,
        [hashtable]$ResponseHeaders,
        [string]$ProfileName
    )

    # Check cache first for maximum performance
    if ($script:PaginationTypeCache.ContainsKey($ProfileName)) {
        return $script:PaginationTypeCache[$ProfileName]
    }

    # Check if profile has explicit pagination config (fastest)
    if ($Profile.PaginationDetails -and $Profile.PaginationDetails.Type) {
        $type = $Profile.PaginationDetails.Type
        $script:PaginationTypeCache[$ProfileName] = $type
        return $type
    }

    # Auto-detect based on response headers (second fastest)
    if ($ResponseHeaders -and $ResponseHeaders['Link']) {
        $type = 'LinkHeader'
        $script:PaginationTypeCache[$ProfileName] = $type
        return $type
    }

    # Auto-detect based on response content
    if ($Response -is [PSCustomObject]) {
        # Microsoft Graph style (common)
        if ($Response.'@odata.nextLink' -or $Response.nextLink) {
            $type = 'Cursor'
            $script:PaginationTypeCache[$ProfileName] = $type
            return $type
        }

        # Check for specific pagination indicators
        $props = $Response.PSObject.Properties.Name

        # Quick checks for common patterns
        if ('offset' -in $props -or 'limit' -in $props) {
            $type = 'OffsetLimit'
            $script:PaginationTypeCache[$ProfileName] = $type
            return $type
        }

        if ('page' -in $props -or 'pageNumber' -in $props -or 'currentPage' -in $props) {
            $type = 'PageBased'
            $script:PaginationTypeCache[$ProfileName] = $type
            return $type
        }

        if ('nextPageToken' -in $props) {
            $type = 'Cursor'
            $script:PaginationTypeCache[$ProfileName] = $type
            return $type
        }
    }

    $type = 'None'
    $script:PaginationTypeCache[$ProfileName] = $type
    return $type
}

function Get-NextPageParameters {
    param(
        [hashtable]$Profile,
        [object]$Response,
        [hashtable]$ResponseHeaders,
        [hashtable]$CurrentParams,
        [string]$PaginationType
    )

    $pd = $Profile.PaginationDetails
    if (-not $pd) { $pd = @{} }

    switch ($PaginationType) {
        'LinkHeader' {
            if ($ResponseHeaders['Link']) {
                # Parse Link header for 'next' relation
                if ($ResponseHeaders['Link'] -match '<([^>]+)>;\s*rel="next"') {
                    return @{ NextUrl = $Matches[1] }
                }
            }
        }

        'Cursor' {
            # Microsoft Graph style
            if ($Response.'@odata.nextLink') {
                return @{ NextUrl = $Response.'@odata.nextLink' }
            }
            if ($Response.nextLink) {
                return @{ NextUrl = $Response.nextLink }
            }

            # Token-based
            $tokenField = $pd.NextTokenField ?? 'nextPageToken'
            if ($Response.$tokenField) {
                $tokenParam = $pd.TokenParameter ?? 'pageToken'
                $newParams = $CurrentParams.Clone()
                $newParams[$tokenParam] = $Response.$tokenField
                return @{ QueryParameters = $newParams }
            }
        }

        'PageBased' {
            $pageField = $pd.PageParameter ?? 'page'
            $currentPage = if ($CurrentParams.ContainsKey($pageField)) {
                [int]$CurrentParams[$pageField]
            }
            else {
                1
            }

            # Get items using the helper function
            $responseItems = Get-ResponseItems -Response $Response -PaginationDetails $pd

            # Check if there are more pages using various strategies
            $hasMore = $true

            # Strategy 1: Explicit total pages field
            if ($pd.TotalPagesField -and $Response.($pd.TotalPagesField)) {
                $hasMore = $currentPage -lt [int]$Response.($pd.TotalPagesField)
            }
            # Strategy 2: Explicit hasMore field
            elseif ($pd.HasMoreField -and $Response.PSObject.Properties.Name -contains $pd.HasMoreField) {
                $hasMore = [bool]$Response.($pd.HasMoreField)
            }
            # Strategy 3: Check items count against page size
            else {
                $pageSize = if ($CurrentParams.ContainsKey($pd.PageSizeParameter ?? 'pageSize')) {
                    [int]$CurrentParams[$pd.PageSizeParameter ?? 'pageSize']
                }
                elseif ($pd.DefaultPageSize) {
                    [int]$pd.DefaultPageSize
                }
                else {
                    100  # Default fallback
                }

                # If we got zero items, we're definitely done
                if ($responseItems.Count -eq 0) {
                    $hasMore = $false
                }
                # If we got fewer items than page size, we might be done
                elseif ($responseItems.Count -lt $pageSize) {
                    $hasMore = $false
                }
                # If we got exactly page size, we might have more (will try next page)
                else {
                    $hasMore = $true
                }
            }

            if ($hasMore) {
                $newParams = $CurrentParams.Clone()
                $newParams[$pageField] = $currentPage + 1
                return @{ QueryParameters = $newParams }
            }
        }

        'OffsetLimit' {
            $offsetField = $pd.OffsetParameter ?? 'offset'
            $limitField = $pd.LimitParameter ?? 'limit'

            $currentOffset = if ($CurrentParams.ContainsKey($offsetField)) {
                [int]$CurrentParams[$offsetField]
            }
            else {
                0
            }

            $limit = if ($CurrentParams.ContainsKey($limitField)) {
                [int]$CurrentParams[$limitField]
            }
            else {
                100
            }

            # Check if there are more items
            $hasMore = $true
            if ($pd.TotalField -and $Response.($pd.TotalField)) {
                $hasMore = ($currentOffset + $limit) -lt [int]$Response.($pd.TotalField)
            }
            elseif ($pd.ItemsField -and $Response.($pd.ItemsField) -is [array]) {
                $items = @($Response.($pd.ItemsField))
                $hasMore = $items.Count -ge $limit
            }

            if ($hasMore) {
                $newParams = $CurrentParams.Clone()
                $newParams[$offsetField] = $currentOffset + $limit
                return @{ QueryParameters = $newParams }
            }
        }
    }

    return $null
}

function Build-AuthenticationHeaders {
    param(
        [hashtable]$Profile,
        [string]$ProfileName,
        [string]$Uri,
        [string]$Method,
        [hashtable]$ExistingHeaders = @{}
    )

    $headers = $ExistingHeaders.Clone()
    $authDetails = $Profile.AuthenticationDetails

    # Check for cached headers first (now includes custom scripts)
    $cachedHeaders = Get-CachedAuthHeaders -ProfileName $ProfileName -Profile $Profile
    if ($cachedHeaders -and $cachedHeaders.Count -gt 0) {
        foreach ($kvp in $cachedHeaders.GetEnumerator()) {
            $headers[$kvp.Name] = $kvp.Value
        }
        return $headers
    }

    # Handle custom scripts with enhanced caching support
    if ($authDetails.AuthType -eq "CustomScript") {
        if ($authDetails.AuthScriptBlock -is [ScriptBlock]) {
            Write-Verbose "Executing custom authentication script for profile '$ProfileName'"
            
            try {
                # Resolve all secrets in the profile for the custom script
                $resolvedProfile = Resolve-ProfileSecrets -Profile $Profile -ProfileName $ProfileName
                
                # Create enhanced request context with caching support
                $requestContext = @{ 
                    Uri = $Uri 
                    Headers = $headers 
                    Method = $Method 
                    ProfileName = $ProfileName
                    # Add caching helper methods
                    SetCacheHeaders = {
                        param([hashtable]$HeadersToCache, [int]$CacheDurationSeconds = 300)
                        Set-CustomScriptAuthCache -ProfileName $ProfileName -Headers $HeadersToCache -CacheDurationSeconds $CacheDurationSeconds
                    }
                    ClearCache = {
                        Clear-CustomScriptAuthCache -ProfileName $ProfileName
                    }
                    # Add helper methods for common operations
                    GetPlainTextSecret = {
                        param([string]$SecretName)
                        return $resolvedProfile.PlainTextSecrets[$SecretName]
                    }
                    GetSecureSecret = {
                        param([string]$SecretName)
                        return $resolvedProfile.SecureSecrets[$SecretName]
                    }
                }
                
                # Execute the custom script with resolved secrets
                $scriptResult = Invoke-Command -ScriptBlock $authDetails.AuthScriptBlock -ArgumentList $requestContext, $resolvedProfile -ErrorAction Stop
                
                # Check if the script returned cache metadata
                $authHeadersToCache = @{}
                foreach ($kvp in $requestContext.Headers.GetEnumerator()) {
                    if ($kvp.Name -like "Authorization*" -or $kvp.Name -like "*Auth*" -or $kvp.Name -like "*Key*" -or $kvp.Name -like "clientId") {
                        $authHeadersToCache[$kvp.Name] = $kvp.Value
                    }
                }
                
                # Auto-cache auth headers if script didn't explicitly cache them
                if ($authHeadersToCache.Count -gt 0) {
                    # Determine appropriate cache duration based on profile settings or defaults
                    $cacheDuration = 300  # Default 5 minutes
                    
                    if ($Profile.CustomSettings -and $Profile.CustomSettings.AuthCacheDurationSeconds) {
                        $cacheDuration = [int]$Profile.CustomSettings.AuthCacheDurationSeconds
                    }
                    
                    Set-CustomScriptAuthCache -ProfileName $ProfileName -Headers $authHeadersToCache -CacheDurationSeconds $cacheDuration
                    Write-Verbose "Auto-cached $($authHeadersToCache.Count) auth headers for '$ProfileName' (Duration: ${cacheDuration}s)"
                }
                
                Write-Verbose "Custom authentication script completed successfully for profile '$ProfileName'"
                return $requestContext.Headers
            }
            catch {
                $errorMessage = $_.Exception.Message
                Write-Error "Custom authentication script failed for profile '$ProfileName': $errorMessage"
                Write-Verbose "Stack trace: $($_.ScriptStackTrace)"
                return $headers  # Return original headers if script fails
            }
            finally {
                # Clear the resolved profile from memory for security
                if ($resolvedProfile) {
                    if ($resolvedProfile.PlainTextSecrets) {
                        $resolvedProfile.PlainTextSecrets.Clear()
                    }
                    if ($resolvedProfile.SecureSecrets) {
                        $resolvedProfile.SecureSecrets.Clear()
                    }
                    if ($resolvedProfile.AuthenticationDetails) {
                        foreach ($authKey in $script:SensitiveAuthDetailKeys) {
                            if ($resolvedProfile.AuthenticationDetails.ContainsKey($authKey)) {
                                $resolvedProfile.AuthenticationDetails[$authKey] = $null
                            }
                        }
                    }
                    if ($resolvedProfile.CustomSettings) {
                        $customKeys = @($resolvedProfile.CustomSettings.Keys)
                        foreach ($customKey in $customKeys) {
                            $value = $resolvedProfile.CustomSettings[$customKey]
                            if ($value -is [System.Security.SecureString] -or $value -is [string]) {
                                $resolvedProfile.CustomSettings[$customKey] = $null
                            }
                        }
                    }
                }
            }
        }
    }

    return $headers
}
function Build-ApiUri {
    param(
        [string]$BaseUrl,
        [string]$Endpoint,
        [hashtable]$QueryParameters,
        [hashtable]$PathParameters,
        [string]$ProfileName
    )

    # Handle path parameters
    $processedEndpoint = $Endpoint
    if ($PathParameters) {
        foreach ($param in $PathParameters.GetEnumerator()) {
            $processedEndpoint = $processedEndpoint.Replace("{$($param.Name)}", $param.Value)
        }
    }

    # Use cached base URL
    $baseUrlEnvKey = "ANYAPI_BASEURL_$($ProfileName.ToUpper() -replace '[^A-Z0-9]', '_')"
    $cachedBaseUrl = (Get-Item -Path "env:$baseUrlEnvKey" -ErrorAction SilentlyContinue)?.Value
    if (-not $cachedBaseUrl) {
        $cachedBaseUrl = $BaseUrl.TrimEnd('/')
        Set-Item -Path "env:$baseUrlEnvKey" -Value $cachedBaseUrl
    }

    $uri = "$cachedBaseUrl/$($processedEndpoint.TrimStart('/'))"

    # Add query parameters
    if ($QueryParameters -and $QueryParameters.Count -gt 0) {
        $queryParts = [System.Collections.Generic.List[string]]::new($QueryParameters.Count)
        foreach ($item in $QueryParameters.GetEnumerator()) {
            if ($null -ne $item.Value) {
                $queryParts.Add("$($item.Name)=$([System.Web.HttpUtility]::UrlEncode($item.Value.ToString()))")
            }
        }
        if ($queryParts.Count -gt 0) {
            $uri += "?" + ($queryParts -join "&")
        }
    }

    return $uri
}

function Invoke-ApiRequestWithRetry {
    param(
        [hashtable]$RequestParams,
        [int]$MaxRetries = 3,
        [int]$InitialBackoffMs = 1000,
        [switch]$SuppressErrors
    )

    $currentAttempt = 0
    $lastError = $null
    $responseHeaders = @{
    }

    while ($currentAttempt -lt $MaxRetries) {
        $currentAttempt++

        try {
            # Ensure we capture response headers
            $RequestParams.ResponseHeadersVariable = 'responseHeaders'
            $response = Invoke-RestMethod @RequestParams -ErrorAction Stop

            # Store headers in script scope for global access
            $script:LastResponseHeaders = $responseHeaders

            Write-Verbose "Request successful on attempt $currentAttempt"
            return @{
                Response      = $response
                Headers       = $responseHeaders
                Success       = $true
                AttemptNumber = $currentAttempt
            }
        }
        catch {
            $lastError = $_
            $statusCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }

            Write-Warning "Attempt $currentAttempt failed. Status: $statusCode. Error: $($_.Exception.Message)"

            if (($statusCode -ge 500 -or $statusCode -eq 429) -and $currentAttempt -lt $MaxRetries) {
                $backoff = $InitialBackoffMs * ([Math]::Pow(2, $currentAttempt - 1))
                $jitter = Get-Random -Minimum ($backoff * -0.2) -Maximum ($backoff * 0.2)
                $sleepDuration = [Math]::Max(100, [int]($backoff + $jitter))

                # Handle Retry-After header
                if ($_.Exception.Response.Headers -and $_.Exception.Response.Headers['Retry-After']) {
                    $retryAfter = $_.Exception.Response.Headers['Retry-After']
                    if ($retryAfter -match '^\d+$') {
                        $sleepDuration = [int]$retryAfter * 1000
                        Write-Verbose "Using Retry-After header value: ${retryAfter}s"
                    }
                }

                Write-Verbose "Retrying in ${sleepDuration}ms (attempt $($currentAttempt + 1)/$MaxRetries)"
                Start-Sleep -Milliseconds $sleepDuration
            }
            else {
                break
            }
        }
    }

    # All retries exhausted or non-retriable error
    Write-Warning "Request failed after $currentAttempt attempt(s). Final error: $($lastError.Exception.Message)"

    if ($lastError -and -not $SuppressErrors) {
        Write-Error -ErrorRecord $lastError
    }

    return @{
        Response      = $null
        Headers       = @{
        }
        Success       = $false
        AttemptNumber = $currentAttempt
        LastError     = $lastError
    }
}

# Internal function for actual API calls
function Invoke-AnyApiEndpointInternal {
    param(
        [Parameter(Mandatory = $false)]
        [hashtable]$Profile,
        [Parameter(Mandatory = $false)]
        [string]$ProfileName,
        [Parameter(Mandatory = $false)]
        [string]$Endpoint,
        [Parameter(Mandatory = $false)]
        [string]$Method,
        [Parameter(Mandatory = $false)]
        [hashtable]$QueryParameters,
        [Parameter(Mandatory = $false)]
        [object]$Body,
        [Parameter(Mandatory = $false)]
        [hashtable]$Headers,
        [Parameter(Mandatory = $false)]
        [string]$ContentType,
        [Parameter(Mandatory = $false)]
        [int]$MaxRetries,
        [Parameter(Mandatory = $false)]
        [int]$InitialBackoffMs,
        [Parameter(Mandatory = $false)]
        [switch]$SuppressErrors,
        [Parameter(Mandatory = $false)]
        [ApiRequestBuilder]$RequestBuilder # New parameter for builder pattern
    )

    # Use builder if provided, otherwise use individual parameters (backward compatibility)
    if ($RequestBuilder) {
        if (-not $RequestBuilder.IsValid()) {
            Write-Error "Invalid ApiRequestBuilder: ProfileName and Endpoint are required."
            return $null
        }

        $builderParams = $RequestBuilder.Build()
        $ProfileName = $builderParams.ProfileName
        $Endpoint = $builderParams.Endpoint
        $Method = $builderParams.Method
        $QueryParameters = $builderParams.QueryParameters
        $Body = $builderParams.Body
        $Headers = $builderParams.Headers
        $ContentType = $builderParams.ContentType
        $MaxRetries = $builderParams.MaxRetries
        $InitialBackoffMs = $builderParams.InitialBackoffMs
        $SuppressErrors = $builderParams.SuppressErrors
    }

    # Only load profile from global if not provided (for backward compatibility)
    if (-not $Profile) {
        _EnsureProfilesLoaded
        if (-not $script:AnyApiProfiles.ContainsKey($ProfileName)) {
            Write-Error "API Profile '$ProfileName' not found."
            return $null
        }
        $Profile = $script:AnyApiProfiles[$ProfileName]
    }

    # Build URI using Build-ApiUri
    $uri = Build-ApiUri -BaseUrl $Profile.BaseUrl -Endpoint $Endpoint -QueryParameters $QueryParameters -PathParameters $null -ProfileName $ProfileName

    Write-Verbose "URI: $uri"

    # Build headers using unified authentication header builder
    $requestHeaders = @{
    }
    # Copy default headers efficiently
    if ($Profile.DefaultHeaders -and $Profile.DefaultHeaders.Count -gt 0) {
        foreach ($kvp in $Profile.DefaultHeaders.GetEnumerator()) {
            $requestHeaders[$kvp.Name] = $kvp.Value
        }
    }
    # Always use Build-AuthenticationHeaders for all authentication logic
    $requestHeaders = Build-AuthenticationHeaders -Profile $Profile -ProfileName $ProfileName -Uri $uri -Method $Method -ExistingHeaders $requestHeaders

    # Apply user headers last (override defaults and auth)
    if ($Headers -and $Headers.Count -gt 0) {
        foreach ($kvp in $Headers.GetEnumerator()) {
            $requestHeaders[$kvp.Name] = $kvp.Value
        }
    }

    # Prepare request parameters for unified retry function
    $invokeParams = @{
        Uri     = $uri
        Method  = $Method
        Headers = $requestHeaders
    }

    # Handle body
    if ($Body) {
        if ($ContentType) {
            $invokeParams.ContentType = $ContentType
        }
        elseif (($Body -is [hashtable] -or $Body -is [PSCustomObject]) -and
                  ($null -eq $ContentType -or $ContentType -match "application/json")) {
            $invokeParams.Body = ($Body | ConvertTo-Json -Depth 20 -Compress)
            $invokeParams.ContentType = "application/json; charset=utf-8"
        }
        else {
            $invokeParams.Body = $Body
        }
    }

    # Use unified retry function for standardized response processing
    $result = Invoke-ApiRequestWithRetry -RequestParams $invokeParams -MaxRetries $MaxRetries -InitialBackoffMs $InitialBackoffMs -SuppressErrors:$SuppressErrors

    if ($result.Success) {
        Write-Verbose "API request completed successfully after $($result.AttemptNumber) attempt(s)"
        return $result.Response
    }
    else {
        Write-Verbose "API request failed after $($result.AttemptNumber) attempt(s)"
        return $null
    }
}

function Invoke-AnyApiEndpointWithPagination {
    param(
        [hashtable]$BaseParams,
        [hashtable]$Profile,
        [string]$ProfileName,
        [switch]$GetAllPages,
        [scriptblock]$StreamCallback,
        [int]$MaxPages = 1000  # Safety limit
    )

    # Pre-allocate collections for better performance
    $allResults = [System.Collections.Generic.List[object]]::new(1000)
    $pageCount = 0
    $currentParams = $BaseParams.Clone()
    $hasMorePages = $true

    # Cache pagination details and type for performance
    $pd = $Profile.PaginationDetails
    $paginationType = $null

    while ($hasMorePages -and $pageCount -lt $MaxPages) {
        $pageCount++

        # Only show verbose for first few pages to reduce noise
        if ($pageCount -le 3 -or $pageCount % 10 -eq 0) {
            Write-Verbose "Fetching page $pageCount"
        }

        # Build request parameters for unified processing
        $uri = Build-ApiUri -BaseUrl $Profile.BaseUrl -Endpoint $currentParams.Endpoint -QueryParameters $currentParams.QueryParameters -PathParameters $null -ProfileName $ProfileName

        # Build headers
        $requestHeaders = @{
        }
        if ($Profile.DefaultHeaders -and $Profile.DefaultHeaders.Count -gt 0) {
            foreach ($kvp in $Profile.DefaultHeaders.GetEnumerator()) {
                $requestHeaders[$kvp.Name] = $kvp.Value
            }
        }
        $requestHeaders = Build-AuthenticationHeaders -Profile $Profile -ProfileName $ProfileName -Uri $uri -Method ($currentParams.Method ?? 'GET') -ExistingHeaders $requestHeaders

        if ($currentParams.Headers -and $currentParams.Headers.Count -gt 0) {
            foreach ($kvp in $currentParams.Headers.GetEnumerator()) {
                $requestHeaders[$kvp.Name] = $kvp.Value
            }
        }

        # Prepare unified request parameters
        $invokeParams = @{
            Uri     = $uri
            Method  = $currentParams.Method ?? 'GET'
            Headers = $requestHeaders
        }

        # Handle body if present
        if ($currentParams.Body) {
            if ($currentParams.ContentType) {
                $invokeParams.ContentType = $currentParams.ContentType
            }
            elseif (($currentParams.Body -is [hashtable] -or $currentParams.Body -is [PSCustomObject]) -and
                      ($null -eq $currentParams.ContentType -or $currentParams.ContentType -match "application/json")) {
                $invokeParams.Body = ($currentParams.Body | ConvertTo-Json -Depth 20 -Compress)
                $invokeParams.ContentType = "application/json; charset=utf-8"
            }
            else {
                $invokeParams.Body = $currentParams.Body
            }
        }

        # Use unified retry function for consistent response processing
        $result = Invoke-ApiRequestWithRetry -RequestParams $invokeParams -MaxRetries ($currentParams.MaxRetries ?? 3) -InitialBackoffMs ($currentParams.InitialBackoffMs ?? 1000) -SuppressErrors:($currentParams.SuppressErrors ?? $false)

        if (-not $result.Success) {
            Write-Warning "Failed to fetch page $pageCount"
            break
        }

        $response = $result.Response
        $responseHeaders = $result.Headers

        # Determine pagination type once and cache it
        if ($null -eq $paginationType) {
            $paginationType = Get-PaginationType -Profile $Profile -Response $response -ResponseHeaders $responseHeaders -ProfileName $ProfileName
            Write-Verbose "Detected pagination type: $paginationType"
        }

        # Extract items from response using helper function
        $responseItems = Get-ResponseItems -Response $response -PaginationDetails $pd
        $items = $responseItems.Items

        # If we got zero items on a page-based pagination, we're done
        if ($paginationType -eq 'PageBased' -and -not $responseItems.ItemsFound) {
            Write-Verbose "Received empty page, stopping pagination"
            break
        }

        if ($StreamCallback) {
            # Process items with callback (memory efficient for large datasets)
            foreach ($item in $items) {
                & $StreamCallback $item
            }
        }
        else {
            # Collect in memory (batch add for performance)
            if ($items.Count -gt 0) {
                $allResults.AddRange($items)
            }
        }

        # Check for no pagination
        if ($paginationType -eq 'None') {
            Write-Verbose "No pagination detected"
            break
        }

        # Get next page parameters
        $nextPageInfo = Get-NextPageParameters -Profile $Profile -Response $response `
            -ResponseHeaders $responseHeaders -CurrentParams $currentParams.QueryParameters `
            -PaginationType $paginationType

        if ($null -eq $nextPageInfo) {
            Write-Verbose "No more pages available"
            $hasMorePages = $false
        }
        elseif ($nextPageInfo.NextUrl) {
            # Full URL provided (LinkHeader, Cursor with URL)
            $uri = [System.Uri]$nextPageInfo.NextUrl
            $currentParams.Endpoint = $uri.PathAndQuery
            $currentParams.Remove('QueryParameters') # URL includes query
        }
        elseif ($nextPageInfo.QueryParameters) {
            # Update query parameters
            $currentParams.QueryParameters = $nextPageInfo.QueryParameters
        }
        else {
            $hasMorePages = $false
        }
    }

    if ($pageCount -ge $MaxPages) {
        Write-Warning "Reached maximum page limit of $MaxPages"
    }

    Write-Verbose "Pagination complete. Total pages: $pageCount, Total items: $($allResults.Count)"

    if (-not $StreamCallback) {
        return $allResults.ToArray()
    }
}

#region Public Functions

function Initialize-AnyApiProfile {
    [CmdletBinding(SupportsShouldProcess = $true)]
    param(
        [Parameter(Mandatory = $false)] [string]$ProfileName,
        [Parameter(Mandatory = $false)] [string]$BaseUrl,
        [Parameter(Mandatory = $false)] [hashtable]$AuthenticationDetails,
        [Parameter(Mandatory = $false)] [hashtable]$PaginationDetails,
        [Parameter(Mandatory = $false)] [hashtable]$ErrorHandlingDetails,
        [Parameter(Mandatory = $false)] [hashtable]$DefaultHeaders,
        [Parameter(Mandatory = $false)] [hashtable]$CustomSettings,
        [Parameter(Mandatory = $false)] [switch]$NoLocalFilePersistence,
        [Parameter(Mandatory = $false)] [switch]$Force,
        [Parameter(Mandatory = $false)] [hashtable]$SecureValues = @{}, # KeyName = SecureString or plain text for this profile
        [Parameter(Mandatory = $false)] [ProfileInitializationBuilder]$ProfileBuilder # New parameter for builder pattern
    )

    # Use builder if provided, otherwise use individual parameters (backward compatibility)
    if ($ProfileBuilder) {
        if (-not $ProfileBuilder.IsValid()) {
            Write-Error "Invalid ProfileInitializationBuilder: ProfileName, BaseUrl, and AuthenticationDetails with AuthType are required."
            return
        }
        
        $builderParams = $ProfileBuilder.Build()
        $ProfileName = $builderParams.ProfileName
        $BaseUrl = $builderParams.BaseUrl
        $AuthenticationDetails = $builderParams.AuthenticationDetails
        $PaginationDetails = $builderParams.PaginationDetails
        $ErrorHandlingDetails = $builderParams.ErrorHandlingDetails
        $DefaultHeaders = $builderParams.DefaultHeaders
        $CustomSettings = $builderParams.CustomSettings
        $NoLocalFilePersistence = $builderParams.NoLocalFilePersistence
        $Force = $builderParams.Force
        $SecureValues = $builderParams.SecureValues
    }

    # Validate required parameters (now that we have them from builder or direct params)
    if ([string]::IsNullOrWhiteSpace($ProfileName)) {
        Write-Error "ProfileName is required" -Category InvalidArgument
        return
    }
    
    if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
        Write-Error "BaseUrl is required" -Category InvalidArgument
        return
    }
    
    if (-not $AuthenticationDetails -or -not $AuthenticationDetails.ContainsKey("AuthType")) {
        Write-Error "AuthenticationDetails with AuthType are required" -Category InvalidArgument
        return
    }

    _EnsureProfilesLoaded -SecureValues @{}

    $existingProfile = $null
    if ($script:AnyApiProfiles.ContainsKey($ProfileName)) {
        $existingProfile = $script:AnyApiProfiles[$ProfileName]
    }

    if ($existingProfile -and -not $Force) {
        Write-Error "Profile '$ProfileName' already exists. Use -Force to overwrite or Remove-AnyApiProfile first." -Category ResourceExists
        return
    }

    # Clone the input auth details to process them
    $processedAuthDetails = $AuthenticationDetails.Clone()

    # Convert plain text sensitive fields to SecureString, then attempt to use Set-SecureValue
    foreach ($keyName in $script:SensitiveAuthDetailKeys) {
        if ($processedAuthDetails.ContainsKey($keyName)) {
            $value = $processedAuthDetails[$keyName]
            
            # Check if we have a provided secure value that should override
            if ($SecureValues.ContainsKey($keyName)) {
                $providedValue = $SecureValues[$keyName]
                if ($providedValue -is [string]) {
                    $providedValue = ConvertTo-SecureString $providedValue -AsPlainText -Force
                }
                if ($providedValue -is [System.Security.SecureString]) {
                    Write-Verbose "Profile '$ProfileName', AuthKey '$keyName': Using provided secure value override."
                    $value = $providedValue
                }
                else {
                    Write-Warning "Profile '$ProfileName', AuthKey '$keyName': Provided secure value is not a string or SecureString."
                }
            }
            # Handle cases where the value needs runtime provisioning but SecureValues was provided
            elseif (($value -is [string] -and $value -eq "<<SECRET_NEEDS_RUNTIME_PROVISIONING>>") -or $null -eq $value) {
                if ($SecureValues.ContainsKey($keyName)) {
                    $providedValue = $SecureValues[$keyName]
                    if ($providedValue -is [string]) {
                        $providedValue = ConvertTo-SecureString $providedValue -AsPlainText -Force
                    }
                    if ($providedValue -is [System.Security.SecureString]) {
                        Write-Verbose "Profile '$ProfileName', AuthKey '$keyName': Provisioning missing secret from SecureValues parameter."
                        $value = $providedValue
                    }
                }
            }
            
            if ($value -is [string] -and $value -ne "<<SECRET_NEEDS_RUNTIME_PROVISIONING>>") {
                # If it's a plain text string, convert to SecureString first
                Write-Verbose "Profile '$ProfileName', AuthKey '$keyName': Converting plain text input to SecureString."
                $value = ConvertTo-SecureString $value -AsPlainText -Force
            }
            
            if ($value -is [System.Security.SecureString]) {
                # Now, $value is definitely a SecureString. Attempt to store it using the provider.
                # Set-SecureValue will return an "EXTERNAL:..." SecureString if stored in OS store,
                # or the original SecureString if meant to be in-memory (Windows/DPAPI_InMemory case).
                Write-Verbose "Profile '$ProfileName', AuthKey '$keyName': Calling Set-SecureValue."
                $processedAuthDetails[$keyName] = Set-SecureValue -Name $keyName -Value $value -ProfileName $ProfileName
            }
            # If it was already some other type (e.g. $null from a scrubbed import), leave it.
        }
        # Handle case where the key doesn't exist but SecureValues provides it
        elseif ($SecureValues.ContainsKey($keyName)) {
            $providedValue = $SecureValues[$keyName]
            if ($providedValue -is [string]) {
                $providedValue = ConvertTo-SecureString $providedValue -AsPlainText -Force
            }
            if ($providedValue -is [System.Security.SecureString]) {
                Write-Verbose "Profile '$ProfileName', AuthKey '$keyName': Adding new secret from SecureValues parameter."
                $processedAuthDetails[$keyName] = Set-SecureValue -Name $keyName -Value $providedValue -ProfileName $ProfileName
            }
        }
    }
    
    # Re-create AuthScriptBlock if it was a string (e.g. from import or if user provided string)
    if ($processedAuthDetails.ContainsKey('AuthScriptBlock') -and $processedAuthDetails.AuthScriptBlock -is [string]) {
        try {
            $processedAuthDetails.AuthScriptBlock = [ScriptBlock]::Create($processedAuthDetails.AuthScriptBlock)
        }
        catch {
            Write-Warning "Could not convert AuthScriptBlock string to ScriptBlock for profile '$ProfileName': $($_.Exception.Message)"
        }
    }

    # Set defaults for optional parameters
    $finalPaginationDetails = $PaginationDetails ?? @{}
    $finalErrorHandlingDetails = $ErrorHandlingDetails ?? @{}
    $finalDefaultHeaders = $DefaultHeaders ?? @{}
    $finalCustomSettings = $CustomSettings ?? @{}
    $finalIsSessionOnly = $NoLocalFilePersistence.IsPresent
    
    Write-Verbose "Finalizing API profile: $ProfileName. IsSessionOnly: $finalIsSessionOnly"

    $profile = @{
        ProfileName           = $ProfileName
        BaseUrl               = $BaseUrl.TrimEnd('/')
        AuthenticationDetails = $processedAuthDetails # This now contains SecureStrings (actual or EXTERNAL references)
        PaginationDetails     = $finalPaginationDetails
        ErrorHandlingDetails  = $finalErrorHandlingDetails
        DefaultHeaders        = $finalDefaultHeaders
        CustomSettings        = $finalCustomSettings
        LastUpdated           = Get-Date
        IsSessionOnly         = $finalIsSessionOnly
    }

    $actionDescription = if ($existingProfile) { "Update in-memory store" } else { "Initialize in-memory store" }
    if (-not $finalIsSessionOnly) { $actionDescription += " and persist profile structure to local JSON file (secrets managed by OS store or in-memory)" } else { $actionDescription += " (session only)" }

    if ($PSCmdlet.ShouldProcess("API Profile '$ProfileName'", $actionDescription)) {
        $script:AnyApiProfiles[$ProfileName] = $profile
        Write-Verbose "Profile '$ProfileName' processed successfully in memory."

        if (-not $finalIsSessionOnly) {
            Save-AnyApiProfilesToLocalFile
        }
        else {
            Write-Verbose "Profile '$ProfileName' changes will not be saved to local JSON file due to IsSessionOnly status."
        }
        Write-Output ($profile.Clone()) 
    }
}

function Invoke-AnyApiEndpoint {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ProfileName,

        [Parameter(Mandatory)]
        [string]$Endpoint,

        [Parameter()]
        [ValidateSet("GET", "POST", "PUT", "PATCH", "DELETE")]
        [string]$Method = "GET",

        [Parameter()]
        [hashtable]$QueryParameters,

        [Parameter()]
        [hashtable]$PathParameters,

        [Parameter()]
        [object]$Body,

        [Parameter()]
        [hashtable]$Headers,

        [Parameter()]
        [string]$ContentType,

        [Parameter()]
        [string]$OutputFile,

        [Parameter()]
        [switch]$GetAllPages,

        [Parameter()]
        [scriptblock]$Stream,

        [Parameter()]
        [int]$PageSize,

        [Parameter()]
        [int]$MaxPages = 1000,

        [Parameter()]
        [int]$MaxRetries = 3,

        [Parameter()]
        [int]$InitialBackoffMs = 1000,

        [Parameter()]
        [switch]$SuppressErrors,

        [Parameter()]
        [switch]$PassThru,

        [Parameter()]
        [hashtable]$SecureValues = @{}, # KeyName = SecureString or plain text for this profile

        [Parameter()]
        [ApiRequestBuilder]$RequestBuilder # New parameter for builder pattern
    )

    # Use builder if provided, otherwise use individual parameters (backward compatibility)
    if ($RequestBuilder) {
        if (-not $RequestBuilder.IsValid()) {
            Write-Error "Invalid ApiRequestBuilder: ProfileName and Endpoint are required."
            return
        }

        $builderParams = $RequestBuilder.Build()
        $ProfileName = $builderParams.ProfileName
        $Endpoint = $builderParams.Endpoint
        $Method = $builderParams.Method
        $QueryParameters = $builderParams.QueryParameters
        $PathParameters = $builderParams.PathParameters
        $Body = $builderParams.Body
        $Headers = $builderParams.Headers
        $ContentType = $builderParams.ContentType
        $GetAllPages = $builderParams.GetAllPages
        $Stream = $builderParams.Stream
        $PageSize = $builderParams.PageSize
        $MaxPages = $builderParams.MaxPages
        $MaxRetries = $builderParams.MaxRetries
        $InitialBackoffMs = $builderParams.InitialBackoffMs
        $SuppressErrors = $builderParams.SuppressErrors
        $SecureValues = $builderParams.SecureValues
    }

    # Handle path parameters efficiently
    if ($PathParameters -and $PathParameters.Count -gt 0) {
        foreach ($param in $PathParameters.GetEnumerator()) {
            $placeholder = "{$($param.Name)}"
            if ($Endpoint.Contains($placeholder)) {
                $Endpoint = $Endpoint.Replace($placeholder, $param.Value)
            }
        }
    }

    # Check if pagination is requested
    if ($GetAllPages -or $Stream) {
        $profile = Resolve-AnyApiProfile -ProfileName $ProfileName -SecureValues $SecureValues
        if (-not $profile) { return }

        # Add page size to query parameters if specified
        if ($PageSize -and $profile.PaginationDetails) {
            if (-not $QueryParameters) { $QueryParameters = @{} }
            $pageSizeParam = $profile.PaginationDetails.PageSizeParameter ?? 'pageSize'
            $QueryParameters[$pageSizeParam] = $PageSize
        }

        $baseParams = @{
            Endpoint         = $Endpoint
            Method           = $Method
            QueryParameters  = $QueryParameters
            Body             = $Body
            Headers          = $Headers
            ContentType      = $ContentType
            MaxRetries       = $MaxRetries
            InitialBackoffMs = $InitialBackoffMs
            SuppressErrors   = $SuppressErrors
        }

        return Invoke-AnyApiEndpointWithPagination -BaseParams $baseParams -Profile $profile `
            -ProfileName $ProfileName -GetAllPages:$GetAllPages -StreamCallback:$Stream -MaxPages $MaxPages
    }

    # Single request
    $profile = Resolve-AnyApiProfile -ProfileName $ProfileName -SecureValues $SecureValues
    if (-not $profile) { return }

    return Invoke-AnyApiEndpointInternal -Profile $profile -ProfileName $ProfileName -Endpoint $Endpoint `
        -Method $Method -QueryParameters $QueryParameters -Body $Body -Headers $Headers `
        -ContentType $ContentType -MaxRetries $MaxRetries `
        -InitialBackoffMs $InitialBackoffMs -SuppressErrors:$SuppressErrors
}

# Helper functions for creating builders (convenience functions)
function New-ApiRequestBuilder {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ProfileName,
        [Parameter(Mandatory)]
        [string]$Endpoint
    )

    return [ApiRequestBuilder]::new($ProfileName, $Endpoint)
}

function New-ProfileInitializationBuilder {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ProfileName,
        [Parameter(Mandatory)]
        [string]$BaseUrl,
        [Parameter(Mandatory)]
        [hashtable]$AuthenticationDetails
    )

    return [ProfileInitializationBuilder]::new($ProfileName, $BaseUrl, $AuthenticationDetails)
}

function Debug-AnyApiSecrets {
    [CmdletBinding()]
    param(
        [Parameter()]
        [string]$ProfileName,
        [Parameter()]
        [switch]$ShowValues
    )
    
    Write-Host "🔍 AnyAPI Secret Storage Debug Report" -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Cyan
    
    # Get secret storage provider
    $provider = Get-SecretStorageProvider
    Write-Host "📦 Secret Storage Provider: $provider" -ForegroundColor Yellow
    
    # If specific profile requested, filter secrets
    $searchPattern = if ($ProfileName) { "AnyAPI.$ProfileName.*" } else { "AnyAPI.*" }
    
    switch ($provider) {
        'SecretManagement' {
            try {
                $vaultName = 'AnyAPI-SecretStore'
                Write-Host "🏦 Using vault: $vaultName" -ForegroundColor Green
                
                # Get all AnyAPI secrets
                $secrets = Get-SecretInfo -Vault $vaultName | Where-Object Name -like $searchPattern
                
                if ($secrets) {
                    Write-Host "🔑 Found $($secrets.Count) secret(s):" -ForegroundColor Green
                    foreach ($secret in $secrets) {
                        $parts = $secret.Name -split '\.'
                        $profile = $parts[1]
                        $keyName = $parts[2]
                        
                        Write-Host "  📋 Profile: $profile" -ForegroundColor White
                        Write-Host "     🔑 Key: $keyName" -ForegroundColor White
                        Write-Host "     📅 Modified: $($secret.Metadata.LastModified)" -ForegroundColor Gray
                        
                        if ($ShowValues) {
                            try {
                                $value = Get-Secret -Name $secret.Name -Vault $vaultName -AsPlainText
                                $maskedValue = if ($value.Length -gt 20) { 
                                    "$($value.Substring(0, 10))...$($value.Substring($value.Length - 10))" 
                                } else { 
                                    "•" * $value.Length 
                                }
                                Write-Host "     💎 Value: $maskedValue" -ForegroundColor Magenta
                            }
                            catch {
                                Write-Host "     ❌ Failed to retrieve value: $($_.Exception.Message)" -ForegroundColor Red
                            }
                        }
                        Write-Host ""
                    }
                } else {
                    Write-Host "❌ No secrets found matching pattern: $searchPattern" -ForegroundColor Red
                }
            }
            catch {
                Write-Host "❌ Error accessing SecretManagement: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        'Keychain' {
            Write-Host "🍎 macOS Keychain - checking for AnyAPI entries..." -ForegroundColor Green
            if ($ProfileName) {
                $serviceName = "AnyAPI.$ProfileName"
                $result = & security find-generic-password -s $serviceName 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ Found keychain entries for profile: $ProfileName" -ForegroundColor Green
                } else {
                    Write-Host "❌ No keychain entries found for profile: $ProfileName" -ForegroundColor Red
                }
            } else {
                Write-Host "ℹ️ Specify -ProfileName to check specific profile keychain entries" -ForegroundColor Gray
            }
        }
        'SecretService' {
            Write-Host "🐧 Linux Secret Service - checking for AnyAPI entries..." -ForegroundColor Green
            if ($ProfileName) {
                try {
                    $result = & secret-tool search profile "$ProfileName" 2>$null
                    if ($LASTEXITCODE -eq 0 -and $result) {
                        Write-Host "✅ Found secret service entries for profile: $ProfileName" -ForegroundColor Green
                    } else {
                        Write-Host "❌ No secret service entries found for profile: $ProfileName" -ForegroundColor Red
                    }
                }
                catch {
                    Write-Host "❌ Error checking secret service: $($_.Exception.Message)" -ForegroundColor Red
                }
            } else {
                Write-Host "ℹ️ Specify -ProfileName to check specific profile secret service entries" -ForegroundColor Gray
            }
        }
        default {
            Write-Host "⚠️ In-memory only storage - secrets not persisted" -ForegroundColor Yellow
        }
    }
    
    # Show profiles and their auth configuration
    Write-Host "`n📋 Profile Authentication Configuration:" -ForegroundColor Cyan
    $profiles = Get-AnyApiProfile
    
    if ($ProfileName) {
        $profiles = $profiles | Where-Object { $_.Keys -contains $ProfileName }
        if ($profiles) {
            $profiles = @{ $ProfileName = $profiles[$ProfileName] }
        }
    }
    
    foreach ($profileEntry in $profiles.GetEnumerator()) {
        $profile = $profileEntry.Value
        Write-Host "`n  🔧 Profile: $($profileEntry.Key)" -ForegroundColor White
        Write-Host "     Auth Type: $($profile.AuthenticationDetails.AuthType)" -ForegroundColor Gray
        
        switch ($profile.AuthenticationDetails.AuthType) {
            'ApiKey' {
                Write-Host "     API Key Name: $($profile.AuthenticationDetails.ApiKeyName)" -ForegroundColor Gray
                Write-Host "     Token Prefix: $($profile.AuthenticationDetails.TokenPrefix)" -ForegroundColor Gray
                Write-Host "     API Key Status: $(if ($profile.AuthenticationDetails.ApiKeyValue) { 'Configured' } else { 'Missing' })" -ForegroundColor Gray
            }
            'Bearer' {
                Write-Host "     Token Prefix: $($profile.AuthenticationDetails.TokenPrefix)" -ForegroundColor Gray
                Write-Host "     Token Status: $(if ($profile.AuthenticationDetails.TokenValue) { 'Configured' } else { 'Missing' })" -ForegroundColor Gray
            }
            'Basic' {
                Write-Host "     Username: $($profile.AuthenticationDetails.Username)" -ForegroundColor Gray
                Write-Host "     Password Status: $(if ($profile.AuthenticationDetails.Password) { 'Configured' } else { 'Missing' })" -ForegroundColor Gray
            }
            'Custom' {
                Write-Host "     Script Status: $(if ($profile.AuthenticationDetails.AuthScriptBlock) { 'Configured' } else { 'Missing' })" -ForegroundColor Gray
                # Show custom credentials
                $customCreds = $profile.AuthenticationDetails.Keys | Where-Object { $_ -notin @('AuthType', 'AuthScriptBlock') }
                if ($customCreds) {
                    Write-Host "     Custom Credentials: $($customCreds -join ', ')" -ForegroundColor Gray
                }
            }
        }
    }
    
    Write-Host "`n💡 Recommendations:" -ForegroundColor Cyan
    Write-Host "   • Use Debug-AnyApiSecrets -ProfileName 'YourProfile' -ShowValues to see masked values" -ForegroundColor White
    Write-Host "   • Check template field mappings match backend expectations" -ForegroundColor White
    Write-Host "   • Ensure no duplicate credential keys in templates" -ForegroundColor White
    
    if ($provider -ne 'SecretManagement') {
        Write-Host "   • Consider running Initialize-SecretStore for better secret management" -ForegroundColor Yellow
    }
}

# Add pipeline support functions for ProfileInitializationBuilder
function WithPagination {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)]
        [ProfileInitializationBuilder]$Builder,
        [Parameter(Mandatory)]
        [hashtable]$PaginationDetails
    )
    
    return $Builder.WithPagination($PaginationDetails)
}

function WithErrorHandling {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)]
        [ProfileInitializationBuilder]$Builder,
        [Parameter(Mandatory)]
        [hashtable]$ErrorHandlingDetails
    )
    
    return $Builder.WithErrorHandling($ErrorHandlingDetails)
}

function WithDefaultHeaders {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)]
        [ProfileInitializationBuilder]$Builder,
        [Parameter(Mandatory)]
        [hashtable]$DefaultHeaders
    )
    
    return $Builder.WithDefaultHeaders($DefaultHeaders)
}

function WithCustomSettings {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)]
        [ProfileInitializationBuilder]$Builder,
        [Parameter(Mandatory)]
        [hashtable]$CustomSettings
    )
    
    return $Builder.WithCustomSettings($CustomSettings)
}

function WithSecureValues {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)]
        [ProfileInitializationBuilder]$Builder,
        [Parameter(Mandatory)]
        [hashtable]$SecureValues
    )
    
    return $Builder.WithSecureValues($SecureValues)
}

function SessionOnly {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)]
        [ProfileInitializationBuilder]$Builder,
        [Parameter()]
        [bool]$NoLocalFilePersistence = $true
    )
    
    return $Builder.SessionOnly($NoLocalFilePersistence)
}

function ForceOverwrite {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)]
        [ProfileInitializationBuilder]$Builder,
        [Parameter()]
        [bool]$Force = $true
    )
    
    return $Builder.ForceOverwrite($Force)
}

# Add similar pipeline support functions for ApiRequestBuilder
function WithMethod {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)]
        [ApiRequestBuilder]$Builder,
        [Parameter(Mandatory)]
        [string]$Method
    )
    
    return $Builder.WithMethod($Method)
}

function WithQueryParameters {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)]
        [ApiRequestBuilder]$Builder,
        [Parameter(Mandatory)]
        [hashtable]$QueryParameters
    )
    
    return $Builder.WithQueryParameters($QueryParameters)
}

function WithPathParameters {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)]
        [ApiRequestBuilder]$Builder,
        [Parameter(Mandatory)]
        [hashtable]$PathParameters
    )
    
    return $Builder.WithPathParameters($PathParameters)
}

function WithBody {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)]
        [ApiRequestBuilder]$Builder,
        [Parameter(Mandatory)]
        [object]$Body
    )
    
    return $Builder.WithBody($Body)
}

function WithHeaders {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)]
        [ApiRequestBuilder]$Builder,
        [Parameter(Mandatory)]
        [hashtable]$Headers
    )
    
    return $Builder.WithHeaders($Headers)
}

function WithContentType {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)]
        [ApiRequestBuilder]$Builder,
        [Parameter(Mandatory)]
        [string]$ContentType
    )
    
    return $Builder.WithContentType($ContentType)
}

function WithRetryPolicy {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)]
        [ApiRequestBuilder]$Builder,
        [Parameter(Mandatory)]
        [int]$MaxRetries,
        [Parameter(Mandatory)]
        [int]$InitialBackoffMs
    )
    
    return $Builder.WithRetryPolicy($MaxRetries, $InitialBackoffMs)
}

function WithStream {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)]
        [ApiRequestBuilder]$Builder,
        [Parameter(Mandatory)]
        [scriptblock]$Stream
    )
    
    return $Builder.WithStream($Stream)
}

function SuppressErrors {
    [CmdletBinding()]
    param(
        [Parameter(ValueFromPipeline)]
        [ApiRequestBuilder]$Builder,
        [Parameter()]
        [bool]$SuppressErrors = $true
    )
    
    return $Builder.SuppressErrors($SuppressErrors)
}

function Get-AnyApiProfile {
    [CmdletBinding()
    ]
    param(
        [Parameter()]
        [string[]]$ProfileName
    )

    _EnsureProfilesLoaded

    if ($ProfileName) {
        $results = @()
        foreach ($name in $ProfileName) {
            if ($script:AnyApiProfiles.ContainsKey($name)) {
                $profile = $script:AnyApiProfiles[$name].Clone()
                # Scrub sensitive authentication details for display
                if ($profile.AuthenticationDetails) {
                    $scrubbedAuth = $profile.AuthenticationDetails.Clone()
                    foreach ($key in $script:SensitiveAuthDetailKeys) {
                        if ($scrubbedAuth.ContainsKey($key)) {
                            $scrubbedAuth[$key] = "***HIDDEN***"
                        }
                    }
                    $profile.AuthenticationDetails = $scrubbedAuth
                }
                $results += $profile
            }
            else {
                Write-Warning "Profile '$name' not found."
            }
        }
        return $results
    }
    else {
        # Return all profiles with scrubbed sensitive data
        $allProfiles = @{
        }
        foreach ($kvp in $script:AnyApiProfiles.GetEnumerator()) {
            $profile = $kvp.Value.Clone()
            if ($profile.AuthenticationDetails) {
                $scrubbedAuth = $profile.AuthenticationDetails.Clone()
                foreach ($key in $script:SensitiveAuthDetailKeys) {
                    if ($scrubbedAuth.ContainsKey($key)) {
                        $scrubbedAuth[$key] = "***HIDDEN***"
                    }
                }
                $profile.AuthenticationDetails = $scrubbedAuth
            }
            $allProfiles[$kvp.Key] = $profile
        }
        return $allProfiles
    }
}

function Remove-AnyApiProfile {
    [CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
    param(
        [Parameter(Mandatory, ValueFromPipeline)]
        [string[]]$ProfileName
    )

    process {
        _EnsureProfilesLoaded

        foreach ($name in $ProfileName) {
            if (-not $script:AnyApiProfiles.ContainsKey($name)) {
                Write-Warning "Profile '$name' not found."
                continue
            }

            if ($PSCmdlet.ShouldProcess("API Profile '$name'", "Remove from memory and disk storage")) {
                # Clear any cached auth headers for this profile
                Clear-AuthHeaderCache -ProfileName $name
                
                # Remove from memory
                $script:AnyApiProfiles.Remove($name)
                Write-Verbose "Profile '$name' removed from memory."

                # Save updated profiles to disk (excluding the removed one)
                Save-AnyApiProfilesToLocalFile

                # Try to clean up OS-stored secrets if possible
                $provider = Get-SecretStorageProvider
                switch ($provider) {
                    'SecretManagement' {
                        try {
                            $vaultName = 'AnyAPI-SecretStore'
                            # Try to find all secrets for this profile
                            $secretPattern = "AnyAPI.$name.*"
                            $secrets = Get-SecretInfo -Vault $vaultName -ErrorAction SilentlyContinue | Where-Object Name -like $secretPattern
                            foreach ($secret in $secrets) {
                                Remove-Secret -Name $secret.Name -Vault $vaultName -Confirm:$false -ErrorAction SilentlyContinue
                                Write-Verbose "Removed secret: $($secret.Name)"
                            }
                            Write-Verbose "Attempted cleanup of SecretManagement entries for profile '$name'."
                        }
                        catch {
                            Write-Verbose "Failed to cleanup SecretManagement secrets for profile '$name': $($_.Exception.Message)"
                        }
                    }
                    'Keychain' {
                        foreach ($key in $script:SensitiveAuthDetailKeys) {
                            $serviceName = "AnyAPI.$name"
                            $accountName = $key
                            & security delete-generic-password -a $accountName -s $serviceName 2>$null
                            # Ignore errors - secret might not exist
                        }
                        Write-Verbose "Attempted cleanup of Keychain entries for profile '$name'."
                    }
                    'SecretService' {
                        foreach ($key in $script:SensitiveAuthDetailKeys) {
                            & secret-tool clear profile "$name" key "$key" 2>$null
                            # Ignore errors - secret might not exist
                        }
                        Write-Verbose "Attempted cleanup of Secret Service entries for profile '$name'."
                    }
                }

                Write-Host "Profile '$name' has been removed." -ForegroundColor Green
            }
        }
    }
}

function Export-AnyApiConfiguration {
    [CmdletBinding(SupportsShouldProcess = $true)]
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        
        [Parameter()]
        [string[]]$ProfileName,
        
        [Parameter()]
        [switch]$IncludeSecrets,
        
        [Parameter()]
        [switch]$Force
    )

    _EnsureProfilesLoaded

    if (-not $Force -and (Test-Path $Path)) {
        Write-Error "File already exists at '$Path'. Use -Force to overwrite." -Category ResourceExists
        return
    }

    # Determine which profiles to export
    $profilesToExport = if ($ProfileName) {
        $filtered = @{
        }
        foreach ($name in $ProfileName) {
            if ($script:AnyApiProfiles.ContainsKey($name)) {
                $filtered[$name] = $script:AnyApiProfiles[$name]
            }
            else {
                Write-Warning "Profile '$name' not found. Skipping."
            }
        }
        $filtered
    }
    else {
        $script:AnyApiProfiles
    }

    if ($profilesToExport.Count -eq 0) {
        Write-Warning "No profiles to export."
        return
    }

    # Prepare export data
    $exportData = @{}
    foreach ($kvp in $profilesToExport.GetEnumerator()) {
        $profile = $kvp.Value.Clone()
        
        # Handle authentication details based on IncludeSecrets flag
        if ($profile.AuthenticationDetails) {
            $authDetails = $profile.AuthenticationDetails.Clone()
            
            foreach ($key in $script:SensitiveAuthDetailKeys) {
                if ($authDetails.ContainsKey($key)) {
                    $currentValue = $authDetails[$key]
                    
                    if ($IncludeSecrets) {
                        if ($currentValue -is [System.Security.SecureString]) {
                            # Convert SecureString to plain text for export (DANGEROUS!)
                            $plainText = ConvertFrom-SecureString $currentValue -AsPlainText
                            if ($plainText -match '^EXTERNAL:.+?:.+?:.+$') {
                                # This is an external reference, try to resolve it
                                $resolvedValue = Get-SecureValue -Value $currentValue -ProfileName $kvp.Key
                                if ($resolvedValue -and $resolvedValue -is [System.Security.SecureString]) {
                                    $authDetails[$key] = ConvertFrom-SecureString $resolvedValue -AsPlainText
                                }
                                else {
                                    $authDetails[$key] = "<<FAILED_TO_RESOLVE_EXTERNAL_SECRET>>"
                                }
                            }
                            else {
                                # It's an in-memory SecureString
                                $authDetails[$key] = $plainText
                            }
                        }
                        # If it's already a string, leave it as-is
                    }
                    else {
                        # Scrub secrets for secure export
                        $authDetails[$key] = "<<SECRET_SCRUBBED_ON_EXPORT>>"
                    }
                }
            }
            
            # Handle AuthScriptBlock
            if ($authDetails.ContainsKey('AuthScriptBlock') -and $authDetails.AuthScriptBlock -is [ScriptBlock]) {
                $authDetails.AuthScriptBlock = $authDetails.AuthScriptBlock.ToString()
            }
            
            $profile.AuthenticationDetails = $authDetails
        }
        
        # Add export metadata
        $profile.ExportedAt = Get-Date
        $profile.ExportedFrom = $env:COMPUTERNAME
        $profile.ExportedByUser = $env:USERNAME
        $profile.SecretsIncluded = $IncludeSecrets.IsPresent
        
        $exportData[$kvp.Key] = $profile
    }

    $actionDescription = "Export $($profilesToExport.Count) profile(s) to '$Path'"
    if ($IncludeSecrets) {
        $actionDescription += " (INCLUDING SECRETS - USE WITH EXTREME CAUTION!)"
    }

    if ($PSCmdlet.ShouldProcess($actionDescription, "Export Configuration")) {
        try {
            $exportDir = Split-Path $Path -Parent
            if ($exportDir -and -not (Test-Path $exportDir)) {
                New-Item -Path $exportDir -ItemType Directory -Force | Out-Null
            }

            $json = ConvertTo-Json -InputObject $exportData -Depth 10
            Set-Content -Path $Path -Value $json -Force

            Write-Host "Successfully exported $($profilesToExport.Count) profile(s) to '$Path'" -ForegroundColor Green
            
            if ($IncludeSecrets) {
                Write-Warning "SECURITY WARNING: Exported file contains plain-text secrets! Secure this file appropriately."
            }
            else {
                Write-Host "Secrets were scrubbed from export. You'll need to re-enter them after import." -ForegroundColor Yellow
            }
        }
        catch {
            Write-Error "Failed to export configuration to '$Path': $($_.Exception.Message)"
        }
    }
}

function Import-AnyApiConfiguration {
    [CmdletBinding(SupportsShouldProcess = $true)]
    param(
        [Parameter(Mandatory)]
        [string]$Path,
        
        [Parameter()]
        [ValidateSet('Skip', 'Overwrite', 'Merge')]
        [string]$MergeStrategy = 'Skip',
        
        [Parameter()]
        [hashtable]$SecureValues = @{}, # ProfileName.KeyName = SecureString or plain text
        
        [Parameter()]
        [switch]$SessionOnly
    )

    if (-not (Test-Path $Path)) {
        Write-Error "Import file not found at '$Path'." -Category ObjectNotFound
        return
    }

    try {
        $jsonContent = Get-Content $Path -Raw
        $importData = $jsonContent | ConvertFrom-Json -AsHashtable
    }
    catch {
        Write-Error "Failed to read or parse import file '$Path': $($_.Exception.Message)"
        return
    }

    if (-not $importData -or $importData.Count -eq 0) {
        Write-Warning "No profiles found in import file."
        return
    }

    _EnsureProfilesLoaded

    $importedCount = 0
    $skippedCount = 0
    $errors = @()

    foreach ($profileName in $importData.Keys) {
        $importProfile = $importData[$profileName]
        $existingProfile = $script:AnyApiProfiles.ContainsKey($profileName)

        # Determine action based on merge strategy
        $shouldImport = $false
        $actionDescription = ""

        switch ($MergeStrategy) {
            'Skip' {
                if (-not $existingProfile) {
                    $shouldImport = $true
                    $actionDescription = "Import new profile '$profileName'"
                }
                else {
                    Write-Verbose "Skipping existing profile '$profileName' (MergeStrategy: Skip)"
                    $skippedCount++
                    continue
                }
            }
            'Overwrite' {
                $shouldImport = $true
                $actionDescription = if ($existingProfile) { "Overwrite existing profile '$profileName'" } else { "Import new profile '$profileName'" }
            }
            'Merge' {
                $shouldImport = $true
                $actionDescription = if ($existingProfile) { "Merge with existing profile '$profileName'" } else { "Import new profile '$profileName'" }
            }
        }

        if ($shouldImport -and $PSCmdlet.ShouldProcess($actionDescription, "Import Profile")) {
            try {
                # Prepare profile data for import
                $profileToImport = $importProfile.Clone()
                
                # Remove export metadata
                @('ExportedAt', 'ExportedFrom', 'ExportedByUser', 'SecretsIncluded') | ForEach-Object {
                    $profileToImport.Remove($_)
                }
                
                # Handle session-only override
                if ($SessionOnly) {
                    $profileToImport.IsSessionOnly = $true
                }
                
                # Merge with existing profile if strategy is 'Merge'
                if ($MergeStrategy -eq 'Merge' -and $existingProfile) {
                    $existing = $script:AnyApiProfiles[$profileName]
                    
                    # Merge non-auth fields, keeping existing values where import has nulls/empties
                    foreach ($key in @('BaseUrl', 'PaginationDetails', 'ErrorHandlingDetails', 'DefaultHeaders', 'CustomSettings')) {
                        if (-not $profileToImport.ContainsKey($key) -or -not $profileToImport[$key]) {
                            if ($existing.ContainsKey($key)) {
                                $profileToImport[$key] = $existing[$key]
                            }
                        }
                    }
                }
                
                # Validate required fields
                if (-not $profileToImport.BaseUrl) {
                    throw "Missing required BaseUrl"
                }
                if (-not $profileToImport.AuthenticationDetails -or -not $profileToImport.AuthenticationDetails.AuthType) {
                    throw "Missing required AuthenticationDetails.AuthType"
                }
                
                # Prepare SecureValues for this specific profile
                $profileSecureValues = @{}
                foreach ($kvp in $SecureValues.GetEnumerator()) {
                    if ($kvp.Key.StartsWith("$profileName.")) {
                        $keyName = $kvp.Key.Substring($profileName.Length + 1)
                        $profileSecureValues[$keyName] = $kvp.Value
                    }
                }
                
                # Use Initialize-AnyApiProfile to properly handle the import
                $initParams = @{
                    ProfileName            = $profileName
                    BaseUrl                = $profileToImport.BaseUrl
                    AuthenticationDetails  = $profileToImport.AuthenticationDetails
                    PaginationDetails      = $profileToImport.PaginationDetails ?? @{
                    }
                    ErrorHandlingDetails   = $profileToImport.ErrorHandlingDetails ?? @{
                    }
                    DefaultHeaders         = $profileToImport.DefaultHeaders ?? @{
                    }
                    CustomSettings         = $profileToImport.CustomSettings ?? @{
                    }
                    NoLocalFilePersistence = $profileToImport.IsSessionOnly ?? $false
                    Force                  = $true  # Override existing if MergeStrategy allows
                    SecureValues           = $profileSecureValues
                }
                
                Initialize-AnyApiProfile @initParams | Out-Null
                $importedCount++
                
                Write-Verbose "Successfully imported profile '$profileName'"
            }
            catch {
                $errorMsg = "Failed to import profile '$profileName': $($_.Exception.Message)"
                $errors += $errorMsg
                Write-Warning $errorMsg
            }
        }
    }

    # Summary
    Write-Host "Import complete:" -ForegroundColor Green
    Write-Host "  Imported: $importedCount profile(s)" -ForegroundColor Green
    Write-Host "  Skipped: $skippedCount profile(s)" -ForegroundColor Yellow
    
    if ($errors.Count -gt 0) {
        Write-Host "  Errors: $($errors.Count)" -ForegroundColor Red
        Write-Host "Run with -Verbose to see detailed error messages." -ForegroundColor Gray
    }
    
    # Remind about secrets if needed
    $secretsNeeded = @()
    foreach ($profileName in $script:AnyApiProfiles.Keys) {
        $profile = $script:AnyApiProfiles[$profileName]
        if ($profile.AuthenticationDetails) {
            foreach ($key in $script:SensitiveAuthDetailKeys) {
                if ($profile.AuthenticationDetails.ContainsKey($key)) {
                    $value = $profile.AuthenticationDetails[$key]
                    if ($value -is [string] -and ($value -eq "<<SECRET_SCRUBBED_ON_EXPORT>>" -or $value -eq "<<SECRET_NEEDS_RUNTIME_PROVISIONING>>")) {
                        $secretsNeeded += "$profileName.$key"
                    }
                }
            }
        }
    }
    
    if ($secretsNeeded.Count -gt 0) {
        Write-Host ""
        Write-Warning "The following secrets need to be provided:"
        $secretsNeeded | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        Write-Host "Use -SecureValues parameter or re-run Initialize-AnyApiProfile with the secrets." -ForegroundColor Gray
    }
}

#endregion

# Enhanced module initialization with SecretManagement
$provider = Get-SecretStorageProvider
Write-Host "AnyAPI Module v0.3.0 loaded - PowerShell 7+ with Enhanced Secret Storage" -ForegroundColor DarkGreen
Write-Host "Secret Storage Provider: $provider" -ForegroundColor DarkGray

# Suggest SecretStore setup if not using SecretManagement
if ($provider -ne 'SecretManagement') {
    Write-Host "💡 Tip: Run 'Initialize-SecretStore' for enhanced persistent secret storage" -ForegroundColor DarkYellow
}

Write-Host "Performance Features: Auth Header Caching, Environment Variable Caching, Pagination Type Caching, Parameter Builders" -ForegroundColor DarkGray