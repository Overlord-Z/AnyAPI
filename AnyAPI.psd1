@{
    # Script module or binary module file associated with this manifest
    RootModule = 'AnyAPI.psm1'
    
    # Version number of this module.
    ModuleVersion = '0.3.0'
    
    # Supported PSEditions
    CompatiblePSEditions = @('Core')
    
    # ID used to uniquely identify this module
    GUID = '9f8c5d64-3e47-4d89-b623-ca8f3b9d5a2e'
    
    # Author of this module
    Author = 'James Zaenglein'
    
    # Company or vendor of this module
    CompanyName = 'Medicus IT'
    
    # Copyright statement for this module
    Copyright = '(c) 2025 Medicus IT. All rights reserved.'
    
    # Description of the functionality provided by this module
    Description = 'A high-performance PowerShell module for interacting with REST APIs across Windows, macOS, and Linux. Features intelligent pagination, cross-platform secret storage, performance optimizations, and comprehensive authentication support including API keys, Bearer tokens, and custom scripts.'
    
    # Minimum version of the PowerShell engine required by this module
    PowerShellVersion = '7.2'
    
    # Functions to export from this module
    FunctionsToExport = @(
        'Initialize-AnyApiProfile',
        'Get-AnyApiProfile',
        'Remove-AnyApiProfile',
        'Invoke-AnyApiEndpoint',
        'Export-AnyApiConfiguration',
        'Import-AnyApiConfiguration',
        'Get-SecretStorageProvider',
        'Clear-AuthHeaderCache'
    )
    
    # Cmdlets to export from this module
    CmdletsToExport = @()
    
    # Variables to export from this module
    VariablesToExport = @()
    
    # Aliases to export from this module
    AliasesToExport = @()
    
    # List of all modules packaged with this module
    ModuleList = @()
    
    # List of all files packaged with this module
    FileList = @('AnyAPI.psm1', 'AnyAPI.psd1', 'README.md')
    
    # Private data to pass to the module specified in RootModule/ModuleToProcess
    PrivateData = @{
        PSData = @{
            # Tags applied to this module. These help with module discovery in online galleries.
            Tags = @('API', 'REST', 'RESTful', 'HTTP', 'WebAPI', 'Integration', 'MSP', 'Automation', 'CrossPlatform', 'Pagination', 'Authentication', 'Performance', 'Security', 'Secrets', 'OAuth', 'JWT', 'GitHub', 'Graph', 'PowerShell7')
            
            # A URL to the license for this module.
            LicenseUri = 'https://github.com/OneMIT/Medi-PowerShell/Functions/blob/main/LICENSE'
            
            # A URL to the main website for this project.
            ProjectUri = 'https://github.com/OneMIT/Medi-PowerShell/Functions/AnyAPI'
            
            # A URL to an icon representing this module.
            # IconUri = ''
            
            # ReleaseNotes of this module
            ReleaseNotes = @'
## Version 0.3.0
### Breaking Changes
- Now requires PowerShell 7.2 or higher
- Profiles stored in JSON format for cross-platform compatibility

### New Features
- Cross-platform support (Windows, macOS, Linux)
- Intelligent pagination with auto-detection (Link Header, Cursor, Page-based, Offset/Limit)
- Cross-platform secret storage (Windows DPAPI, macOS Keychain, Linux Secret Service)
- Performance optimizations with caching and memory-efficient streaming
- Path parameter substitution in endpoints
- Enhanced error handling with exponential backoff and retry logic
- Stream processing for large datasets with -Stream parameter
- Session-only profiles with -NoLocalFilePersistence

### Performance Improvements
- Authentication header caching
- Environment variable caching for base URLs
- Pagination type detection caching
- Optimized memory management for large datasets

### Helper Functions
- Get-SecretStorageProvider: Check current secret storage backend
- Clear-AuthHeaderCache: Clear cached authentication headers

This release brings enterprise-grade features while maintaining backward compatibility for existing profile configurations.
'@
            
            # Prerelease string of this module
            # Prerelease = ''
            
            # Flag to indicate whether the module requires explicit user acceptance for install/update/save
            RequireLicenseAcceptance = $false
            
            # External dependent modules of this module
            # ExternalModuleDependencies = @()
        }
    }
    
    # HelpInfo URI of this module
    # HelpInfoURI = ''
    
    # Default prefix for commands exported from this module. Override the default prefix using Import-Module -Prefix.
    # DefaultCommandPrefix = ''
}