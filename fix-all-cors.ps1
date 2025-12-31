# CORS Security Fix - Automated Script
# This script applies the CORS fix to all Edge Functions

$functionsDir = "supabase/functions"

# List of all functions to fix
$functions = @(
    "create-user",
    "create-admin",
    "delete-user",
    "send-retargeting-messages",
    "send-automated-message",
    "send-meeting-reminders",
    "daily-motivation-sender",
    "debug-insert-cards",
    "generate-health-assessment-card",
    "generate-diet-plan-card",
    "generate-action-plan-card",
    "generate-grocery-list",
    "send-card-to-client",
    "send-assessment",
    "check-achievements",
    "check-follow-ups",
    "process-workflow-automation",
    "trigger-workflow-stage",
    "manage-cron-jobs"
)

$addedCount = 0
$skippedCount = 0
$errorCount = 0

Write-Host "Starting CORS fix for $($functions.Count) Edge Functions..." -ForegroundColor Cyan

foreach ($func in $functions) {
    $file = "$functionsDir/$func/index.ts"
    
    if (-not (Test-Path $file)) {
        Write-Host "  [SKIP] $func - File not found" -ForegroundColor Yellow
        $skippedCount++
        continue
    }
    
    $content = Get-Content $file -Raw
    
    # Check if already fixed
    if ($content -match "getCorsHeaders") {
        Write-Host "  [SKIP] $func - Already fixed" -ForegroundColor Green
        $skippedCount++
        continue
    }
    
    # Check if has wildcard CORS
    if ($content -notmatch "'Access-Control-Allow-Origin':\s*'\*'") {
        Write-Host "  [SKIP] $func - No wildcard CORS found" -ForegroundColor Yellow
        $skippedCount++
        continue
    }
    
    try {
        # Pattern 1: Replace import section
        $content = $content -replace `
            '(?s)(import\s+{[^}]+}\s+from\s+[''"][^''"]+[''"];?\s*)+\s*\nconst\s+corsHeaders\s*=\s*{[^}]+};?', `
            "`$1`nimport { getCorsHeaders } from '../_shared/cors.ts';"
        
        # Pattern 2: Replace serve handler start  
        $content = $content -replace `
            'serve\(async\s+\(req\)\s*=>\s*{\s*(//[^\n]+\n)?\s*if\s*\(req\.method\s*===\s*[''"]OPTIONS', `
            "serve(async (req) => {`n  // Get CORS headers based on origin`n  const origin = req.headers.get('origin');`n  const corsHeaders = getCorsHeaders(origin);`n  `n  if (req.method === 'OPTIONS"
        
        Set-Content -Path $file -Value $content -NoNewline
        Write-Host "  [OK] $func - Fixed" -ForegroundColor Green
        $addedCount++
    }
    catch {
        Write-Host "  [ERROR] $func - $($_.Exception.Message)" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "  Fixed: $addedCount" -ForegroundColor Green
Write-Host "  Skipped: $skippedCount" -ForegroundColor Yellow  
Write-Host "  Errors: $errorCount" -ForegroundColor Red
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Update _shared/cors.ts with your production domains"
Write-Host "2. Deploy: supabase functions deploy"
Write-Host "3. Test from your domain"
